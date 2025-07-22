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
import { executionService } from "./services/execution-service";
import { migrationManager } from './database/index'

// Initialize database and services
const initializeServices = async () => {
    try {
        // Initialize and run database migrations first
        console.log('🔄 Initializing database migrations...');
        await migrationManager.initialize();
        await migrationManager.runMigrations();

        // Then initialize other services
        await executionService.initialize();
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

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    executionService.shutdown();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    executionService.shutdown();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
