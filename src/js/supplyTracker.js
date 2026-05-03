// ============================================================
//  supplyTracker.js — Core logic for hostel supply tracking
//  CRUD, prediction algorithm, localStorage, notifications
//  Zero DOM touches — pure data logic.
// ============================================================

const STORAGE_KEY = 'hostel-supply-data';

import { loadSupplyData, saveSupplyData } from './api.js';

// ── Smart Usage Map ──────────────────────────────────────────
// Instead of asking "how many kg/day" (impossible to know),
// we ask practical questions like "kitni rotian khate ho?"
// and auto-calculate the kg/day consumption.

/**
 * SMART_USAGE_MAP — practical question → kg conversion
 * @property {string} question    - what to ask the user
 * @property {string} inputLabel  - label for the input field
 * @property {number} gramsPerUnit - grams consumed per 1 unit of answer
 * @property {number} defaultAnswer - pre-filled typical value
 * @property {string} unit        - what the item is measured in (kg, litre, etc.)
 * @property {string} explanation - shown below input explaining the math
 */
export const SMART_USAGE_MAP = {
    'flour': {
        question: 'How many rotis per day?',
        inputLabel: 'Rotis / day',
        gramsPerUnit: 100,   // 1 roti ≈ 100g flour
        defaultAnswer: 4,
        unit: 'kg',
        explanation: '1 roti ≈ 100g flour',
    },
    'rice': {
        question: 'How many times rice per week?',
        inputLabel: 'Times / week',
        gramsPerUnit: 150,   // 1 serving ≈ 150g raw rice
        defaultAnswer: 4,
        perWeek: true,       // answer is per week, not per day
        unit: 'kg',
        explanation: '1 serving ≈ 150g raw rice',
    },
    'oil': {
        question: 'How many meals cooked per day?',
        inputLabel: 'Meals / day',
        gramsPerUnit: 30,    // ~30ml oil per cooked meal
        defaultAnswer: 2,
        unit: 'litre',
        explanation: '~30ml oil per meal',
        mlBased: true,       // convert ml not grams
    },
    'lentils': {
        question: 'How many times daal per week?',
        inputLabel: 'Times / week',
        gramsPerUnit: 200,   // 1 serving ≈ 200g raw daal
        defaultAnswer: 5,
        perWeek: true,
        unit: 'kg',
        explanation: '1 serving ≈ 200g raw daal',
    },
    'onions': {
        question: 'How many onions per day?',
        inputLabel: 'Onions / day',
        gramsPerUnit: 100,   // 1 medium onion ≈ 100g
        defaultAnswer: 2,
        unit: 'kg',
        explanation: '1 medium onion ≈ 100g',
    },
    'potatoes': {
        question: 'How many times aloo per week?',
        inputLabel: 'Times / week',
        gramsPerUnit: 300,   // 1 cooking ≈ 300g potatoes
        defaultAnswer: 3,
        perWeek: true,
        unit: 'kg',
        explanation: '1 serving ≈ 300g potatoes',
    },
    'tea': {
        question: 'How many cups of chai per day?',
        inputLabel: 'Cups / day',
        gramsPerUnit: 5,     // ~5g tea per cup
        defaultAnswer: 3,
        unit: 'pack',
        explanation: '~5g tea leaves per cup',
        packSize: 250,       // typical pack is 250g
    },
    'milk': {
        question: 'How many glasses of milk/chai per day?',
        inputLabel: 'Glasses / day',
        gramsPerUnit: 250,   // 1 glass ≈ 250ml
        defaultAnswer: 3,
        unit: 'litre',
        explanation: '1 glass ≈ 250ml',
        mlBased: true,
    },
    'sugar': {
        question: 'How many spoons of sugar per day?',
        inputLabel: 'Spoons / day',
        gramsPerUnit: 8,     // 1 spoon ≈ 8g sugar
        defaultAnswer: 6,
        unit: 'kg',
        explanation: '1 spoon ≈ 8g',
    },
    'spices': {
        question: 'How many meals cooked per day?',
        inputLabel: 'Meals / day',
        gramsPerUnit: 10,    // ~10g mixed spices per meal
        defaultAnswer: 2,
        unit: 'pack',
        explanation: '~10g spices per meal',
        packSize: 100,
    },
};

