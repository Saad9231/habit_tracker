// ============================================================
//  api.js — Frontend API helper for MongoDB communication
//  Provides fetch wrapper with localStorage fallback.
//  If the server is unreachable, silently falls back to
//  localStorage so the PWA still works offline.
// ============================================================

const API_BASE = '/api';

/**
 * Generic API call wrapper
 * @param {string} endpoint - e.g. '/habits' or '/supplies'
 * @param {string} method   - 'GET' | 'PUT' | 'POST' | 'DELETE'
 * @param {Object} body     - request body (for PUT/POST)
 * @returns {Object|null}   - { success, data } or null if offline
 */
export async function fetchAPI(endpoint, method = 'GET', body = null) {
    try {
        const token = localStorage.getItem('auth-token');
        const options = {
            method,
            headers: { 
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
        };

        if (body && (method === 'PUT' || method === 'POST')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);

        if (response.status === 401) {
            console.warn('Unauthorized. Redirecting to login.');
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-user');
            window.location.href = './auth.html';
            return null;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.warn(`⚠️ API call failed (${method} ${endpoint}):`, err.message);
        console.warn('   Falling back to localStorage.');
        return null; // Caller handles fallback
    }
}

// ── Habit API ───────────────────────────────────────────────

/**
 * Load habit data from MongoDB
 * @returns {Object|null} - { currency, formData, customHabits } or null
 */
export async function loadHabitData() {
    const result = await fetchAPI('/habits');
    if (result && result.success && result.data) {
        return {
            currency: result.data.currency,
            formData: result.data.formData,
            customHabits: result.data.customHabits || []
        };
    }
    return null;
}

/**
 * Save habit data to MongoDB
 * @param {Object} data - { currency, formData, customHabits }
 */
export async function saveHabitData(data) {
    return await fetchAPI('/habits', 'PUT', data);
}

/**
 * Clear habit data from MongoDB
 */
export async function clearHabitData() {
    return await fetchAPI('/habits', 'DELETE');
}

// ── Supply API ──────────────────────────────────────────────

/**
 * Load all supply data from MongoDB
 * @returns {Object|null} - { supplies, bills, roommates, notificationsEnabled, monthlyBudget } or null
 */
export async function loadSupplyData() {
    const result = await fetchAPI('/supplies');
    if (result && result.success && result.data) {
        return {
            supplies: result.data.supplies || [],
            bills: result.data.bills || [],
            roommates: result.data.roommates || [{ id: 1, name: 'You' }],
            notificationsEnabled: result.data.notificationsEnabled || false,
            monthlyBudget: result.data.monthlyBudget || 50000
        };
    }
    return null;
}

/**
 * Save complete supply data to MongoDB
 * @param {Object} data - { supplies, bills, roommates, notificationsEnabled, monthlyBudget }
 */
export async function saveSupplyData(data) {
    return await fetchAPI('/supplies', 'PUT', data);
}

/**
 * Clear all supply data from MongoDB
 */
export async function clearSupplyData() {
    return await fetchAPI('/supplies', 'DELETE');
}
