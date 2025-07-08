import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
} as const;

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