/**
 * Convert a smart usage answer to daily rate in the item's base unit (kg/litre)
 * @param {string} itemKey - key in SMART_USAGE_MAP
 * @param {number} answer  - user's answer to the practical question
 * @returns {number} daily consumption rate per person in kg or litres
 */
export function calculateDailyRate(itemKey, answer) {
    const config = SMART_USAGE_MAP[itemKey];
    if (!config) return 0.1; // fallback

    let dailyGrams = answer * config.gramsPerUnit;

    // If the answer was per week, convert to daily
    if (config.perWeek) {
        dailyGrams = dailyGrams / 7;
    }

    // Convert to kg or litres
    if (config.mlBased) {
        return dailyGrams / 1000; // ml → litres
    }
    if (config.packSize) {
        return dailyGrams / config.packSize; // grams → packs
    }
    return dailyGrams / 1000; // grams → kg
}

// ── Legacy fallback rates (per person per day in base unit) ──
export const DEFAULT_RATES = {
    'flour': 0.4,
    'rice': 0.09,
    'oil': 0.06,
    'lentils': 0.14,
    'onions': 0.2,
    'potatoes': 0.13,
    'tea': 0.06,
    'milk': 0.75,
    'sugar': 0.05,
    'spices': 0.2,
};

// ── Data Store ───────────────────────────────────────────────

let supplies = [];
let bills = [];
let roommates = [{id: 1, name: 'You'}];
let monthlyBudget = 50000;
let notificationsEnabled = false;

/**
 * Load all data from localStorage
 * @returns {Object} { supplies, bills, roommates, notificationsEnabled, monthlyBudget }
 */
export function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return { supplies: [], bills: [], roommates: [{id: 1, name: 'You'}], notificationsEnabled: false, monthlyBudget: 50000 };

        const data = JSON.parse(saved);
        supplies = data.supplies || [];
        bills = data.bills || [];
        // Legacy migration: if peopleCount was saved but no roommates
        if (data.peopleCount && (!data.roommates || data.roommates.length === 0)) {
            roommates = [];
            for (let i = 0; i < data.peopleCount; i++) {
                roommates.push({ id: Date.now() + i, name: i === 0 ? 'You' : `Roommate ${i+1}` });
            }
        } else {
            roommates = data.roommates || [{id: 1, name: 'You'}];
        }
        notificationsEnabled = data.notificationsEnabled || false;
        monthlyBudget = data.monthlyBudget || 50000;

        return { supplies, bills, roommates, notificationsEnabled, monthlyBudget };
    } catch (e) {
        console.error('Failed to load supply data', e);
        return { supplies: [], bills: [], roommates: [{id: 1, name: 'You'}], notificationsEnabled: false, monthlyBudget: 50000 };
    }
}

/**
 * Load data from MongoDB first, fall back to localStorage
 */
export async function loadDataFromMongoDB() {
    try {
        const mongoData = await loadSupplyData();
        if (mongoData) {
            console.log('\ud83d\udce6 Loaded supply data from MongoDB');
            supplies = mongoData.supplies || [];
            bills = mongoData.bills || [];
            roommates = mongoData.roommates || [{id: 1, name: 'You'}];
            notificationsEnabled = mongoData.notificationsEnabled || false;
            monthlyBudget = mongoData.monthlyBudget || 50000;
            // Update localStorage cache
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ supplies, bills, roommates, notificationsEnabled, monthlyBudget }));
            return { supplies, bills, roommates, notificationsEnabled, monthlyBudget };
        }
    } catch (e) {
        console.warn('MongoDB load failed, using localStorage', e);
    }
    return null;
}

/**
 * Save all data to localStorage + MongoDB
 */
export function saveData() {
    const data = { supplies, bills, roommates, notificationsEnabled, monthlyBudget };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Also save to MongoDB (fire-and-forget)
    saveSupplyData(data).catch(() => {});
}

