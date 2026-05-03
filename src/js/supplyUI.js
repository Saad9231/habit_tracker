// ============================================================
//  supplyUI.js — All DOM rendering for Supply Tracker
//  Supply cards, timeline, summary, alerts, toast
// ============================================================

import {
    calculateSupplyStatus,
    formatDate,
    formatDateFull,
    getPeopleCount,
} from './supplyTracker.js';

import { formatCurrency } from './sharedCurrency.js';

let supplyChart = null;

// ── Currency Formatters — now use shared currency ────────────

const currency = n => formatCurrency(n, 0);
const currencyDecimal = n => formatCurrency(n, 1);

// ── SUPPLY CARDS ─────────────────────────────────────────────

/**
 * Render active supply cards into the grid
 * @param {HTMLElement} container - #supply-grid
 * @param {Array} activeSupplies - from getActiveSupplies()
 */
export function renderSupplyCards(container, activeSupplies) {
    if (activeSupplies.length === 0) {
        container.innerHTML = `
            <div class="empty-supply-state">
                <div class="empty-icon">📦</div>
                <div class="empty-title">No supplies tracked yet</div>
                <div class="empty-desc">Add your first supply to start tracking consumption and predicting refill dates.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = activeSupplies.map(supply => {
        const stat = supply.status_calc;
        const urgencyClass = stat.isExpired ? 'expired'
            : stat.isCritical ? 'critical'
            : stat.isLow ? 'low'
            : stat.percentUsed > 70 ? 'warning'
            : 'healthy';

        const progressColor = stat.isExpired ? '#dc3545'
            : stat.isCritical ? '#ff5252'
            : stat.isLow ? '#ff9800'
            : stat.percentUsed > 70 ? '#ffc107'
            : '#4a7c5e';

        return `
        <div class="supply-card supply-${urgencyClass}" data-supply-id="${supply.id}">
            <div class="supply-card-header">
                <div class="supply-emoji">${supply.emoji}</div>
                <div class="supply-info">
                    <div class="supply-name">
                        ${supply.name}
                        ${stat.isCritical || stat.isLow ? `<span class="badge-low-stock ${stat.isCritical ? 'badge-critical' : ''}">Low Stock</span>` : ''}
                    </div>
                    <div class="supply-meta">${supply.quantity} ${supply.unit} — ${currency(supply.price)}</div>
                </div>
                <div class="supply-actions">
                    <button class="supply-action-btn btn-finish-supply" data-id="${supply.id}" title="Mark as finished">✅</button>
                    <button class="supply-action-btn btn-refill-supply" data-id="${supply.id}" title="Quick Refill">🔄</button>
                    <button class="supply-action-btn btn-delete-supply" data-id="${supply.id}" title="Delete">🗑️</button>
                </div>
            </div>

            <div class="supply-progress-section">
                <div class="supply-progress-bar">
                    <div class="supply-progress-fill" style="width: ${Math.min(100, stat.percentUsed)}%; background: ${progressColor}"></div>
                </div>
                <div class="supply-progress-text">
                    <span>Day ${stat.daysElapsed} of ~${stat.totalDays}</span>
                    <span class="supply-days-left ${urgencyClass}">
                        ${stat.isExpired ? '⚠️ Overdue!' : `${stat.daysRemaining} days left`}
                    </span>
                </div>
            </div>

            <div class="supply-stats">
                <div class="supply-stat">
                    <span class="stat-label">📅 Bought</span>
                    <span class="stat-value">${formatDate(supply.purchaseDate)}</span>
                </div>
                <div class="supply-stat">
                    <span class="stat-label">🔄 Refill by</span>
                    <span class="stat-value stat-refill-date ${urgencyClass}">${formatDate(stat.predictedRefillDate)}</span>
                </div>
                <div class="supply-stat">
                    <span class="stat-label">💰 Cost/day</span>
                    <span class="stat-value">${currencyDecimal(stat.costPerDay)}</span>
                </div>
                ${getPeopleCount() > 1 ? `
                <div class="supply-stat">
                    <span class="stat-label">👤 Per person/day</span>
                    <span class="stat-value">${currencyDecimal(stat.costPerPerson)}</span>
                </div>
                ` : ''}
            </div>

            ${supply.history.length > 0 ? `
            <div class="supply-history-badge">
                🧠 Predicted from ${supply.history.length} past purchase${supply.history.length > 1 ? 's' : ''}
            </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

// ── BILLS CARDS ──────────────────────────────────────────────

/**
 * Render one-time bills into the grid
 * @param {HTMLElement} container - #bills-grid
 * @param {Array} bills - from getBills()
 */
export function renderBills(container, bills) {
    if (!bills || bills.length === 0) {
        container.innerHTML = `
            <div class="empty-supply-state">
                <div class="empty-title">No one-time bills yet</div>
                <div class="empty-desc">Add electricity, gas, or other fixed expenses here.</div>
            </div>
        `;
        return;
    }

    // Only show recent bills in the grid
    container.innerHTML = bills.slice(0, 10).map(bill => {
        return `
        <div class="supply-card" style="padding: 16px;">
            <div class="supply-card-header" style="margin-bottom: 0px; padding-bottom: 0px; border-bottom: none;">
                <div class="supply-emoji">${bill.emoji}</div>
                <div class="supply-info">
                    <div class="supply-name">${bill.name}</div>
                    <div class="supply-meta">${formatDate(bill.date)} — ${currency(bill.price)}</div>
                </div>
                <div class="supply-actions">
                    <button class="supply-action-btn btn-delete-bill" data-id="${bill.id}" title="Delete">🗑️</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}


// ── ALERTS & SHOPPING LIST ───────────────────────────────────

/**
 * Render low-supply alert banners and Auto Shopping List
 * @param {HTMLElement} container - #alerts-container
 * @param {Array} alerts - from getAlerts()
 */
export function renderAlerts(container, alerts) {
    if (alerts.length === 0) {
        container.innerHTML = '';
        return;
    }

    let html = alerts.map(s => {
        const stat = s.status_calc;
        const isExpired = stat.isExpired;
        return `
        <div class="alert-banner ${isExpired ? 'alert-expired' : 'alert-low'}">
            <span class="alert-icon">${isExpired ? '🚨' : '⚠️'}</span>
            <span class="alert-text">
                <strong>${s.emoji} ${s.name}</strong>
                ${isExpired
                    ? '— should have run out! Time to refill.'
                    : `— only ${stat.daysRemaining} day(s) remaining.`
                }
            </span>
        </div>
        `;
    }).join('');

    // Add Shopping List Card
    const listItems = alerts.map(a => `- ${a.emoji} ${a.name} (Need ${a.quantity} ${a.unit})`).join('\n');
    const waText = encodeURIComponent(`*🛒 Hostel Shopping List:*\n\n${listItems}\n\n_Auto-generated by Hostel Supply Tracker_`);
    
    html += `
        <div class="shopping-list-card">
            <div class="sl-header">
                <strong>🛒 Auto Shopping List</strong>
                <a href="https://wa.me/?text=${waText}" target="_blank" class="btn-whatsapp">
                    Share to WhatsApp 💬
                </a>
            </div>
            <pre class="sl-content">${listItems}</pre>
        </div>
    `;

    container.innerHTML = html;
}


// ── MONTHLY SUMMARY ──────────────────────────────────────────

/**
 * Render monthly expense summary cards with a Budget Health Bar
 * @param {HTMLElement} container - #summary-cards
 * @param {Object|null} summary - from getMonthlySummary()
 */
export function renderSummary(container, summary) {
    if (!summary || summary.items.length === 0) {
        container.innerHTML = `
            <div class="empty-supply-state" style="padding: 24px;">
                <div class="empty-desc">Add supplies to see your monthly expense summary.</div>
            </div>
        `;
        return;
    }

    const budget = summary.budget || 50000; // default 50k PKR if not set
    const spent = summary.totalMonthly;
    const remains = budget - spent;
    const healthPercent = Math.min(100, (spent / budget) * 100);
    const healthColor = healthPercent > 90 ? '#ef4444' : healthPercent > 70 ? '#f59e0b' : '#10b981';

    const topExpense = summary.topExpense;
    const topPct = summary.totalMonthly > 0
        ? Math.round((topExpense.monthly / summary.totalMonthly) * 100)
        : 0;

    container.innerHTML = `
        <div class="budget-health-card" data-animate>
            <div class="bh-header">
                <div class="bh-info">
                    <div class="bh-label">Monthly Spending Health</div>
                    <div class="bh-spent">${currency(spent)} <span class="bh-total">/ ${currency(budget)}</span></div>
                </div>
                <div class="bh-status" style="color: ${healthColor}">
                    ${remains >= 0 ? `${currency(remains)} left` : `${currency(Math.abs(remains))} over!`}
                </div>
            </div>
            <div class="bh-bar-wrap">
                <div class="bh-bar" style="width: ${healthPercent}%; background: ${healthColor};"></div>
            </div>
            <div class="bh-footer">
                ${remains >= 0 
                  ? `✨ You're within budget! Great job.` 
                  : `🚨 You've exceeded the budget for this month.`}
            </div>
        </div>

        <div class="summary-total-card" style="${summary.isArchive ? 'border-color: var(--amber)' : ''}">
            <div class="stc-label">${summary.isArchive ? 'Actual Monthly Total' : 'Est. Monthly Total'}</div>
            <div class="stc-value">${currency(summary.totalMonthly)}</div>
            <div class="stc-label" style="font-size: 0.7rem; margin-top: 4px; opacity: 0.8;">
                ${summary.isArchive ? 'Direct sum of everything bought this month' : 'Predicted based on daily usage rates'}
            </div>
            ${summary.roommates && summary.roommates.length > 1 ? `
                <div class="stc-splits">
                    <div class="split-title">Per Person (${currency(summary.perPerson)})</div>
                    <div class="split-badges">
                        ${summary.roommates.map(r => `<span class="split-badge">${r.name}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>

        <div class="summary-breakdown">
            ${summary.items.map(item => {
                const pct = summary.totalMonthly > 0
                    ? Math.round((item.monthly / summary.totalMonthly) * 100)
                    : 0;
                return `
                <div class="summary-row">
                    <span class="sr-name" style="display:flex; flex-direction:column;">
                        <span>${item.emoji} ${item.name}</span>
                        ${item.type ? `<small style="font-size:0.6rem; opacity:0.6;">${item.type}</small>` : ''}
                    </span>
                    <div class="sr-bar-wrap">
                        <div class="sr-bar" style="width: ${pct}%"></div>
                    </div>
                    <span class="sr-amount">${currency(item.monthly)}${summary.isArchive ? '' : '/mo'}</span>
                    <span class="sr-pct">${pct}%</span>
                </div>
                `;
            }).join('')}
        </div>

        ${topExpense ? `
        <div class="summary-top-expense">
            🏆 Top expense: <strong>${topExpense.emoji} ${topExpense.name}</strong> (${topPct}% of total)
        </div>
        ` : ''}
    `;

    updateSummaryChart(summary);
    renderSettlement(document.getElementById('settlement-dashboard'), summary);
}


// ── SETTLEMENT DASHBOARD ─────────────────────────────────────

/**
 * Render roommate settlement balances
 * @param {HTMLElement} container - #settlement-dashboard
 * @param {Object} summary - with summary.settlement from tracker
 */
export function renderSettlement(container, summary) {
    if (!container) return;
    
    const s = summary.settlement;
    if (!s || s.roommates.length <= 1) {
        container.innerHTML = '';
        return;
    }

    const isArchive = summary.isArchive;
    const title = isArchive ? 'Settlement for this Month' : 'Current Month\'s Balance Sheet';
    const subtitle = isArchive ? 'Exact amounts spent on shopping & bills' : 'Based on purchases in the last 30 days';

    container.innerHTML = `
        <div class="supply-section-card" style="border: 2px solid var(--tan); padding: 24px; border-radius: var(--radius);">
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 700; font-size: 1.1rem; color: var(--moss);">${title}</div>
                <div style="font-size: 0.75rem; color: var(--muted);">${subtitle}</div>
            </div>

            <div class="settlement-grid" style="display: grid; gap: 12px;">
                ${s.roommates.map(r => {
                    const isPlus = r.balance >= 0;
                    return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(0,0,0,0.02); border-radius: var(--radius-sm);">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 600;">${r.name}</span>
                            <span style="font-size: 0.7rem; color: var(--muted);">Paid: ${currency(r.paid)}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 700; color: ${isPlus ? 'var(--moss)' : 'var(--red)'}">
                                ${isPlus ? '+' : ''}${currency(r.balance)}
                            </div>
                            <span style="font-size: 0.65rem; color: var(--muted);">
                                ${isPlus ? 'Collect' : 'Owes'}
                            </span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>

            <div style="margin-top: 20px; padding: 16px; background: rgba(74, 124, 94, 0.05); border-radius: var(--radius-sm); font-size: 0.82rem; line-height: 1.5;">
                <div style="font-weight: 700; margin-bottom: 4px;">🤝 How to settle:</div>
                ${generateSettlementInstructions(s)}
            </div>
        </div>
    `;
}

function generateSettlementInstructions(s) {
    const sorted = [...s.roommates].sort((a,b) => b.balance - a.balance);
    const payers = sorted.filter(r => r.balance < -1); // Tolerate slight rounding
    const receivers = sorted.filter(r => r.balance > 1);

    if (payers.length === 0) return 'Everyone is perfectly settled! No dues.';

    let html = '';
    // Simple greedy settlement
    let i = 0; // payers index
    let j = 0; // receivers index
    
    const pTemp = payers.map(p => ({...p}));
    const rTemp = receivers.map(r => ({...r}));

    while (i < pTemp.length && j < rTemp.length) {
        const payAmt = Math.abs(pTemp[i].balance);
        const recvAmt = rTemp[j].balance;
        
        const settled = Math.min(payAmt, recvAmt);
        html += `<div style="margin-bottom: 4px;">• <strong>${pTemp[i].name}</strong> needs to pay <strong>${rTemp[j].name}</strong> ${currency(settled)}</div>`;
        
        pTemp[i].balance += settled;
        rTemp[j].balance -= settled;
        
        if (Math.abs(pTemp[i].balance) < 1) i++;
        if (Math.abs(rTemp[j].balance) < 1) j++;
    }

    return html;
}

function updateSummaryChart(summary) {
    const chartContainer = document.getElementById('chart-container');
    const ctx = document.getElementById('summaryChart');
    if (!ctx) return;

    if (!summary || summary.items.length === 0) {
        chartContainer.style.display = 'none';
        return;
    }

    chartContainer.style.display = 'block';
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#a8d4b8' : '#6b5e52';

    const labels = summary.items.map(i => `${i.emoji} ${i.name}`);
    const data = summary.items.map(i => i.monthly);
    
    // Vibrant colors matching the design system
    const colors = ['#d4782a', '#4a7c5e', '#ffc107', '#17a2b8', '#dc3545', '#6f42c1', '#28a745', '#fd7e14'];

    if (supplyChart) {
        supplyChart.destroy();
    }

    supplyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: isDark ? '#2a1a1a' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: "'Outfit', sans-serif", size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' ' + currency(context.raw);
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}


// ── REFILL TIMELINE ──────────────────────────────────────────

/**
 * Render upcoming refill visual timeline
 * @param {HTMLElement} container - #timeline-container
 * @param {Array} refills - from getUpcomingRefills()
 */
export function renderTimeline(container, refills) {
    if (refills.length === 0) {
        container.innerHTML = `
            <div class="empty-supply-state" style="padding: 24px;">
                <div class="empty-desc">No upcoming refills to show.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="visual-timeline-scroll">
            <div class="visual-timeline">
                ${refills.map((r, i) => {
                    const urgencyClass = r.isExpired ? 'expired' : r.isLow ? 'low' : 'normal';
                    return `
                    <div class="vt-item ${urgencyClass}" style="animation-delay: ${i * 80}ms">
                        <div class="vt-date">${formatDate(r.refillDate)}</div>
                        <div class="vt-connector"></div>
                        <div class="vt-card">
                            <div class="vt-emoji">${r.emoji}</div>
                            <div class="vt-name">${r.name}</div>
                            <div class="vt-days">
                                ${r.isExpired ? '🚨 Overdue'
                                    : r.daysRemaining === 0 ? 'Today!'
                                    : r.daysRemaining === 1 ? 'Tomorrow'
                                    : `${r.daysRemaining} days`
                                }
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}


// ── PURCHASE HISTORY ─────────────────────────────────────────

/**
 * Render purchase history list
 * @param {HTMLElement} container - #history-list
 * @param {Array} finished - from getFinishedSupplies()
 */
export function renderHistory(container, finished) {
    if (finished.length === 0) {
        container.innerHTML = `
            <div class="empty-supply-state" style="padding: 24px;">
                <div class="empty-desc">Completed supplies will appear here.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = finished.slice(0, 20).map(s => {
        const lastHistory = s.history[s.history.length - 1];
        return `
        <div class="history-item">
            <div class="hi-emoji">${s.emoji}</div>
            <div class="hi-info">
                <div class="hi-name">${s.name}</div>
                <div class="hi-meta">${s.quantity} ${s.unit} — ${currency(s.price)}</div>
            </div>
            <div class="hi-stats" style="flex: 1; text-align: right; padding-right: 8px;">
                <div class="hi-duration">${lastHistory ? lastHistory.duration : '?'} days</div>
                <div class="hi-date">${formatDate(s.purchaseDate)} → ${formatDate(s.finishedDate)}</div>
            </div>
            <button class="btn-delete-history" data-id="${s.id}" title="Delete history record" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1.1rem; padding: 4px;">🗑️</button>
        </div>
        `;
    }).join('');
}


// ── TOAST ────────────────────────────────────────────────────

/**
 * Show a toast notification
 * @param {string} message
 * @param {string} type - 'warning' | 'success' | 'info'
 */
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.textContent = icon + '  ' + message;
    toast.hidden = false;
    toast.className = `toast toast-${type}`;
    toast.classList.add('toast-visible');

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => { toast.hidden = true; }, 350);
    }, 3000);
}
