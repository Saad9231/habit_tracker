// ============================================================
//  ui.js — all DOM rendering + animations
//  This file handles how data is presented to the user.
// ============================================================

import {
    COMPARE_ITEMS,
    MONEY_CARDS,
    TIME_CARDS,
    MOTIVATIONAL_TIPS,
    HABITS
} from './constants.js';

import {
    getCurrency,
    setCurrency as setSharedCurrency,
    formatCurrency,
    convertFromUSD,
    getSymbol
} from './sharedCurrency.js';

// ── STATE ───────────────────────────────────────────────────

let currentCurrency = getCurrency();
let costChart = null;
let observerInstance = null;
let toastTimeout = null;

// ── FORMATTERS ──────────────────────────────────────────────

export function setCurrency(currencyCode) {
    currentCurrency = currencyCode;
    setSharedCurrency(currencyCode);
}

export function getCurrentCurrency() {
    return currentCurrency;
}

const currency = (n) => formatCurrency(n, 0);
const decimal = (n, d = 1) => formatCurrency(n, d);

// ── ANIMATIONS ──────────────────────────────────────────────

/**
 * Animate a number from 0 to target
 */
export function countUp(el, target, suffix = '', isMoney = false, duration = 1200) {
    if (!el) return;

    const startValue = 0;
    const endValue = Number(target) || 0;
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out quint
        const ease = 1 - Math.pow(1 - progress, 5);
        const current = startValue + (endValue - startValue) * ease;

        if (isMoney) {
            el.textContent = currency(current);
        } else {
            el.textContent = current.toFixed(suffix === ' yrs' ? 2 : 1) + suffix;
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

/**
 * Trigger entrance animations for elements with [data-animate]
 */
export function triggerEntranceAnimations() {
    const elements = document.querySelectorAll('[data-animate]');

    if (observerInstance) observerInstance.disconnect();

    observerInstance = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observerInstance.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => {
        el.classList.remove('in-view');
        observerInstance.observe(el);
    });
}

// ── CONFETTI ────────────────────────────────────────────────

export function fireConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // since particles fall down, start a bit higher than random
        if (window.confetti) {
            window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }
    }, 250);
}

// ── HABIT CARDS ─────────────────────────────────────────────

/**
 * Render habit input cards
 */
export function renderHabitCards(container, habits) {
    if (!container) return;

    const symbol = getSymbol();

    let html = habits.map(h => {
        const isCustom = h.id.startsWith('custom-');
        const placeholder = h.placeholder ? h.placeholder[currentCurrency] || '' : '';

        return `
        <div class="habit-card ${isCustom ? 'custom-habit-card' : ''}" data-animate>
            ${isCustom ? `<button type="button" class="btn-delete-habit" data-habit-id="${h.id}" title="Delete Habit">×</button>` : ''}
            <div class="habit-header">
                <div class="habit-icon">${h.icon}</div>
                <div class="habit-info">
                    <div class="habit-name">${h.label}</div>
                    <div class="habit-freq">per ${h.freq}</div>
                </div>
            </div>
            <div class="habit-inputs">
                <div class="input-group">
                    <label for="${h.costId}">Cost (${symbol})</label>
                    <input type="number" id="${h.costId}" placeholder="${placeholder}" min="0" step="any" inputmode="decimal">
                </div>
                <div class="input-group">
                    <label for="${h.timeId}">Time (Min)</label>
                    <input type="number" id="${h.timeId}" placeholder="15" min="0" step="1" inputmode="numeric">
                </div>
            </div>
        </div>
        `;
    }).join('');

    // Add "Add Custom Habit" card
    html += `
        <div class="habit-card add-habit-card" id="btn-open-modal" data-animate>
            <div class="add-icon">+</div>
            <div class="add-text">Add Custom Habit</div>
        </div>
    `;

    container.innerHTML = html;
}

// ── RESULTS PANEL ───────────────────────────────────────────

/**
 * Render biggest expense banner
 */
export function renderBiggestBanner(habit) {
    const banner = document.getElementById('biggest-expense-banner');
    if (!banner) return;

    if (!habit || habit.monthlyCost <= 0) {
        banner.hidden = true;
        return;
    }

    banner.innerHTML = `
        <span class="banner-icon">🚩</span>
        <span>Your biggest money drain is <strong>${habit.label}</strong>, costing you <strong>${currency(habit.monthlyCost)}</strong> every month.</span>
    `;
    banner.hidden = false;
}