// ── Getters / Setters ────────────────────────────────────────

export function getSupplies() { return supplies; }
export function getBills() { return bills.sort((a,b) => new Date(b.date) - new Date(a.date)); }
export function getRoommates() { return roommates; }
export function getPeopleCount() { return Math.max(1, roommates.length); }
export function getNotificationsEnabled() { return notificationsEnabled; }

export function addRoommate(name) {
    // If the only person is 'You' and we add someone, maybe keep 'You' or just add.
    // We'll just add.
    roommates.push({ id: Date.now(), name });
    saveData();
    return roommates;
}

export function removeRoommate(id) {
    roommates = roommates.filter(r => r.id !== id);
    if (roommates.length === 0) {
        // Always ensure at least 1 person exists
        roommates.push({ id: Date.now(), name: 'You' });
    }
    saveData();
    return roommates;
}

export function setNotificationsEnabled(enabled) {
    notificationsEnabled = enabled;
    saveData();
}

export function getBudget() { return monthlyBudget; }
export function setBudget(val) {
    monthlyBudget = parseFloat(val) || 50000;
    saveData();
}

// ── BILLS (One-time expenses) ────────────────────────────────

export function addBill({ name, emoji, price, date, paidById }) {
    const id = `bill-${Date.now()}`;
    const newBill = { 
        id, 
        name, 
        emoji: emoji || '💸', 
        price: parseFloat(price), 
        date,
        paidById: paidById || (roommates[0] ? roommates[0].id : null)
    };
    bills.push(newBill);
    saveData();
    return newBill;
}


export function deleteBill(id) {
    bills = bills.filter(b => b.id !== id);
    saveData();
}

// ── CRUD Operations ──────────────────────────────────────────

/**
 * Add a new supply item
 * @param {Object} item - { name, emoji, quantity, unit, price, purchaseDate, dailyRate }
 * @returns {Object} the created supply
 */
