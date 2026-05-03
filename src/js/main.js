// ============================================================
//  main.js — entry point
//  Sirf yahan event listeners hain aur sab kuch wire hota hai.
//  Koi math nahi, koi DOM rendering nahi — sirf orchestration.
// ============================================================

import { HABITS } from './constants.js';
import { calculate } from './calculator.js';
import {
    getFormData,
    hasAnyValue
} from './validator.js';
import {
    renderHabitCards,
    renderResultsPanel,
    renderBiggestBanner,
    renderSummaryCard,
    renderCostChart,
    renderBreakdownList,
    renderComparisonGrid,
    renderMotivationalTip,
    showResults,
    hideResults,
    showToast,
    resetForm,
    triggerEntranceAnimations,
    highlightErrors,
    clearErrors,
    setCurrency,
    updateProgressBar,
    fireConfetti,
    shareToWhatsApp,
    copyToClipboard,
    generateShareText
} from './ui.js';
import { cyberAudio } from './audio.js';
import { getCurrency, updateExchangeRates } from './sharedCurrency.js';
import { saveHabitData, loadHabitData, clearHabitData } from './api.js';

// ── DOM references ───────────────────────────────────────────

const habitGrid = document.getElementById('habits-grid');
const habitForm = document.getElementById('habit-form');
const btnCalc = document.getElementById('btn-calculate');
const btnReset = document.getElementById('btn-reset');
const currencySelect = document.getElementById('currency-select');
const themeToggle = document.getElementById('theme-toggle');
const customHabitModal = document.getElementById('custom-habit-modal');
const customHabitForm = document.getElementById('custom-habit-form');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnBackToTop = document.getElementById('btn-back-to-top');
const audioToggle = document.getElementById('audio-toggle');

// ── State ────────────────────────────────────────────────────

let customHabits = [];
let allHabits = [];
let lastResults = null; // store for share functionality
let isFirstCalculation = true;

function updateHabitState() {
    allHabits = [...HABITS, ...customHabits];
}

// ── Theme Logic ──────────────────────────────────────────────

function initTheme() {
    const theme = localStorage.getItem('theme-preference');
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    }
}

function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme-preference', 'light');
        themeToggle.textContent = '🌙';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme-preference', 'dark');
        themeToggle.textContent = '☀️';
    }
    cyberAudio.playDigital();

    // Re-render chart with correct theme colors if results visible
    const isResultsVisible = document
        .getElementById('results')
        .classList.contains('visible');
    if (isResultsVisible && lastResults) {
        renderCostChart(lastResults.money);
    }
}

// ── Local Storage + MongoDB Sync ─────────────────────────────

function saveToLocalStorage() {
    const formData = getFormData(habitForm);
    const data = {
        currency: currencySelect.value,
        formData,
        customHabits
    };
    // Save to localStorage (offline cache)
    localStorage.setItem('habit-cost-data', JSON.stringify(data));
    // Also save to MongoDB (fire-and-forget)
    saveHabitData(data).catch(() => {});
}

/**
 * Load from MongoDB first, fall back to localStorage
 */
async function loadFromMongoDB() {
    try {
        const mongoData = await loadHabitData();
        if (mongoData) {
            console.log('📦 Loaded habit data from MongoDB');
            // Also update localStorage cache
            localStorage.setItem('habit-cost-data', JSON.stringify(mongoData));
            return applyLoadedData(mongoData);
        }
    } catch (e) {
        console.warn('MongoDB load failed, trying localStorage', e);
    }
    // Fallback to localStorage
    return loadFromLocalStorage();
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('habit-cost-data');
        if (!saved) return false;
        const data = JSON.parse(saved);
        return applyLoadedData(data);
    } catch (e) {
        console.error('Failed to load from local storage', e);
    }
    return false;
}

function applyLoadedData(data) {
    if (!data) return false;

    if (data.currency) {
        currencySelect.value = data.currency;
        setCurrency(data.currency);
    }

    if (data.customHabits) {
        customHabits = data.customHabits;
    }

    updateHabitState();
    renderHabitCards(habitGrid, allHabits);
    triggerEntranceAnimations();

    if (data.formData) {
        Object.entries(data.formData).forEach(([id, val]) => {
            const input = document.getElementById(id);
            if (input && val !== undefined) input.value = val;
        });
        return hasAnyValue(data.formData);
    }
    return false;
}

// ── Auth Guard & Init ────────────────────────────────────────

// Check Authentication
const token = localStorage.getItem('auth-token');
if (!token) {
    window.location.href = './auth.html';
}

// Display User Name
const userStr = localStorage.getItem('auth-user');
const userNameDisplay = document.getElementById('userNameDisplay');
if (userStr && userNameDisplay) {
    const user = JSON.parse(userStr);
    userNameDisplay.textContent = `Welcome, ${user.name.split(' ')[0]}`;
}

// Logout Logic
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('auth-user');
        window.location.href = './auth.html';
    });
}

initTheme();

