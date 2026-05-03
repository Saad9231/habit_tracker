// ============================================================
//  habitRoutes.js — REST API for Habit Calculator data
//  GET  /api/habits     → fetch saved data
//  PUT  /api/habits     → save/update data
//  DELETE /api/habits   → clear all habit data
// ============================================================

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const HabitData = require('../models/HabitData');
const auth = require('../middleware/auth');

// ── GET — Fetch habit data ──────────────────────────────────
router.get('/', auth, async (req, res) => {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'DB Offline' });
    try {
        const data = await HabitData.findOne({ userId: req.user.id });
        if (!data) {
            return res.json({ success: true, data: null });
        }
        res.json({ success: true, data });
    } catch (err) {
        console.error('GET /api/habits error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── PUT — Save/update habit data ────────────────────────────
router.put('/', auth, async (req, res) => {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'DB Offline' });
    try {
        const { currency, formData, customHabits } = req.body;

        const data = await HabitData.findOneAndUpdate(
            { userId: req.user.id },
            {
                currency: currency || 'PKR',
                formData: formData || {},
                customHabits: customHabits || []
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({ success: true, data });
    } catch (err) {
        console.error('PUT /api/habits error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DELETE — Clear all habit data ───────────────────────────
router.delete('/', auth, async (req, res) => {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'DB Offline' });
    try {
        await HabitData.deleteOne({ userId: req.user.id });
        res.json({ success: true, message: 'Habit data cleared' });
    } catch (err) {
        console.error('DELETE /api/habits error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
