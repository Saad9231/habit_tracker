// ============================================================
//  SupplyData.js — Mongoose model for Supply Tracker data
//  Stores supplies, bills, roommates, budget, notifications
// ============================================================

const mongoose = require('mongoose');

const supplyItemSchema = new mongoose.Schema({
    id: String,
    name: String,
    emoji: { type: String, default: '📦' },
    quantity: Number,
    unit: { type: String, default: 'kg' },
    price: Number,
    purchaseDate: String,
    paidById: mongoose.Schema.Types.Mixed,
    finishedDate: { type: String, default: null },
    dailyRatePerPerson: Number,
    predictedDays: Number,
    status: { type: String, default: 'active' },   // 'active' | 'finished'
    lastNotified: { type: Number, default: 0 },
    history: [{
        duration: Number,
        quantity: Number,
        price: Number,
        peopleCount: Number
    }]
}, { _id: false });

const billSchema = new mongoose.Schema({
    id: String,
    name: String,
    emoji: { type: String, default: '💸' },
    price: Number,
    date: String,
    paidById: mongoose.Schema.Types.Mixed
}, { _id: false });

const roommateSchema = new mongoose.Schema({
    id: mongoose.Schema.Types.Mixed,
    name: String
}, { _id: false });

const supplyDataSchema = new mongoose.Schema({
    // Fixed key for single-user mode
    userId: {
        type: String,
        default: 'default',
        unique: true,
        index: true
    },

    supplies: [supplyItemSchema],
    bills: [billSchema],

    roommates: {
        type: [roommateSchema],
        default: [{ id: 1, name: 'You' }]
    },

    notificationsEnabled: {
        type: Boolean,
        default: false
    },

    monthlyBudget: {
        type: Number,
        default: 50000
    }

}, { timestamps: true });

module.exports = mongoose.model('SupplyData', supplyDataSchema);
