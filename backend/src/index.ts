import app from "./app";
import "./types/global-init"; // Initialize global Result functions
import "./api/handlers/prompt"
import "./api/handlers/execution"
import "./api/handlers/execution-bundle"
import "./api/handlers/test-data"
import "./api/handlers/comment"
import "./api/handlers/user"
import "./api/handlers/auth"
import "./api/handlers/api-key"
import "./api/handlers/settings"
import "./api/handlers/common"
import "./api/handlers/file"
import "./api/handlers/deployment"
import "./api/handlers/job"
import "./api/handlers/dashboard"
import { config } from "./config";
import { migrationManager } from './database/index'
import { executionWorker } from "./services/execution-worker";
import { initializeAllModels } from "./database/model-initializer";
import { startWorkerSystem, stopWorkerSystem } from "./workers";

// Initialize database and services
const initializeServices = async () => {
    try {
        // Initialize all model tables
        console.log('🔄 Initializing model tables...');
        await initializeAllModels()

        // Initialize and run database migrations first
        console.log('🔄 Initializing database migrations...');
        await migrationManager.initialize();
        await migrationManager.runMigrations();

        // Then initialize other services
        await executionWorker.initialize();
        console.log('✅ Services initialized successfully');

        await startWorkerSystem()
        console.log('✅ System job worker initialized');

    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
};

// Initialize services before starting server
const startServer = async () => {

    // Start server after services are initialized
    const server = app.listen(config.port, '127.0.0.1', 511, () => {
        console.log(`🚀 Server running on http://localhost:${config.port}`);
    });

    return server;
};

// Start the application
(async () => {
    await initializeServices();
    const server = await startServer();

    const shutdown = async () => {
        console.log('SIGINT received, shutting down gracefully');
        executionWorker.shutdown();
        await stopWorkerSystem();
        server.close(() => {
            console.log('Process terminated');
            process.exit(0);
        });
    }

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
})();