/**
 * Render the summary impact card (Step 2 main card)
 */
export function renderSummaryCard(money) {
    const results = document.getElementById('results');
    const existingCard = results.querySelector('.summary-impact-card');
    if (existingCard) existingCard.remove();

    const card = document.createElement('div');
    card.className = 'summary-impact-card';
    card.setAttribute('data-animate', '');

    card.innerHTML = `
        <div class="sic-label">Total 10-Year Cost</div>
        <div class="sic-value" id="sic-total">0</div>
        <div class="sic-note">That's how much your current habits will cost you over the next decade.</div>
        
        <div class="sic-shock-grid">
            <div class="sic-shock-item">
                <div class="ssi-icon">📉</div>
                <div class="ssi-label">Inflation Adjusted</div>
                <div class="ssi-value">${currency(money.inflatedMonthly10)}</div>
                <div class="ssi-note">Monthly cost in 10 yrs</div>
            </div>
            <div class="sic-shock-item">
                <div class="ssi-icon">📈</div>
                <div class="ssi-label">If Invested (10Y)</div>
                <div class="ssi-value" id="sic-invested">0</div>
                <div class="ssi-note">At 10% annual return</div>
            </div>
        </div>
    `;

    results.insertBefore(card, results.querySelector('.share-row'));

    // Animate the values
    setTimeout(() => {
        countUp(document.getElementById('sic-total'), money.tenYr, '', true);
        countUp(document.getElementById('sic-invested'), money.investment10, '', true);
    }, 100);
}

/**
 * Render Money and Time grids
 */
export function renderResultsPanel(results) {
    const moneyGrid = document.getElementById('money-grid');
    const timeGrid = document.getElementById('time-grid');

    if (moneyGrid) {
        moneyGrid.innerHTML = MONEY_CARDS.map(card => `
            <div class="result-card ${card.style}" data-animate>
                <div class="result-period">${card.period}</div>
                <div class="result-amount" id="${card.id}">0</div>
                <div class="result-note">${card.note}</div>
            </div>
        `).join('');

        MONEY_CARDS.forEach(card => {
            const val = results.money[card.id.replace('r-', '')] || results.money[card.id.split('-')[1] + 'Yr'];
            countUp(document.getElementById(card.id), val, '', true);
        });
    }

    if (timeGrid) {
        timeGrid.innerHTML = TIME_CARDS.map(card => `
            <div class="time-card ${card.style}" data-animate>
                <div class="time-icon">${card.icon}</div>
                <div class="time-value" id="${card.id}">0</div>
                <div class="time-label">${card.label}</div>
            </div>
        `).join('');

        TIME_CARDS.forEach(card => {
            const key = card.id.replace('t-', '');
            const val = results.time[key];
            countUp(document.getElementById(card.id), val, card.suffix);
        });
    }
}

/**
 * Render breakdown list of habits
 */
