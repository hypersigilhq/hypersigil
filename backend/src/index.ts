import app from "./app";
import "./api/prompt-handlers"
import { config } from "./config";

// Start server
const server = app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});