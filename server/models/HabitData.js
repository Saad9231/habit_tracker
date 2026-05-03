// ============================================================
//  HabitData.js — Mongoose model for Habit Calculator data
//  Stores user's habit form data, custom habits, and currency
// ============================================================

const mongoose = require('mongoose');

const habitDataSchema = new mongoose.Schema({
    // Using a fixed key to keep it single-user (no auth)
    userId: {
        type: String,
        default: 'default',
        unique: true,
        index: true
    },

    // Selected currency code (PKR, USD, etc.)
    currency: {
        type: String,
        default: 'PKR'
    },

    // Form field values { "coffee-cost": "250", "coffee-time": "15", ... }
    formData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Custom habits added by user
    customHabits: [{
        id: String,
        label: String,
        icon: String,
        freq: String,         // 'day' | 'week' | 'month'
        multiplier: Number,
        costId: String,
        timeId: String
    }]

}, { timestamps: true });

module.exports = mongoose.model('HabitData', habitDataSchema);