export function addSupply(item) {
    const id = `supply-${item.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const peopleCount = getPeopleCount();
    const dailyRatePerPerson = item.dailyRate || guessRate(item.name);
    const totalDailyRate = dailyRatePerPerson * peopleCount;
    const predictedDays = totalDailyRate > 0 ? Math.ceil(item.quantity / totalDailyRate) : 30;

    const supply = {
        id,
        name: item.name,
        emoji: item.emoji || '📦',
        quantity: parseFloat(item.quantity),
        unit: item.unit || 'kg',
        price: parseFloat(item.price),
        purchaseDate: item.purchaseDate,
        paidById: item.paidById || (roommates[0] ? roommates[0].id : null),
        finishedDate: null,
        dailyRatePerPerson,
        predictedDays,
        status: 'active',
        history: [],
    };

    supplies.push(supply);
    saveData();
    return supply;
}


/**
 * Mark a supply as finished
 * @param {string} id
 */
export function finishSupply(id) {
    const supply = supplies.find(s => s.id === id);
    if (!supply) return null;

    const now = new Date();
    const purchaseDate = new Date(supply.purchaseDate);
    const actualDays = Math.max(1, Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24)));

    supply.finishedDate = now.toISOString().split('T')[0];
    supply.status = 'finished';

    const peopleCount = getPeopleCount();

    // Record history for better future predictions
    supply.history.push({
        duration: actualDays,
        quantity: supply.quantity,
        price: supply.price,
        peopleCount: peopleCount,
    });

    // Update daily rate based on actual usage
    supply.dailyRatePerPerson = supply.quantity / (actualDays * peopleCount);

    saveData();
    return { supply, actualDays };
}

/**
 * Refill a supply (mark finished + create new with improved prediction)
 * @param {string} id
 * @param {Object} newData - { quantity, price, purchaseDate }
 */
export function refillSupply(id, newData) {
    const result = finishSupply(id);
    if (!result) return null;

    const oldSupply = result.supply;

    // Create new supply inheriting history and improved rate
    const newSupply = addSupply({
        name: oldSupply.name,
        emoji: oldSupply.emoji,
        quantity: newData.quantity || oldSupply.quantity,
        unit: oldSupply.unit,
        price: newData.price || oldSupply.price,
        purchaseDate: newData.purchaseDate || new Date().toISOString().split('T')[0],
        dailyRate: oldSupply.dailyRatePerPerson, // use learned rate
    });

    // Copy history
    newSupply.history = [...oldSupply.history];

    saveData();
    return newSupply;
}

/**
 * Delete a supply permanently
 * @param {string} id
 */
export function deleteSupply(id) {
    supplies = supplies.filter(s => s.id !== id);
    saveData();
}

// ── Prediction & Calculation ─────────────────────────────────

/**
 * Calculate current status of a supply item
 * @param {Object} supply
 * @returns {Object} { daysElapsed, daysRemaining, percentUsed, predictedRefillDate, costPerDay, costPerPerson }
 */
export function calculateSupplyStatus(supply) {
    const now = new Date();
    const purchaseDate = new Date(supply.purchaseDate);
    const daysElapsed = Math.max(0, Math.ceil((now - purchaseDate) / (1000 * 60 * 60 * 24)));

    const peopleCount = getPeopleCount();
    const totalDailyRate = supply.dailyRatePerPerson * peopleCount;
    const predictedTotalDays = totalDailyRate > 0
        ? Math.ceil(supply.quantity / totalDailyRate)
        : 30;

    // If has history, use average for better prediction
    let avgDays = predictedTotalDays;
    if (supply.history.length > 0) {
        const scaledDurations = supply.history.map(h => {
            // Adjust past durations for current people count
            const pastRate = h.quantity / h.duration;
            const adjustedDays = Math.ceil(supply.quantity / (pastRate * (peopleCount / h.peopleCount)));
            return adjustedDays;
        });
        avgDays = Math.round(scaledDurations.reduce((a, b) => a + b, 0) / scaledDurations.length);
        // Blend with raw prediction (70% history, 30% estimate)
        avgDays = Math.round(avgDays * 0.7 + predictedTotalDays * 0.3);
    }

    const daysRemaining = Math.max(0, avgDays - daysElapsed);
    const percentUsed = Math.min(100, (daysElapsed / avgDays) * 100);

    // Predicted refill date
    const refillDate = new Date(purchaseDate);
    refillDate.setDate(refillDate.getDate() + avgDays);

    const costPerDay = avgDays > 0 ? supply.price / avgDays : 0;
    const costPerPerson = peopleCount > 0 ? costPerDay / peopleCount : costPerDay;

    const isLow = (daysRemaining <= 2 && daysRemaining > 0) || (percentUsed >= 85 && daysRemaining > 0);
    const isCritical = daysRemaining <= 1 && daysRemaining > 0;

    return {
        daysElapsed,
        daysRemaining,
        totalDays: avgDays,
        percentUsed,
        predictedRefillDate: refillDate,
        costPerDay,
        costPerPerson,
        isLow,
        isCritical,
        isExpired: daysRemaining <= 0 && supply.status === 'active',
    };
}


/**
 * Get active supplies sorted by urgency (closest refill first)
 */
export function getActiveSupplies() {
    return supplies
        .filter(s => s.status === 'active')
        .map(s => ({ ...s, status_calc: calculateSupplyStatus(s) }))
        .sort((a, b) => a.status_calc.daysRemaining - b.status_calc.daysRemaining);
}

/**
 * Get finished supplies (history)
 */
export function getFinishedSupplies() {
    return supplies
        .filter(s => s.status === 'finished')
        .sort((a, b) => new Date(b.finishedDate) - new Date(a.finishedDate));
}

/**
 * Calculate monthly summary including tracked supplies and one-time bills
 * @returns {Object}
 */
export function getMonthlySummary() {
    const active = getActiveSupplies();
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let totalMonthly = 0;
    const itemsMap = new Map();

    active.forEach(s => {
        const stat = s.status_calc;
        const monthly = stat.costPerDay * 30; // standard 30 day window cost
        totalMonthly += monthly;
        
        if (itemsMap.has(s.name)) {
            itemsMap.get(s.name).monthly += monthly;
        } else {
            itemsMap.set(s.name, {
                name: s.name,
                emoji: s.emoji,
                monthly,
                type: 'Tracked',
                costPerDay: stat.costPerDay,
            });
        }
    });

    // Add bills from the last 30 days
    bills.forEach(b => {
        const billDate = new Date(b.date);
        if (billDate >= thirtyDaysAgo && billDate <= now) {
            totalMonthly += b.price;
            if (itemsMap.has(b.name)) {
                itemsMap.get(b.name).monthly += b.price;
            } else {
                itemsMap.set(b.name, {
                    name: b.name,
                    emoji: b.emoji,
                    monthly: b.price,
                    type: 'Bill',
                    costPerDay: 0,
                });
            }
        }
    });

    const items = Array.from(itemsMap.values());
    items.sort((a, b) => b.monthly - a.monthly);
    
    // We only return null if there are no items and no bills
    if (items.length === 0) return null;

    const topExpense = items[0] || null;
    const peopleCount = getPeopleCount();
    const perPerson = peopleCount > 0 ? totalMonthly / peopleCount : totalMonthly;

    // Settlement Logic: For the 'Current' view, we base settlement on 
    // ACTUAL money spent (purchase price) in the last 30 days.
    const settlement = calculateSettlementForRange(thirtyDaysAgo, now);

    return { totalMonthly, perPerson, items, topExpense, roommates, settlement, budget: monthlyBudget };
}

/**
 * Calculate actual money spent and balances for a date range
 */
function calculateSettlementForRange(start, end) {
    if (roommates.length <= 1) return null;

    const paidByMap = {}; // roommateId -> total
    roommates.forEach(r => paidByMap[r.id] = 0);

    let actualSpentTotal = 0;

    // Supplies purchased in range
    supplies.forEach(s => {
        const pDate = new Date(s.purchaseDate);
        if (pDate >= start && pDate <= end) {
            actualSpentTotal += s.price;
            const pId = s.paidById || roommates[0].id;
            if (paidByMap[pId] !== undefined) paidByMap[pId] += s.price;
        }
    });

    // Bills paid in range
    bills.forEach(b => {
        const bDate = new Date(b.date);
        if (bDate >= start && bDate <= end) {
            actualSpentTotal += b.price;
            const pId = b.paidById || roommates[0].id;
            if (paidByMap[pId] !== undefined) paidByMap[pId] += b.price;
        }
    });

    const share = actualSpentTotal / roommates.length;
    
    return {
        total: actualSpentTotal,
        share,
        roommates: roommates.map(r => ({
            ...r,
            paid: paidByMap[r.id],
            balance: paidByMap[r.id] - share
        }))
    };
}


/**
 * Get upcoming refills sorted by date
 * @returns {Array}
 */
export function getUpcomingRefills() {
    return getActiveSupplies()
        .map(s => ({
            id: s.id,
            name: s.name,
            emoji: s.emoji,
            refillDate: s.status_calc.predictedRefillDate,
            daysRemaining: s.status_calc.daysRemaining,
            isLow: s.status_calc.isLow,
            isExpired: s.status_calc.isExpired,
        }))
        .sort((a, b) => a.refillDate - b.refillDate);
}

/**
 * Get all months where an expense (supply or bill) occurred
 * @returns {Array} List of { label: "April 2024", value: "2024-04" }
 */
export function getAvailableMonths() {
    const months = new Set();
    
    // Check all supplies (including finished)
    supplies.forEach(s => {
        if (s.purchaseDate) {
            months.add(s.purchaseDate.substring(0, 7)); // YYYY-MM
        }
    });

    // Check all bills
    bills.forEach(b => {
        if (b.date) {
            months.add(b.date.substring(0, 7)); // YYYY-MM
        }
    });

    return Array.from(months)
        .sort((a, b) => b.localeCompare(a)) // Latest first
        .map(ym => {
            const [y, m] = ym.split('-');
            const date = new Date(y, m - 1);
            return {
                value: ym,
                label: date.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
            };
        });
}

/**
 * Get a summary of ACTUAL money spent in a specific month
 * @param {string} yearMonth - "YYYY-MM"
 */
export function getArchivedSummary(yearMonth) {
    let totalMonthly = 0;
    const itemsMap = new Map();

    // Sum supplies bought in that month
    supplies.forEach(s => {
        if (s.purchaseDate && s.purchaseDate.startsWith(yearMonth)) {
            totalMonthly += s.price;
            if (itemsMap.has(s.name)) {
                itemsMap.get(s.name).monthly += s.price;
            } else {
                itemsMap.set(s.name, {
                    name: s.name,
                    emoji: s.emoji,
                    monthly: s.price,
                    type: 'Supply'
                });
            }
        }
    });

    // Sum bills paid in that month
    bills.forEach(b => {
        if (b.date && b.date.startsWith(yearMonth)) {
            totalMonthly += b.price;
            if (itemsMap.has(b.name)) {
                itemsMap.get(b.name).monthly += b.price;
            } else {
                itemsMap.set(b.name, {
                    name: b.name,
                    emoji: b.emoji,
                    monthly: b.price,
                    type: 'Bill'
                });
            }
        }
    });

    const items = Array.from(itemsMap.values());
    items.sort((a, b) => b.monthly - a.monthly);
    
    if (items.length === 0) return null;

    const topExpense = items[0] || null;
    const peopleCount = getPeopleCount();
    const perPerson = peopleCount > 0 ? totalMonthly / peopleCount : totalMonthly;

    // Settlement for archives uses the same month logic
    const start = new Date(yearMonth + "-01");
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0); // last day of month
    const settlement = calculateSettlementForRange(start, end);

    return { totalMonthly, perPerson, items, topExpense, roommates, isArchive: true, settlement, budget: monthlyBudget };
}



/**
 * Get low-supply alerts
 * @returns {Array}
 */
export function getAlerts() {
    return getActiveSupplies().filter(s =>
        s.status_calc.isLow || s.status_calc.isExpired
    );
}

// ── Utility ──────────────────────────────────────────────────

/**
 * Guess daily rate from item name
 */
function guessRate(name) {
    const lower = name.toLowerCase();
    for (const [key, rate] of Object.entries(DEFAULT_RATES)) {
        if (lower.includes(key)) return rate;
    }
    return 0.1; // generic fallback
}

/**
 * Format date nicely
 */
export function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-PK', {
        month: 'short',
        day: 'numeric',
    });
}

export function formatDateFull(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// ── Notifications ────────────────────────────────────────────

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
}

/**
 * Send a browser notification
 */
export function sendNotification(title, body, icon = '🏠') {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!notificationsEnabled) return;

    new Notification(title, {
        body,
        icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${icon}</text></svg>`,
    });
}

/**
 * Check all supplies and send alerts for low items
 */
export function checkAndNotify() {
    const active = getActiveSupplies();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    active.forEach(s => {
        const stat = s.status_calc;
        const lastNotified = s.lastNotified || 0;
        
        // Decide whether to notify
        let shouldNotify = false;
        let title = '';
        let body = '';

        if (stat.isExpired) {
            title = `${s.emoji} ${s.name} — Should have run out!`;
            body = `Your ${s.name} supply predicted refill date has passed. Time to buy more!`;
            shouldNotify = (now - lastNotified) > TWENTY_FOUR_HOURS;
        } else if (stat.isCritical || stat.isLow) {
            title = `${s.emoji} ${s.name} — ${stat.isCritical ? 'Critical' : 'Low'} Stock!`;
            body = `Only ${stat.daysRemaining} day(s) left. Don't forget to buy more!`;
            shouldNotify = (now - lastNotified) > TWENTY_FOUR_HOURS;
        }

        if (shouldNotify) {
            sendNotification(title, body, s.emoji);
            s.lastNotified = now;
            saveData();
        }
    });
}