// Sync currency selector with shared saved value (from supply page or last visit)
const savedCurrency = getCurrency();
if (currencySelect.value !== savedCurrency) {
    currencySelect.value = savedCurrency;
    setCurrency(savedCurrency);
}

updateHabitState();
renderHabitCards(habitGrid, allHabits);
triggerEntranceAnimations();

// First load from localStorage (instant), then try MongoDB (async)
const hasLocalData = loadFromLocalStorage();
updateProgressBar(habitForm, allHabits.length);

if (hasLocalData) {
    isFirstCalculation = false;
    runCalculation(false);
}

// Then try MongoDB in background (may override with newer data)
loadFromMongoDB().then(hasMongoData => {
    if (hasMongoData && !hasLocalData) {
        updateProgressBar(habitForm, allHabits.length);
        isFirstCalculation = false;
        runCalculation(false);
    }
});

// Fetch live rates in background
updateExchangeRates().then(updated => {
    if (updated) {
        // If results are already showing, refresh them with new rates
        const isResultsVisible = document.getElementById('results').classList.contains('visible');
        if (isResultsVisible) {
            runCalculation(false);
            showToast('🔄 Exchange rates updated live!', 'success');
        }
    }
});

// ── Calculate ────────────────────────────────────────────────

function runCalculation(withConfetti = true) {
    const formData = getFormData(habitForm);
    clearErrors(habitForm);

    if (!hasAnyValue(formData)) {
        highlightErrors(habitForm, formData);
        showToast('Enter at least one habit cost to continue!');
        shakeButton(btnCalc);
        cyberAudio.playError();
        return;
    }

    const results = calculate(formData, allHabits);
    lastResults = results;

    renderBiggestBanner(results.biggestHabit);
    renderSummaryCard(results.money);
    renderCostChart(results.money);
    renderResultsPanel(results);
    renderBreakdownList(results.habits, results.money.yearly);
    renderComparisonGrid(results.money.yearly);
    renderMotivationalTip();

    showResults();

    // Fire confetti on first calculation only
    if (withConfetti && isFirstCalculation) {
        setTimeout(() => fireConfetti(), 400);
        isFirstCalculation = false;
    }
    
    cyberAudio.playSuccess();

    setTimeout(() => triggerEntranceAnimations(), 300);
    saveToLocalStorage();
}

// ── Custom Habits Logic ──────────────────────────────────────

function handleAddCustomHabit(e) {
    e.preventDefault();
    const name = document.getElementById('custom-name').value.trim();
    let emoji = document.getElementById('custom-emoji').value.trim();
    if (!emoji) emoji = '✨'; // default emoji
    const freq = document.getElementById('custom-freq').value;

    if (!name) return;

    const idStr = name.toLowerCase().replace(/\s+/g, '-');
    const multiplier = freq === 'day' ? 30 : freq === 'week' ? 4.33 : 1;
    const uniqueTime = Date.now();

    const newHabit = {
        id: `custom-${idStr}-${uniqueTime}`,
        label: name,
        icon: emoji,
        freq,
        multiplier,
        costId: `custom-${idStr}-cost-${uniqueTime}`,
        timeId: `custom-${idStr}-time-${uniqueTime}`
    };

    customHabits.push(newHabit);
    updateHabitState();
    
    // Save current form values before re-rendering grid
    const currentFormData = getFormData(habitForm);
    
    renderHabitCards(habitGrid, allHabits);
    
    // Restore form values
    Object.entries(currentFormData).forEach(([id, val]) => {
        const input = document.getElementById(id);
        if (input && val !== undefined) input.value = val;
    });

    updateProgressBar(habitForm, allHabits.length);
    saveToLocalStorage();
    customHabitForm.reset();
    customHabitModal.close();
    showToast(`✨ "${name}" habit added!`, 'success');
    cyberAudio.playDigital();
}

// Delete custom habit
function handleDeleteCustomHabit(habitId) {
    const habit = customHabits.find(h => h.id === habitId);
    if (!habit) return;

    customHabits = customHabits.filter(h => h.id !== habitId);
    updateHabitState();

    const currentFormData = getFormData(habitForm);
    renderHabitCards(habitGrid, allHabits);

    Object.entries(currentFormData).forEach(([id, val]) => {
        const input = document.getElementById(id);
        if (input && val !== undefined) input.value = val;
    });

    updateProgressBar(habitForm, allHabits.length);
    saveToLocalStorage();
    showToast(`🗑️ "${habit.label}" removed.`, 'info');
    cyberAudio.playDigital();

    // Recalculate if results visible
    const isResultsVisible = document
        .getElementById('results')
        .classList.contains('visible');
    if (isResultsVisible) runCalculation(false);
}

habitGrid.addEventListener('click', (e) => {
    if (e.target.closest('#btn-open-modal')) {
        customHabitModal.showModal();
        cyberAudio.playClick();
    }
    // Delete custom habit
    const deleteBtn = e.target.closest('.btn-delete-habit');
    if (deleteBtn) {
        const habitId = deleteBtn.dataset.habitId;
        handleDeleteCustomHabit(habitId);
    }
});

