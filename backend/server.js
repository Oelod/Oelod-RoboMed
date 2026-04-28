const { httpServer, initializeStatutoryManifold } = require('./src/app');
const mongoose = require('mongoose');

// --- Process Lifecycle Management: Fatal Exception Shield ---
process.on('uncaughtException', (err) => {
    console.error('❌ UNCAUGHT EXCEPTION DETECTED: Shutting down aggressively to prevent zombie state...', err.name, err.message);
    process.exit(1);
});

// Statutory Registry Bootstrap
// High-Fidelity Handover: This manifold character-perfectly initializes the database
// before opening the institutional HTTP gateway on Port 5000.
const startRegistry = async () => {
    try {
        // Seal the 45-second high-latency handshake
        await initializeStatutoryManifold();
        
        const PORT = process.env.PORT || 5000;
        const server = httpServer.listen(PORT, () => {
            console.log(`🚀 RoboMed backend running on http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
        });

        // --- Process Lifecycle Management: Unhandled Promise Shield ---
        process.on('unhandledRejection', (err) => {
            console.error('❌ UNHANDLED PROMISE REJECTION: Triggering Graceful Shutdown...', err.name, err.message);
            server.close(() => {
                process.exit(1);
            });
        });

        // --- Process Lifecycle Management: Graceful Shutdown Sequence ---
        const gracefulShutdown = () => {
            console.log('⚠️ Process Termination Signal (SIGTERM/SIGINT) Received.');
            console.log('⚠️ Initiating Graceful Shutdown Sequence...');
            
            // Stop accepting new HTTP requests and finish processing ongoing ones
            server.close(async () => {
                console.log('✅ Institutional HTTP Gateway safely closed.');
                try {
                    // Safely sever the database pipeline to prevent data corruption
                    await mongoose.connection.close();
                    console.log('✅ MongoDB connection securely terminated.');
                    process.exit(0);
                } catch (err) {
                    console.error('❌ Error during MongoDB termination sequence:', err);
                    process.exit(1);
                }
            });
        };

        // Attach listeners for Docker/Kubernetes/AWS scaling signals
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (err) {
        console.error('❌ Institutional Initialization Ruptured:', err.message);
        process.exit(1);
    }
};

startRegistry();

