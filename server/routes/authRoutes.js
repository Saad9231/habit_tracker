// ============================================================
//  authRoutes.js — Register and Login endpoints
// ============================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-habit-cost-key';

// ── POST /api/auth/register ─────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter all fields' });
        }

        // OFFLINE MODE FALLBACK
        if (mongoose.connection.readyState !== 1) {
            console.log('Register: DB offline, logging in via fallback');
            const payload = { user: { id: email, name: name } };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, user: payload.user });
        }

        // Check for existing user
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create new user instance
        user = new User({
            name,
            email,
            password
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT payload
        const payload = {
            user: { id: user.id, name: user.name }
        };

        // Sign token
        jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
        });

    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter all fields' });
        }

        // OFFLINE MODE FALLBACK
        if (mongoose.connection.readyState !== 1) {
            console.log('Login: DB offline, logging in via fallback');
            const payload = { user: { id: email, name: email.split('@')[0] } };
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
            return res.json({ success: true, token, user: payload.user });
        }

        // Check for user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Create JWT payload
        const payload = {
            user: { id: user.id, name: user.name }
        };

        // Sign token
        jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email } });
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
