import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { userModel, UserDocument } from '../models/user';

export class AuthService {
    private static readonly SECRET_KEY = process.env.AUTH_SECRET_KEY || 'default-secret-key-change-in-production';
    private static readonly TOKEN_MAX_AGE_DAYS = parseInt(process.env.TOKEN_MAX_AGE_DAYS || '30', 10);
    private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

    /**
     * Generate a self-signed authentication token
     */
    static generateToken(userId: string): string {
        const timestamp = Date.now().toString();
        const payload = `${userId}.${timestamp}`;
        const signature = crypto
            .createHmac('sha256', this.SECRET_KEY)
            .update(payload)
            .digest('hex');

        return `${payload}.${signature}`;
    }

    /**
     * Validate a self-signed authentication token
     */
    static validateToken(token: string): { userId: string; timestamp: number } | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;

            const [userId, timestampStr, signature] = parts;
            const payload = `${userId}.${timestampStr}`;

            if (!userId) {
                return null
            }

            // Verify signature
            const expectedSignature = crypto
                .createHmac('sha256', this.SECRET_KEY)
                .update(payload)
                .digest('hex');

            if (signature !== expectedSignature) return null;

            const timestamp = parseInt(timestampStr as string);
            if (isNaN(timestamp)) return null;

            // Check token age
            const maxAge = this.TOKEN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000; // Convert days to ms
            if (Date.now() - timestamp > maxAge) return null;

            return { userId, timestamp };
        } catch (error) {
            return null;
        }
    }

    /**
     * Hash password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.BCRYPT_ROUNDS);
    }

    /**
     * Verify password against hash
     */
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Authenticate user with email and password
     */
    static async authenticateUser(email: string, password: string): Promise<UserDocument | null> {
        try {
            const user = await userModel.findByEmail(email);
            if (!user || !user.id) {
                return null;
            }

            // Check if account is locked
            if (userModel.isAccountLocked(user)) {
                return null;
            }

            // Check if user is active
            if (user.status !== 'active') {
                return null;
            }

            // Verify password
            if (!user.auth?.password_hash) {
                return null;
            }

            const isValidPassword = await this.verifyPassword(password, user.auth.password_hash as string);

            // Record login attempt
            await userModel.recordLogin(user.id as string, isValidPassword);

            if (!isValidPassword) {
                return null;
            }

            return user;
        } catch (error) {
            console.error('Error authenticating user:', error);
            return null;
        }
    }

    /**
     * Check if any users exist in the system
     */
    static async hasAnyUsers(): Promise<boolean> {
        try {
            const count = await userModel.count({});
            return count > 0;
        } catch (error) {
            console.error('Error checking if users exist:', error);
            return true; // Fail safe - assume users exist to prevent unauthorized admin creation
        }
    }

    /**
     * Create the first admin user
     */
    static async createFirstAdmin(email: string, name: string, password: string): Promise<UserDocument | null> {
        try {
            // Double-check that no users exist
            const hasUsers = await this.hasAnyUsers();
            if (hasUsers) {
                throw new Error('Users already exist in the system');
            }

            // Check if user with this email already exists
            const existingUser = await userModel.findByEmail(email);
            if (existingUser) {
                throw new Error('A user with this email already exists');
            }

            // Hash password
            const passwordHash = await this.hashPassword(password);

            // Create admin user
            const userData: Omit<UserDocument, 'id' | 'created_at' | 'updated_at'> = {
                email,
                name,
                role: 'admin',
                status: 'active',
                auth: {
                    password_hash: passwordHash,
                    login_attempts: 0
                }
            };

            return userModel.create(userData);
        } catch (error) {
            console.error('Error creating first admin:', error);
            throw error;
        }
    }
}
