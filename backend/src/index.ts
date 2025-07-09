import app from "./app";
import "./api/prompt-handlers"
import "./api/execution-handlers"
import { config } from "./config";
import { executionService } from "./services/execution-service";

// Initialize execution service
const initializeServices = async () => {
    try {
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
