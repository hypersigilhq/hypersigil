import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { EndpointMiddleware } from 'ts-typed-api';
import { config, isDevelopment } from './config';
import { AuthService } from './services/auth-service';
import { UserDocument, userModel } from './models/user';
import { apiKeyModel, Permission } from './models/api-key';

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
    origin: config.corsOrigin,
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (isDevelopment) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Custom middleware for ts-typed-api
export const loggingMiddleware: EndpointMiddleware = (req, res, next, endpointInfo) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - Endpoint: ${endpointInfo.domain}.${endpointInfo.routeKey}`);
    next();
};

export const timingMiddleware: EndpointMiddleware = (req, res, next, endpointInfo) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[TIMING] ${endpointInfo.domain}.${endpointInfo.routeKey} completed in ${duration}ms`);
    });

    next();
};

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string,
                role: UserDocument['role']
            }
        }
    }
}

// Authentication middleware for ts-typed-api
export const authMiddleware: EndpointMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header'
            });
            return;
        }

        const token = authHeader.substring(7);
        const tokenData = AuthService.validateToken(token);

        if (!tokenData) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
            return;
        }

        // Database validation
        const user = await userModel.findById(tokenData.userId);
        if (!user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found'
            });
            return;
        }

        if (user.status !== 'active') {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Account not active'
            });
            return;
        }

        if (userModel.isAccountLocked(user)) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Account locked due to failed login attempts'
            });
            return;
        }

        if (!user.id) {
            res.status(500).json({
                error: 'Unexpected',
                message: 'Unexpected error'
            });
            return
        }

        // Attach user to request
        req.user = {
            id: user.id,
            role: user.role

        }
        next();
    } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

// Authorization middleware factory
export const requireRole = (roles: string[]): EndpointMiddleware => {
    return (req, res, next) => {
        const user = (req as any).user;
        if (!user) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
            return;
        }

        if (!roles.includes(user.role)) {
            res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
};

// API Key authentication middleware
export const apiKeyMiddleware = (requiredScope: Permission): EndpointMiddleware => {
    return async (req, res, next) => {
        try {
            const apiKeyHeader = req.headers['x-api-key'] as string;
            if (!apiKeyHeader) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Missing API key'
                });
                return;
            }

            // Find and validate API key
            const apiKey = await apiKeyModel.findByApiKey(apiKeyHeader);
            if (!apiKey) {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid API key'
                });
                return;
            }

            // Check if API key is active
            if (apiKey.status !== 'active') {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'API key is revoked'
                });
                return;
            }

            // Check if API key has required scope
            if (!apiKeyModel.hasScope(apiKey, requiredScope)) {
                res.status(403).json({
                    error: 'Forbidden',
                    message: `API key does not have required scope: ${requiredScope}`
                });
                return;
            }

            // Get the user associated with the API key
            const user = await userModel.findById(apiKey.user_id);
            if (!user || user.status !== 'active') {
                res.status(401).json({
                    error: 'Unauthorized',
                    message: 'API key owner account is not active'
                });
                return;
            }

            // Record API key usage
            const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
            await apiKeyModel.recordUsage(apiKey.id!, clientIp);

            // Attach user to request (similar to regular auth)
            req.user = {
                id: user.id!,
                role: user.role
            };

            next();
        } catch (error) {
            console.error('API key middleware error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'API key authentication failed'
            });
        }
    };
};

// Convenience middleware
export const requireAdmin: EndpointMiddleware = requireRole(['admin']);
export const requireUser: EndpointMiddleware = requireRole(['admin', 'user']);
export const requireAuth: EndpointMiddleware = requireRole(['admin', 'user', 'viewer']);

// API key middleware for specific scopes
export const requireExecutionScope: EndpointMiddleware = apiKeyMiddleware('executions:run');

export default app;
