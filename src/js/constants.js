// ============================================================
//  constants.js — single source of truth for all config data
//  Agar koi naya habit ya comparison item add karna ho,
//  sirf yahan aao — baaki code automatically update ho ga.
//
//  NOTE: EXCHANGE_RATES ab sharedCurrency.js mein hain.
//        Dono pages (habit + supply) wahan se import karte hain.
// ============================================================

/**
 * Each habit definition:
 * @property {string} id         - unique key
 * @property {string} label      - display name
 * @property {string} icon       - emoji icon
 * @property {string} freq       - 'day' | 'week' | 'month'
 * @property {number} multiplier - converts freq → monthly cost/time
 * @property {string} costId     - form input id for cost
 * @property {string} timeId     - form input id for time
 * @property {Object} placeholder - suggested cost per currency
 */
export const HABITS = [
    {
        id: 'coffee',
        label: 'Coffee',
        icon: '☕',
        freq: 'day',
        multiplier: 30,
        costId: 'coffee-cost',
        timeId: 'coffee-time',
        placeholder: { USD: '5', EUR: '4', GBP: '3.50', PKR: '250', INR: '150', CNY: '25' },
    },
    {
        id: 'soft-drinks',
        label: 'Soft Drinks / Soda',
        icon: '🥤',
        freq: 'day',
        multiplier: 30,
        costId: 'soda-cost',
        timeId: 'soda-time',
        placeholder: { USD: '2', EUR: '2', GBP: '1.50', PKR: '100', INR: '50', CNY: '8' },
    },
    {
        id: 'takeout',
        label: 'Eating Out',
        icon: '🥡',
        freq: 'week',
        multiplier: 4.33,
        costId: 'takeout-cost',
        timeId: 'takeout-time',
        placeholder: { USD: '25', EUR: '20', GBP: '18', PKR: '1500', INR: '800', CNY: '100' },
    },
    {
        id: 'desserts',
        label: 'Desserts / Sweets',
        icon: '🍰',
        freq: 'week',
        multiplier: 4.33,
        costId: 'desserts-cost',
        timeId: 'desserts-time',
        placeholder: { USD: '10', EUR: '8', GBP: '7', PKR: '500', INR: '300', CNY: '40' },
    },
    {
        id: 'uber',
        label: 'Rides / Uber',
        icon: '🚗',
        freq: 'week',
        multiplier: 4.33,
        costId: 'uber-cost',
        timeId: 'uber-time',
        placeholder: { USD: '15', EUR: '12', GBP: '10', PKR: '800', INR: '500', CNY: '50' },
    },
    {
        id: 'subscriptions',
        label: 'Streaming / Subs',
        icon: '📺',
        freq: 'month',
        multiplier: 1,
        costId: 'sub-cost',
        timeId: 'sub-time',
        placeholder: { USD: '30', EUR: '25', GBP: '20', PKR: '2000', INR: '1000', CNY: '100' },
    },
    {
        id: 'shopping',
        label: 'Impulse Buys',
        icon: '🛍️',
        freq: 'month',
        multiplier: 1,
        costId: 'shop-cost',
        timeId: 'shop-time',
        placeholder: { USD: '50', EUR: '45', GBP: '40', PKR: '5000', INR: '3000', CNY: '200' },
    },
    {
        id: 'gaming',
        label: 'Gaming / Apps',
        icon: '🎮',
        freq: 'month',
        multiplier: 1,
        costId: 'gaming-cost',
        timeId: 'gaming-time',
        placeholder: { USD: '20', EUR: '18', GBP: '15', PKR: '1500', INR: '800', CNY: '80' },
    },
];

/**
 * Financial defaults for future value & inflation calculations
 */
export const DEFAULT_RATES = {
    INVESTMENT: 0.10, // 10% annual return
    INFLATION: 0.05,  // 5% annual inflation
};

/**
 * Items shown in the "What you could buy instead" section.
 * Prices in USD — will be converted dynamically at render time.
 * @property {string}  emoji    - display emoji
 * @property {string}  item     - item name
 * @property {number}  priceUSD - base price in USD
 */
export const COMPARE_ITEMS = [
    { emoji: '📱', item: 'iPhone 15 Pro', priceUSD: 999 },
    { emoji: '💻', item: 'M3 MacBook Air', priceUSD: 1099 },
    { emoji: '✈️', item: 'Umrah Package / Vacation', priceUSD: 1500 },
    { emoji: '🚲', item: 'Honda CD70 / Bike', priceUSD: 600 },
    { emoji: '☀️', item: 'Solar Panel Setup (Small)', priceUSD: 2500 },
    { emoji: '🏍️', item: 'Heavy Bike (Used)', priceUSD: 4000 },
    { emoji: '🎓', item: 'Masters Degree (Local)', priceUSD: 3000 },
    { emoji: '🏠', item: 'Plot Downpayment / Land', priceUSD: 15000 },
];

/**
 * Money result cards config
 * id matches the element id in index.html (set by ResultsPanel)
 */
export const MONEY_CARDS = [
    { id: 'r-monthly', period: 'Monthly', note: 'every month', style: 'default' },
    { id: 'r-yearly', period: 'Yearly', note: 'every year', style: 'accent' },
    { id: 'r-5year', period: '5 Years', note: 'five years out', style: 'default' },
    { id: 'r-10year', period: '10 Years', note: 'a decade of habits', style: 'highlight' },
];

/**
 * Time result cards config
 */
export const TIME_CARDS = [
    { id: 't-monthly', icon: '🕐', label: 'per month', suffix: ' hrs', style: 'default' },
    { id: 't-yearly', icon: '📅', label: 'per year', suffix: ' hrs', style: 'default' },
    { id: 't-days', icon: '☀️', label: 'days per year', suffix: ' days', style: 'default' },
    { id: 't-10years', icon: '💀', label: 'wasted in 10 yrs', suffix: ' yrs', style: 'danger' },
];

/**
 * Motivational tips shown after results
 */
export const MOTIVATIONAL_TIPS = [
    "🌱 Small changes today = massive savings tomorrow. Start with cutting just ONE habit.",
    "📈 If invested at 7% annual return, your habit money could DOUBLE every 10 years!",
    "💡 The best time to start saving was yesterday. The second best time is NOW.",
    "🎯 Replace one expensive habit with a free alternative — your future self will thank you.",
    "🧠 Awareness is the first step to change. You've already done the hardest part!",
    "💪 Even cutting 20% of these costs would make a huge difference over 5 years.",
    "🏦 Redirect habit money to an emergency fund — peace of mind is priceless.",
    "☕ Switching to homemade coffee alone can save you thousands per year!",
    "🚀 Financial freedom starts with knowing where your money goes. Now you know.",
    "🎉 Congratulations on facing the numbers! Most people never even look.",
];