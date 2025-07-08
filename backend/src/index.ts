import app from "./app";
import "./api/prompt-handlers"
import "./api/execution-handlers"
import { config } from "./config";
import { executionService } from "./services/execution-service";

// Start server
const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
});

// Background worker for processing pending executions
const WORKER_INTERVAL = 5000; // 5 seconds
let workerInterval: NodeJS.Timeout;

const startBackgroundWorker = () => {
    console.log('🔄 Starting background execution worker...');

    workerInterval = setInterval(async () => {
        try {
            await executionService.processPendingExecutions();
        } catch (error) {
            console.error('Background worker error:', error);
        }
    }, WORKER_INTERVAL);
};

const stopBackgroundWorker = () => {
    if (workerInterval) {
        clearInterval(workerInterval);
        console.log('⏹️ Background worker stopped');
    }
};

// Start the background worker
startBackgroundWorker();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    stopBackgroundWorker();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    stopBackgroundWorker();
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});