export function renderBreakdownList(habits, totalYearly) {
    const container = document.getElementById('breakdown-list');
    if (!container) return;

    const activeHabits = habits
        .filter(h => h.monthlyCost > 0)
        .sort((a, b) => b.monthlyCost - a.monthlyCost);

    if (activeHabits.length === 0) {
        container.innerHTML = '<div class="empty-state">No active habits to display.</div>';
        return;
    }

    container.innerHTML = activeHabits.map((h, i) => {
        const yearly = h.monthlyCost * 12;
        const pct = totalYearly > 0 ? Math.round((yearly / totalYearly) * 100) : 0;
        const isTop = i === 0;

        return `
        <div class="breakdown-item ${isTop ? 'top-habit' : ''}" data-animate>
            <div class="bi-icon">${h.icon}</div>
            <div class="bi-info">
                <div class="bi-name">${h.label}</div>
                <div class="bi-freq">${currency(h.costPerPeriod)} / ${h.freq}</div>
            </div>
            <div class="bi-bar-wrap">
                <div class="bi-bar" style="width: ${pct}%"></div>
            </div>
            <div class="bi-right">
                <div class="bi-yearly">${currency(yearly)}/yr</div>
                <div class="bi-pct">${pct}% of total</div>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Render comparison grid (what you could buy)
 */
export function renderComparisonGrid(yearlyCost) {
    const container = document.getElementById('comparison-grid');
    if (!container) return;

    container.innerHTML = COMPARE_ITEMS.map(item => {
        const price = convertFromUSD(item.priceUSD);
        const canAfford = yearlyCost >= price;
        const monthsNeeded = Math.ceil(price / (yearlyCost / 12));

        return `
        <div class="compare-card ${canAfford ? 'can-afford' : 'cannot-afford'}" data-animate>
            <div class="cc-emoji">${item.emoji}</div>
            <div class="cc-item">${item.item}</div>
            <div class="cc-price">~ ${currency(price)}</div>
            <div class="cc-status">
                ${canAfford ? '✅ You can afford this!' : `❌ Need ${monthsNeeded} more months`}
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Render a random motivational tip
 */
export function renderMotivationalTip() {
    const container = document.getElementById('motivational-tip');
    if (!container) return;

    const tip = MOTIVATIONAL_TIPS[Math.floor(Math.random() * MOTIVATIONAL_TIPS.length)];

    container.innerHTML = `
        <div class="tip-card" data-animate>
            <div class="tip-icon">💡</div>
            <div class="tip-text">${tip}</div>
        </div>
    `;
}

// ── CHART ───────────────────────────────────────────────────

export function renderCostChart(money) {
    const canvas = document.getElementById('cost-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    if (costChart) {
        costChart.destroy();
    }

    costChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Now', '2 Years', '5 Years', '10 Years', '20 Years'],
            datasets: [
                {
                    label: 'Direct Cost',
                    data: [0, money.yearly * 2, money.fiveYr, money.tenYr, money.twentyYr],
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: '#6366f1',
                    pointRadius: 4
                },
                {
                    label: 'If Invested (10%)',
                    data: [0, money.yearly * 2.1, money.yearly * 6.5, money.investment10, money.investment20],
                    borderColor: '#10b981',
                    borderDash: [5, 5],
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor, font: { weight: '600' } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function (context) {
                            return context.dataset.label + ': ' + currency(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        callback: (val) => currency(val)
                    }
                }
            }
        }
    });
}

// ── UI UTILITIES ────────────────────────────────────────────

export function showResults() {
    const section = document.getElementById('results');
    section.classList.add('visible');
}

export function hideResults() {
    const section = document.getElementById('results');
    section.classList.remove('visible');
}

export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    if (toastTimeout) clearTimeout(toastTimeout);

    toast.textContent = message;
    toast.className = `toast toast-visible toast-${type}`;
    toast.hidden = false;

    toastTimeout = setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => { toast.hidden = true; }, 400);
    }, 3000);
}

export function resetForm(form) {
    form.reset();
    form.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
}

export function clearErrors(form) {
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

export function highlightErrors(form, formData) {
    Object.entries(formData).forEach(([id, val]) => {
        if (!val || isNaN(val) || Number(val) < 0) {
            const input = document.getElementById(id);
            if (input) input.classList.add('error');
        }
    });
}

export function updateProgressBar(form, totalHabits) {
    const inputs = form.querySelectorAll('input[id$="-cost"]');
    let filled = 0;
    inputs.forEach(input => {
        if (input.value && Number(input.value) > 0) filled++;
    });

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const pct = (filled / totalHabits) * 100;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressText) progressText.textContent = `${filled} of ${totalHabits} habits filled`;
}

// ── SHARING ──────────────────────────────────────────────────

export function generateShareText(results) {
    const symbol = getSymbol();
    return `💸 My daily habits are costing me ${currency(results.money.tenYr)} over the next 10 years! 😱\n\nThat's ${currency(results.money.monthly)} every month. I could have bought an ${COMPARE_ITEMS[0].item} instead! 📱\n\nCalculate your hidden costs here: ${window.location.href}`;
}

export function shareToWhatsApp(results) {
    const text = encodeURIComponent(generateShareText(results));
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

export function copyToClipboard(results) {
    const text = generateShareText(results);
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Copied to clipboard!', 'success');
    });
}