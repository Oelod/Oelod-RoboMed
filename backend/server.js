const { httpServer, initializeStatutoryManifold } = require('./src/app');

// Statutory Registry Bootstrap
// High-Fidelity Handover: This manifold character-perfectly initializes the database
// before opening the institutional HTTP gateway on Port 5000.

const startRegistry = async () => {
    try {
        // Seal the 45-second high-latency handshake
        await initializeStatutoryManifold();
        
        const PORT = process.env.PORT || 5000;
        httpServer.listen(PORT, () => {
            console.log(`🚀 RoboMed backend running on http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/health`);
        });
    } catch (err) {
        console.error('❌ Institutional Initialization Ruptured:', err.message);
        process.exit(1);
    }
};

startRegistry();