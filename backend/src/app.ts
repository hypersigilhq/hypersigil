import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { EndpointMiddleware, ApiDefinitionSchema, EndpointInfo, generateOpenApiSpec2 } from 'ts-typed-api';
import { isDevelopment } from './config';
import { AuthService } from './services/auth-service';
import { UserDocument, userModel } from './models/user';
import { apiKeyModel, Permission } from './models/api-key';
import { ExecutionApiDefinition } from './api/definitions/execution';
import { PromptApiDefinition } from './api/definitions/prompt';
import { FileApiDefinition } from './api/definitions/file';
import { DeploymentApiDefinition } from './api/definitions/deployment';
import { DashboardApiDefinition } from './api/definitions/dashboard';

// Global error handlers
process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    // Graceful shutdown
    process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Graceful shutdown
    process.exit(1);
});

const app = express();

// Basic middleware
app.use(helmet());
app.use(cookieParser());
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

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;

    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }

    return result;
}


// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0'
    });
});

app.get('/api/json-schema', (req, res) => {
    const spec = generateOpenApiSpec2([
        {
            prefix: ExecutionApiDefinition.prefix, endpoints: { executions: pick(ExecutionApiDefinition.endpoints.executions, ['getById', 'create']) }
        },
        {
            prefix: PromptApiDefinition.prefix, endpoints: { prompts: pick(PromptApiDefinition.endpoints.prompts, ['preview', 'getById']) }
        },
        {
            prefix: FileApiDefinition.prefix, endpoints: { files: pick(FileApiDefinition.endpoints.files, ['create']) }
        },
        {
            prefix: DeploymentApiDefinition.prefix, endpoints: { deployments: pick(DeploymentApiDefinition.endpoints.deployments, ['run']) }
        }
    ], {
        info: {
            description: "Hypesigil API",
            title: "Hypesigil API",
            version: "0.1"
        },
        servers: [],
        anonymousTypes: true
    })
    res.json(spec)
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

        let token = req.headers.authorization || req.cookies['auth-token'];
        if (req.headers.authorization && !token?.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header/cookie'
            });
            return;
        } else if (req.headers.authorization) {
            token = token.substring(7);
        } else {
            token = req.cookies['auth-token']
        }

        if (!token) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header/cookie'
            });
            return;
        }

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

// Express error handling middleware (must be last)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Express error handler caught:', err);
    console.error('Stack:', err.stack);
    console.error('Request:', {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body
    });

    // Don't expose internal errors in production
    const isDev = isDevelopment;

    if (res.headersSent) {
        // If response headers were already sent, delegate to default Express error handler
        return next(err);
    }

    res.status(500).json({
        error: 'Internal Server Error',
        message: isDev ? err.message : 'Something went wrong',
        ...(isDev && { stack: err.stack })
    });
});

export default app;
