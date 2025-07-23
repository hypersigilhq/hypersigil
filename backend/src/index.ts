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
import { config } from "./config";
import { migrationManager } from './database/index'
import { executionWorker } from "./services/execution-worker";

// Initialize database and services
const initializeServices = async () => {
    try {
        // Initialize and run database migrations first
        console.log('🔄 Initializing database migrations...');
        await migrationManager.initialize();
        await migrationManager.runMigrations();

        // Then initialize other services
        await executionWorker.initialize();
        console.log('✅ Services initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize services:', error);
        process.exit(1);
    }
};

// Start server
const server = app.listen(config.port, async () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);

    // Initialize services after server starts
    await initializeServices();
});

const shutdown = () => {
    console.log('SIGINT received, shutting down gracefully');
    executionWorker.shutdown();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
}

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
