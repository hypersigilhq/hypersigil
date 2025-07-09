import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { EndpointMiddleware } from 'ts-typed-api';
import { config, isDevelopment } from './config';

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

export default app;
