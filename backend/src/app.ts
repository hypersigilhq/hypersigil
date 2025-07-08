import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { RegisterHandlers, EndpointMiddleware } from 'ts-typed-api';
import { config, isDevelopment } from './config';
import { HealthApiDefinition, ExampleApiDefinition } from './api/definitions';
import { PromptApiDefinition } from '@prompt-bench/shared';

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

// Register API handlers with ts-typed-api
RegisterHandlers(app, HealthApiDefinition, {
    health: {
        ping: async (req, res) => {
            const healthData = {
                status: 'ok' as const,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: config.nodeEnv,
            };

            res.respond(200, healthData);
        },
        status: async (req, res) => {
            const statusData = {
                server: 'running',
                timestamp: new Date().toISOString(),
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                pid: process.pid,
                platform: process.platform,
                nodeVersion: process.version,
            };

            res.respond(200, statusData);
        },
    },
}, [loggingMiddleware, timingMiddleware]);

RegisterHandlers(app, ExampleApiDefinition, {
    examples: {
        hello: async (req, res) => {
            const name = req.query.name || 'World';
            const response = {
                message: `Hello, ${name}!`,
                timestamp: new Date().toISOString(),
            };

            res.respond(200, response);
        },
        echo: async (req, res) => {
            const { message, metadata } = req.body;

            if (!message) {
                return res.respond(400, {
                    error: 'Missing message',
                    message: 'The message field is required',
                });
            }

            const response = {
                echo: message,
                receivedAt: new Date().toISOString(),
                ...(metadata && { metadata }),
            };

            res.respond(200, response);
        },
    },
}, [loggingMiddleware, timingMiddleware]);


export default app;
