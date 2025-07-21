import { Model } from '../database/base-model';
import { BaseDocument } from '../database/types';
import { randomBytes, createHash } from 'crypto';

export interface UserDocument extends BaseDocument {
    email: string;
    name: string;
    role: 'admin' | 'user' | 'viewer';
    status: 'active' | 'inactive' | 'pending';
    profile?: {
        timezone?: string;
    };
    auth?: {
        password_hash?: string;
        last_login?: Date;
        login_attempts?: number;
        locked_until?: Date;
    };
    invitation?: {
        token?: string;
        expires_at?: Date;
        invited_by?: string;
        invited_at?: Date;
    };
}

export class UserModel extends Model<UserDocument> {
    protected tableName = 'users';

    /**
     * Find user by email address
     */
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.findOne({ email });
    }

    /**
     * Find users by role
     */
    async findByRole(role: UserDocument['role']): Promise<UserDocument[]> {
        return this.findMany({ where: { role } });
    }

    /**
     * Find users by status
     */
    async findByStatus(status: UserDocument['status']): Promise<UserDocument[]> {
        return this.findMany({ where: { status } });
    }

    /**
     * Create a user invitation
     */
    async createInvitation(
        userData: Pick<UserDocument, 'email' | 'name' | 'role'> & { profile?: UserDocument['profile'] },
        invitedBy: string
    ): Promise<UserDocument> {
        const invitationToken = this.generateInvitationToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const createData: Omit<UserDocument, 'id' | 'created_at' | 'updated_at'> = {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            status: 'pending',
            invitation: {
                token: invitationToken,
                expires_at: expiresAt,
                invited_by: invitedBy,
                invited_at: new Date()
            }
        };

        if (userData.profile) {
            createData.profile = userData.profile;
        }

        return this.create(createData);
    }

    /**
     * Find user by invitation token
     */
    async findByInvitationToken(token: string): Promise<UserDocument | null> {
        const user = await this.findOne({ 'invitation.token': token });

        // Check if invitation is still valid
        if (user && user.invitation?.expires_at && user.invitation.expires_at < new Date()) {
            return null; // Invitation expired
        }

        return user;
    }

    /**
     * Activate user account (complete invitation)
     */
    async activateUser(invitationToken: string, authData?: UserDocument['auth']): Promise<UserDocument | null> {
        const user = await this.findByInvitationToken(invitationToken);
        if (!user) {
            return null;
        }

        const updateData: Partial<Omit<UserDocument, 'id' | 'created_at'>> = {
            status: 'active'
        };

        if (authData) {
            updateData.auth = authData;
        }

        // Use updateJsonProperties to remove invitation field
        const updatedUser = await this.update(user.id!, updateData);
        if (updatedUser) {
            await this.updateJsonProperties(user.id!, { invitation: null });
            return this.findById(user.id!);
        }

        return null;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId: string, profileData: Partial<UserDocument['profile']>): Promise<UserDocument | null> {
        const user = await this.findById(userId);
        if (!user) {
            return null;
        }

        const updatedProfile = {
            ...user.profile,
            ...profileData
        };

        return this.update(userId, { profile: updatedProfile });
    }

    /**
     * Update user status
     */
    async updateStatus(userId: string, status: UserDocument['status']): Promise<UserDocument | null> {
        return this.update(userId, { status });
    }

    /**
     * Update user role
     */
    async updateRole(userId: string, role: UserDocument['role']): Promise<UserDocument | null> {
        return this.update(userId, { role });
    }

    /**
     * Record login attempt
     */
    async recordLogin(userId: string, successful: boolean = true): Promise<UserDocument | null> {
        const user = await this.findById(userId);
        if (!user) {
            return null;
        }

        const currentAuth = user.auth || {};
        const loginAttempts = successful ? 0 : (currentAuth.login_attempts || 0) + 1;

        const authUpdate: UserDocument['auth'] = {};

        if (currentAuth.password_hash) {
            authUpdate.password_hash = currentAuth.password_hash;
        }

        if (successful) {
            authUpdate.last_login = new Date();
        } else if (currentAuth.last_login) {
            authUpdate.last_login = currentAuth.last_login;
        }

        authUpdate.login_attempts = loginAttempts;

        if (currentAuth.locked_until) {
            authUpdate.locked_until = currentAuth.locked_until;
        }

        // Lock account after 5 failed attempts for 30 minutes
        if (!successful && loginAttempts >= 5) {
            authUpdate.locked_until = new Date(Date.now() + 30 * 60 * 1000);
        }

        return this.update(userId, { auth: authUpdate });
    }

    /**
     * Check if user account is locked
     */
    isAccountLocked(user: UserDocument): boolean {
        if (!user.auth?.locked_until) {
            return false;
        }
        return user.auth.locked_until > new Date();
    }

    /**
     * Get active users count
     */
    async getActiveUsersCount(): Promise<number> {
        return this.count({ status: 'active' });
    }

    /**
     * Get pending invitations count
     */
    async getPendingInvitationsCount(): Promise<number> {
        return this.count({ status: 'pending' });
    }

    /**
     * Clean up expired invitations
     */
    async cleanupExpiredInvitations(): Promise<number> {
        const expiredUsers = await this.findMany({
            where: { status: 'pending' }
        });

        let deletedCount = 0;
        for (const user of expiredUsers) {
            if (user.invitation?.expires_at && user.invitation.expires_at < new Date()) {
                await this.delete(user.id!);
                deletedCount++;
            }
        }

        return deletedCount;
    }

    /**
     * Generate secure invitation token
     */
    private generateInvitationToken(): string {
        return randomBytes(32).toString('hex');
    }

    /**
     * Hash password (utility method for future auth implementation)
     */
    static hashPassword(password: string): string {
        return createHash('sha256').update(password).digest('hex');
    }
}

// Export singleton instance
export const userModel = new UserModel();
