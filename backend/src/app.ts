import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { EndpointMiddleware, ApiDefinitionSchema, EndpointInfo } from 'ts-typed-api';
import { config, isDevelopment } from './config';
import { AuthService } from './services/auth-service';
import { UserDocument, userModel } from './models/user';
import { apiKeyModel, Permission } from './models/api-key';
import { ExecutionApiDefinition } from './api/definitions/execution';

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

app.use((req, res, next) => {
    req.isApiCall = () => !!req.apiKey
    next()
})

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
            },
            apiKey?: {
                id: string,
            },
            isApiCall(): boolean
        }
    }
}

// Authentication middleware for ts-typed-api
export const authMiddleware: EndpointMiddleware = async (req, res, next) => {
    try {

        if (req.user && req.user.id) {
            next()
            return
        }

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

// API Key authentication middleware
export const apiKeyMiddleware = <T extends ApiDefinitionSchema>(fn: (scopes: Permission[], ei: EndpointInfo<T>) => boolean): EndpointMiddleware<T> => {
    return async (req, res, next, endpointInfo) => {
        try {
            const apiKeyHeader = req.headers['x-api-key'] as string;

            if (!apiKeyHeader) {
                next()
                return
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

            if (!fn(apiKey.permissions.scopes, endpointInfo)) {
                console.error('Access denied', { scopes: apiKey.permissions.scopes, endpointInfo })
                res.status(403).json({
                    error: 'Forbidden',
                    message: `API key does not have required scope`
                });
                return
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

            req.apiKey = {
                id: apiKey.id!
            }

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

export default app;