btnCloseModal.addEventListener('click', () => {
    customHabitModal.close();
    cyberAudio.playClick();
});

customHabitForm.addEventListener('submit', handleAddCustomHabit);

// ── Share Actions ────────────────────────────────────────────

function handleShare(action) {
    if (!lastResults) return;

    if (action === 'whatsapp') {
        shareToWhatsApp(lastResults);
    } else if (action === 'copy') {
        copyToClipboard(lastResults);
    }
    cyberAudio.playDigital();
}

// ── Reset ────────────────────────────────────────────────────

function runReset() {
    resetForm(habitForm);
    clearErrors(habitForm);
    hideResults();
    customHabits = [];
    lastResults = null;
    isFirstCalculation = true;
    updateHabitState();
    renderHabitCards(habitGrid, allHabits);
    updateProgressBar(habitForm, allHabits.length);
    localStorage.removeItem('habit-cost-data');
    // Also clear from MongoDB
    clearHabitData().catch(() => {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
    cyberAudio.playDigital();
}

// ── Live recalculation (when results already visible) ────────

function onInputChange(e) {
    if (e.target.tagName === 'INPUT') {
        e.target.classList.remove('error');
    }
    saveToLocalStorage();
    updateProgressBar(habitForm, allHabits.length);

    const isResultsVisible = document
        .getElementById('results')
        .classList.contains('visible');

    if (isResultsVisible) runCalculation(false);
}

function onCurrencyChange() {
    setCurrency(currencySelect.value);
    
    const currentFormData = getFormData(habitForm);
    
    renderHabitCards(habitGrid, allHabits);
    
    Object.entries(currentFormData).forEach(([id, val]) => {
        const input = document.getElementById(id);
        if (input && val !== undefined) input.value = val;
    });

    saveToLocalStorage();
    
    const isResultsVisible = document
        .getElementById('results')
        .classList.contains('visible');

    if (isResultsVisible) runCalculation(false);
    cyberAudio.playDigital();
}

// ── Helpers ──────────────────────────────────────────────────

function shakeButton(btn) {
    btn.classList.add('shake');
    btn.addEventListener('animationend', () => {
        btn.classList.remove('shake');
    }, { once: true });
}

// ── Back to top button ───────────────────────────────────────

if (btnBackToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            btnBackToTop.classList.add('visible');
        } else {
            btnBackToTop.classList.remove('visible');
        }
    }, { passive: true });

    btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        cyberAudio.playClick();
    });
}

// ── Sticky Calculate Button (mobile) ─────────────────────────

const stickyCalc = document.getElementById('sticky-calculate');
if (stickyCalc) {
    const originalBtn = document.getElementById('btn-calculate');
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (!entry.isIntersecting && window.scrollY > 200) {
                stickyCalc.classList.add('visible');
            } else {
                stickyCalc.classList.remove('visible');
            }
        },
        { threshold: 0 }
    );
    observer.observe(originalBtn);

    stickyCalc.addEventListener('click', () => {
        runCalculation();
    });
}

// ── Keyboard Shortcuts ───────────────────────────────────────

document.addEventListener('keydown', (e) => {
    // Enter to calculate (when not in modal)
    if (e.key === 'Enter' && !customHabitModal.open) {
        e.preventDefault();
        runCalculation();
    }
    // Escape to close modal
    if (e.key === 'Escape' && customHabitModal.open) {
        customHabitModal.close();
    }
});

// ── Event listeners ──────────────────────────────────────────

btnCalc.addEventListener('click', () => runCalculation());
btnReset.addEventListener('click', runReset);
habitForm.addEventListener('input', onInputChange);
currencySelect.addEventListener('change', onCurrencyChange);
themeToggle.addEventListener('click', toggleTheme);

audioToggle.addEventListener('click', () => {
    const isMuted = cyberAudio.toggleMute();
    audioToggle.textContent = isMuted ? '🔇' : '🔊';
    if (!isMuted) cyberAudio.playDigital();
});

// Initialize audio toggle icon
if (audioToggle) {
    audioToggle.textContent = cyberAudio.isMuted ? '🔇' : '🔊';
}

// ── Tactile Audio Feedback (Event Delegation) ───────────────

document.addEventListener('click', (e) => {
    // 1. Digital Sweep for navigation links
    if (e.target.closest('.nav-link')) {
        cyberAudio.playDigital();
    }

    // 2. Share Actions via [data-share]
    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn) {
        handleShare(shareBtn.dataset.share);
    }

    // 3. Click sounds for primary actions
    const clickSelectors = [
        '.btn-calculate',
        '.btn-reset',
        '.add-habit-card',
        '.habit-action',
        '.btn-delete-habit',
        '.btn-edit',
        '.theme-toggle',
        '.audio-toggle',
        '.btn-back-to-top',
        '#btn-open-modal',
        '#btn-close-modal'
    ].join(',');

    if (e.target.closest(clickSelectors)) {
        cyberAudio.playClick();
    }
});
