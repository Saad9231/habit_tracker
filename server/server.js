// ============================================================
//  server.js — Express + Mongoose Entry Point
//  Serves static files + REST API for MongoDB CRUD
// ============================================================

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const habitRoutes = require('./routes/habitRoutes');
const supplyRoutes = require('./routes/supplyRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Serve Static Files (index.html, supply.html, src/, etc.) ─
app.use(express.static(path.join(__dirname, '..')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/supplies', supplyRoutes);

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// ── MongoDB Connection ──────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/habit-cost-handler';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected successfully');
        console.log(`   Database: ${mongoose.connection.name}`);
        if (process.env.NODE_ENV !== 'production') {
            startServer();
        }
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.error('\n⚠️ NETWORK FIREWALL DETECTED:');
        console.error("   Your current network is blocking connections to MongoDB Atlas (Port 27017).");
        console.error("   Starting server in OFFLINE MODE. The app will use your browser's local storage instead.\\n");
        if (process.env.NODE_ENV !== 'production') {
            startServer();
        }
    });

function startServer() {
    app.listen(PORT, () => {
        console.log(`\n🚀 Server running at http://localhost:${PORT}`);
        console.log(`   Habit Calculator: http://localhost:${PORT}/index.html`);
        console.log(`   Supply Tracker:   http://localhost:${PORT}/supply.html`);
        console.log(`   API Health:       http://localhost:${PORT}/api/health\n`);
    });
}

// ── Graceful shutdown ───────────────────────────────────────
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB disconnected. Server stopped.');
    process.exit(0);
});

// Export the app for Vercel Serverless execution
module.exports = app;
