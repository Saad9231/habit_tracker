// ============================================================
//  sharedCurrency.js — Shared currency state across pages
//  Both index.html (habit calculator) and supply.html use this.
//  localStorage key: 'app-currency'
// ============================================================

const STORAGE_KEY = 'app-currency';

export let EXCHANGE_RATES = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    PKR: 280,
    INR: 83,
    CNY: 7.25,
};

const RATES_CACHE_KEY = 'app-exchange-rates';
const RATES_TIME_KEY = 'app-exchange-rates-time';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch latest rates from API and update local state
 */
export async function updateExchangeRates() {
    try {
        const lastUpdate = localStorage.getItem(RATES_TIME_KEY);
        const now = Date.now();

        // Check if we have cached rates that are still fresh
        if (lastUpdate && (now - lastUpdate < CACHE_DURATION)) {
            const cachedRates = JSON.parse(localStorage.getItem(RATES_CACHE_KEY));
            if (cachedRates) {
                Object.assign(EXCHANGE_RATES, cachedRates);
                console.log('Using cached exchange rates');
                return true;
            }
        }

        console.log('Fetching live exchange rates...');
        // Using a reliable free public endpoint
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();

        if (data && data.rates) {
            const newRates = {
                USD: 1,
                EUR: data.rates.EUR,
                GBP: data.rates.GBP,
                PKR: data.rates.PKR,
                INR: data.rates.INR,
                CNY: data.rates.CNY,
            };

            Object.assign(EXCHANGE_RATES, newRates);
            localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(newRates));
            localStorage.setItem(RATES_TIME_KEY, now.toString());
            console.log('Exchange rates updated successfully');
            return true;
        }
    } catch (e) {
        console.warn('Failed to fetch live exchange rates, using defaults.', e);
    }
    return false;
}

export const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    PKR: '₨',
    INR: '₹',
    CNY: '¥',
};

export const CURRENCY_LOCALES = {
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    PKR: 'ur-PK',
    INR: 'en-IN',
    CNY: 'zh-CN',
};

let _current = localStorage.getItem(STORAGE_KEY) || 'PKR';

export function getCurrency() {
    return _current;
}

export function setCurrency(code) {
    _current = code;
    localStorage.setItem(STORAGE_KEY, code);
}

export function getLocale() {
    return CURRENCY_LOCALES[_current] || 'en-US';
}

export function getSymbol() {
    return CURRENCY_SYMBOLS[_current] || _current;
}

export function getRate() {
    return EXCHANGE_RATES[_current] || 1;
}

/**
 * Format a number as currency string using current currency
 * @param {number} n
 * @param {number} decimals
 */
export function formatCurrency(n, decimals = 0) {
    return new Intl.NumberFormat(getLocale(), {
        style: 'currency',
        currency: _current,
        maximumFractionDigits: decimals,
    }).format(n);
}

/**
 * Convert a USD price to current currency
 * @param {number} usdPrice
 */
export function convertFromUSD(usdPrice) {
    return Math.round(usdPrice * getRate());
}
