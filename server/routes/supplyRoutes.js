// ============================================================
//  supplyRoutes.js — REST API for Supply Tracker data
//  Full CRUD for supplies, bills, roommates
// ============================================================

const express = require('express');
const router = express.Router();
const SupplyData = require('../models/SupplyData');
const auth = require('../middleware/auth');

// ── Helper — get or create document ─────────────────────────
async function getOrCreate(userId) {
    let doc = await SupplyData.findOne({ userId });
    if (!doc) {
        doc = await SupplyData.create({ userId });
    }
    return doc;
}

// ── GET — Fetch all supply data ─────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const data = await getOrCreate(req.user.id);
        res.json({ success: true, data });
    } catch (err) {
        console.error('GET /api/supplies error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── PUT — Full save (replace entire document) ───────────────
// Frontend sends the complete state on every save
router.put('/', auth, async (req, res) => {
    try {
        const { supplies, bills, roommates, notificationsEnabled, monthlyBudget } = req.body;

        const data = await SupplyData.findOneAndUpdate(
            { userId: req.user.id },
            {
                supplies: supplies || [],
                bills: bills || [],
                roommates: roommates || [{ id: 1, name: 'You' }],
                notificationsEnabled: notificationsEnabled || false,
                monthlyBudget: monthlyBudget || 50000
            },
            { upsert: true, new: true, runValidators: true }
        );

        res.json({ success: true, data });
    } catch (err) {
        console.error('PUT /api/supplies error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST — Add a single supply ──────────────────────────────
router.post('/add', auth, async (req, res) => {
    try {
        const doc = await getOrCreate(req.user.id);
        doc.supplies.push(req.body);
        await doc.save();
        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('POST /api/supplies/add error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DELETE — Remove a supply by its custom id ───────────────
router.delete('/supply/:id', auth, async (req, res) => {
    try {
        const doc = await getOrCreate(req.user.id);
        doc.supplies = doc.supplies.filter(s => s.id !== req.params.id);
        await doc.save();
        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('DELETE /api/supplies/supply error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST — Add a bill ───────────────────────────────────────
router.post('/bills/add', auth, async (req, res) => {
    try {
        const doc = await getOrCreate(req.user.id);
        doc.bills.push(req.body);
        await doc.save();
        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('POST /api/supplies/bills/add error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DELETE — Remove a bill ──────────────────────────────────
router.delete('/bills/:id', auth, async (req, res) => {
    try {
        const doc = await getOrCreate(req.user.id);
        doc.bills = doc.bills.filter(b => b.id !== req.params.id);
        await doc.save();
        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('DELETE /api/supplies/bills error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── PUT — Update roommates ──────────────────────────────────
router.put('/roommates', auth, async (req, res) => {
    try {
        const doc = await getOrCreate(req.user.id);
        doc.roommates = req.body.roommates || [{ id: 1, name: 'You' }];
        await doc.save();
        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('PUT /api/supplies/roommates error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── PUT — Update budget ─────────────────────────────────────
router.put('/budget', auth, async (req, res) => {
    try {
        const doc = await getOrCreate(req.user.id);
        doc.monthlyBudget = req.body.monthlyBudget || 50000;
        await doc.save();
        res.json({ success: true, data: doc });
    } catch (err) {
        console.error('PUT /api/supplies/budget error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── DELETE — Clear everything ───────────────────────────────
router.delete('/', auth, async (req, res) => {
    try {
        await SupplyData.deleteOne({ userId: req.user.id });
        res.json({ success: true, message: 'Supply data cleared' });
    } catch (err) {
        console.error('DELETE /api/supplies error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
