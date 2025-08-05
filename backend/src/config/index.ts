import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: '/api/v1',
    encryptionKey: process.env.ENCRYPTION_KEY || 'hZBREfHveS5WoaXE6CxzPlrGgoBqp2uWabt8XXNZPfU=',
    webhookSignatureKey: process.env.WEBHOOK_SIGNATURE_KEY || "CxrGaXXNZPfUgbXzPlE6t8oBqp2uW"
} as const;

export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
