// ============================================================
//  supplyMain.js — Entry point for Supply Tracker page
//  All event wiring and orchestration.
// ============================================================

import {
    loadData,
    loadDataFromMongoDB,
    saveData,
    addSupply,
    finishSupply,
    deleteSupply,
    getActiveSupplies,
    getFinishedSupplies,
    getBills,
    addBill,
    deleteBill,
    getMonthlySummary,
    getUpcomingRefills,
    getAlerts,
    getPeopleCount,
    getRoommates,
    addRoommate,
    removeRoommate,
    getNotificationsEnabled,
    setNotificationsEnabled,
    requestNotificationPermission,
    checkAndNotify,
    getAvailableMonths,
    getArchivedSummary,
    getBudget,
    setBudget,
    SMART_USAGE_MAP,
    calculateDailyRate,
} from './supplyTracker.js';

import {
    renderSupplyCards,
    renderAlerts,
    renderSummary,
    renderTimeline,
    renderHistory,
    renderBills,
    showToast,
} from './supplyUI.js';

import { cyberAudio } from './audio.js';
import { getCurrency, setCurrency, updateExchangeRates } from './sharedCurrency.js';

// ── DOM Refs ─────────────────────────────────────────────────

const supplyGrid = document.getElementById('supply-grid');
const alertsContainer = document.getElementById('alerts-container');
const summaryCards = document.getElementById('summary-cards');
const timelineContainer = document.getElementById('timeline-container');
const historyList = document.getElementById('history-list');
const supplyModal = document.getElementById('supply-modal');
const supplyForm = document.getElementById('supply-form');
const btnAddSupply = document.getElementById('btn-add-supply');
const btnCloseModal = document.getElementById('btn-close-supply-modal');

const billsGrid = document.getElementById('bills-grid');
const btnAddBill = document.getElementById('btn-add-bill');
const billModal = document.getElementById('bill-modal');
const billForm = document.getElementById('bill-form');
const btnCloseBillModal = document.getElementById('btn-close-bill-modal');

const themeToggle = document.getElementById('theme-toggle');
const currencySelect = document.getElementById('currency-select');
const roommatesList = document.getElementById('roommates-list');
const monthSelect = document.getElementById('archive-month-select');
const supplyPaidBy = document.getElementById('supply-paid-by');
const billPaidBy = document.getElementById('bill-paid-by');
const addRoommateForm = document.getElementById('add-roommate-form');
const newRoommateName = document.getElementById('new-roommate-name');
const notifToggle = document.getElementById('notification-toggle');
const notifStatusEl = document.getElementById('notif-status');
const btnBackToTop = document.getElementById('btn-back-to-top');
const audioToggle = document.getElementById('audio-toggle');
const notificationToggle = document.getElementById('notification-toggle');
const budgetInput = document.getElementById('budget-input');

// ── Theme ────────────────────────────────────────────────────

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
}

// ── Paid By Select Helper ────────────────────────────────────

function populatePaidBySelect(selectEl) {
    if (!selectEl) return;
    const people = getRoommates();
    selectEl.innerHTML = people.map(r => `
        <option value="${r.id}">${r.name}</option>
    `).join('');
}


// ── Render All ───────────────────────────────────────────────

function renderRoommates() {
    const roommates = getRoommates();
    roommatesList.innerHTML = roommates.map(r => `
        <div class="roommate-chip">
            <span>${r.name}</span>
            <button type="button" class="rm-remove" data-id="${r.id}">&times;</button>
        </div>
    `).join('');
}

function updateMonthOptions() {
    const currentVal = monthSelect.value;
    const months = getAvailableMonths();
    
    // Keep "Current" and clear others
    monthSelect.innerHTML = '<option value="current">Current (Predicted)</option>';
    
    months.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.value;
        opt.textContent = m.label;
        monthSelect.appendChild(opt);
    });
    
    // Restore selection if possible
    if (currentVal) monthSelect.value = currentVal;
}

function renderAll() {
    const selectedMonth = monthSelect ? monthSelect.value : 'current';
    
    const active = getActiveSupplies();
    const finished = getFinishedSupplies();
    const refills = getUpcomingRefills();
    const alerts = getAlerts();

    let summary;
    if (selectedMonth === 'current' || !selectedMonth) {
        summary = getMonthlySummary();
    } else {
        summary = getArchivedSummary(selectedMonth);
    }

    renderSupplyCards(supplyGrid, active);
    renderBills(billsGrid, getBills());
    renderAlerts(alertsContainer, alerts);
    renderSummary(summaryCards, summary);
    renderTimeline(timelineContainer, refills);
    renderHistory(historyList, finished);

    // Update people count display
    renderRoommates();
    updateMonthOptions();

    // Check for alerts
    if (getNotificationsEnabled()) {
        checkAndNotify();
    }
}

// ── Audio Toggle State (Moved up for robustness) ───────────
if (audioToggle) {
    audioToggle.addEventListener('click', () => {
        const isMuted = cyberAudio.toggleMute();
        audioToggle.textContent = isMuted ? '🔇' : '🔊';
        if (!isMuted) cyberAudio.playDigital();
    });
    audioToggle.textContent = cyberAudio.isMuted ? '🔇' : '🔊';
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
loadData();

// ── Currency Select ──────────────────────────────────────────
// Sync selector with saved currency (shared with habit page)
if (currencySelect) {
    currencySelect.value = getCurrency();
    currencySelect.addEventListener('change', () => {
        setCurrency(currencySelect.value);
        renderAll();
        cyberAudio.playDigital();
    });
}

// Update notification UI
const notifEnabled = getNotificationsEnabled();
if (notifStatusEl) notifStatusEl.textContent = notifEnabled ? 'On ✅' : 'Enable';
if (notifToggle) notifToggle.classList.toggle('active', notifEnabled);

// Set today as default purchase date
const dateInput = document.getElementById('supply-date');
if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

// Initialize budget input
if (budgetInput) {
    budgetInput.value = getBudget();
    budgetInput.addEventListener('change', (e) => {
        setBudget(e.target.value);
        renderAll();
        showToast('💰 Budget updated!', 'success');
        cyberAudio.playDigital();
    });
}

renderAll();

// Check notifications on load
if (notifEnabled) {
    setTimeout(() => checkAndNotify(), 2000);
}

// Load from MongoDB in background (may have newer data)
loadDataFromMongoDB().then(mongoResult => {
    if (mongoResult) {
        // Re-render with fresh MongoDB data
        if (budgetInput) budgetInput.value = getBudget();
        renderAll();
        console.log('🔄 Supply data synced from MongoDB');
    }
});

// Fetch live rates in background
updateExchangeRates().then(updated => {
    if (updated) {
        renderAll();
        showToast('🔄 Live exchange rates updated!', 'success');
    }
});

// ── Smart Usage Calculator State ─────────────────────────────

let activePresetKey = null; // e.g. 'flour', 'rice', etc.

const smartInput = document.getElementById('supply-smart-input');
const smartLabel = document.getElementById('smart-input-label');
const smartHint = document.getElementById('smart-hint');
const smartResult = document.getElementById('smart-result');
const rateHidden = document.getElementById('supply-rate');

/**
 * Update the smart usage section for a given preset key
 */
function showSmartCalculator(key) {
    const config = SMART_USAGE_MAP[key];
    if (!config) {
        // Custom item — show raw input
        activePresetKey = null;
        smartLabel.textContent = 'Daily usage (in unit/day)';
        smartInput.placeholder = '0.5';
        smartInput.value = '';
        smartHint.textContent = 'per person per day';
        smartResult.hidden = true;
        rateHidden.value = '';
        return;
    }

    activePresetKey = key;
    smartLabel.textContent = config.question;
    smartInput.placeholder = String(config.defaultAnswer);
    smartInput.value = config.defaultAnswer;
    smartInput.min = '1';
    smartInput.step = '1';
    smartHint.textContent = config.explanation;

    // Calculate immediately with default answer
    updateSmartResult(config.defaultAnswer);
}

/**
 * Compute and display the auto-calculated result
 */
function updateSmartResult(answer) {
    if (!activePresetKey || !answer || answer <= 0) {
        smartResult.hidden = true;
        rateHidden.value = '';
        return;
    }

    const config = SMART_USAGE_MAP[activePresetKey];
    const dailyRate = calculateDailyRate(activePresetKey, parseFloat(answer));
    const dailyGrams = parseFloat(answer) * config.gramsPerUnit;
    const totalDailyGrams = config.perWeek ? (dailyGrams / 7) : dailyGrams;
    const people = getPeopleCount();

    // Set the hidden rate field
    rateHidden.value = dailyRate.toFixed(4);

    // Show calculated result
    let resultText = '';
    if (config.mlBased) {
        resultText = `= ${Math.round(totalDailyGrams)}ml/person/day = <strong>${(dailyRate * people).toFixed(2)} litres/day</strong> (${people} person${people > 1 ? 's' : ''})`;
    } else if (config.packSize) {
        resultText = `= ${Math.round(totalDailyGrams)}g/person/day = <strong>${(dailyRate * people).toFixed(3)} packs/day</strong> (${people} person${people > 1 ? 's' : ''})`;
    } else {
        resultText = `= ${Math.round(totalDailyGrams)}g/person/day = <strong>${Math.round(dailyRate * people * 1000)}g/day</strong> (${people} person${people > 1 ? 's' : ''})`;
    }

    // Predict how long quantity will last
    const qty = parseFloat(document.getElementById('supply-qty').value);
    if (qty > 0) {
        const totalRate = dailyRate * people;
        const days = Math.ceil(qty / totalRate);
        resultText += `<br>📦 ${qty} ${config.unit} will last ~<strong>${days} days</strong>`;
    }

    smartResult.innerHTML = resultText;
    smartResult.hidden = false;
}

// Live update when smart input changes
smartInput.addEventListener('input', () => {
    const val = parseFloat(smartInput.value);
    if (activePresetKey) {
        updateSmartResult(val);
    } else {
        // Custom item — just set the hidden rate directly
        rateHidden.value = val > 0 ? val : '';
        smartResult.hidden = true;
    }
});

// Also update when quantity changes (to show predicted days)
document.getElementById('supply-qty').addEventListener('input', () => {
    if (activePresetKey && smartInput.value) {
        updateSmartResult(parseFloat(smartInput.value));
    }
});

// ── Add Supply ───────────────────────────────────────────────

btnAddSupply.addEventListener('click', () => {
    // Reset form
    supplyForm.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    activePresetKey = null;
    // Remove active class from presets
    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    showSmartCalculator(null); // reset to custom
    populatePaidBySelect(supplyPaidBy);
    supplyModal.showModal();
});


btnCloseModal.addEventListener('click', () => {
    supplyModal.close();
});

// Preset chips
document.getElementById('preset-grid').addEventListener('click', (e) => {
    const chip = e.target.closest('.preset-chip');
    if (!chip) return;

    const key = chip.dataset.key;

    // Toggle active state
    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    // Fill form fields
    document.getElementById('supply-name').value = chip.dataset.name;
    document.getElementById('supply-emoji').value = chip.dataset.emoji;
    document.getElementById('supply-unit').value = chip.dataset.unit;

    // Show smart calculator for this item
    showSmartCalculator(key);
});

// Form submit
supplyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('supply-name').value.trim();
    const emoji = document.getElementById('supply-emoji').value.trim() || '📦';
    const quantity = parseFloat(document.getElementById('supply-qty').value);
    const unit = document.getElementById('supply-unit').value;
    const price = parseFloat(document.getElementById('supply-price').value);
    const purchaseDate = document.getElementById('supply-date').value;
    const dailyRate = parseFloat(rateHidden.value) || 0;
    const paidById = supplyPaidBy.value;

    // ── Validation ──────────────────────────────────────────
    if (!name) {
        showToast('⚠️ Item name is required!', 'warning');
        document.getElementById('supply-name').focus();
        cyberAudio.playError();
        return;
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
        showToast('⚠️ Quantity must be greater than zero!', 'warning');
        document.getElementById('supply-qty').focus();
        cyberAudio.playError();
        return;
    }
    if (!price || isNaN(price) || price <= 0) {
        showToast('⚠️ Price must be greater than zero!', 'warning');
        document.getElementById('supply-price').focus();
        cyberAudio.playError();
        return;
    }
    if (!purchaseDate) {
        showToast('⚠️ Purchase date is required!', 'warning');
        document.getElementById('supply-date').focus();
        cyberAudio.playError();
        return;
    }
    // Prevent future dates
    const today = new Date().toISOString().split('T')[0];
    if (purchaseDate > today) {
        showToast('⚠️ Purchase date cannot be in the future!', 'warning');
        cyberAudio.playError();
        return;
    }

    addSupply({
        name,
        emoji,
        quantity,
        unit,
        price,
        purchaseDate,
        dailyRate,
        paidById
    });

    supplyModal.close();
    renderAll();
    showToast(`${emoji} ${name} added!`, 'success');
    cyberAudio.playSuccess();
});

// ── Add Bill Logic ───────────────────────────────────────────

btnAddBill.addEventListener('click', () => {
    billForm.reset();
    document.getElementById('bill-date').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('#bill-preset-grid .preset-chip').forEach(c => c.classList.remove('active'));
    populatePaidBySelect(billPaidBy);
    billModal.showModal();
});


btnCloseBillModal.addEventListener('click', () => {
    billModal.close();
});

document.getElementById('bill-preset-grid').addEventListener('click', (e) => {
    const chip = e.target.closest('.preset-chip');
    if (!chip) return;

    document.querySelectorAll('#bill-preset-grid .preset-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    document.getElementById('bill-name').value = chip.dataset.name;
    document.getElementById('bill-emoji').value = chip.dataset.emoji;
});

billForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('bill-name').value.trim();
    const emoji = document.getElementById('bill-emoji').value.trim();
    const price = document.getElementById('bill-price').value;
    const date = document.getElementById('bill-date').value;
    const paidById = billPaidBy.value;

    if (!name || !price || !date) {
        showToast('Please fill all required fields!', 'warning');
        return;
    }

    addBill({ name, emoji, price, date, paidById });


    billModal.close();
    renderAll();
    showToast(`${emoji} ${name} bill added!`, 'success');
});

// ── Bill Card Actions ────────────────────────────────────────

billsGrid.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete-bill');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        deleteBill(id);
        renderAll();
        showToast('🗑️ Bill removed.', 'info');
        cyberAudio.playDigital();
    }
});

supplyGrid.addEventListener('click', (e) => {
    const finishBtn = e.target.closest('.btn-finish-supply');
    if (finishBtn) {
        const id = finishBtn.dataset.id;
        const result = finishSupply(id);
        if (result) {
            renderAll();
            showToast(`✅ ${result.supply.name} marked as finished (${result.actualDays} days)`, 'success');
            cyberAudio.playSuccess();
        }
        return;
    }

    const refillBtn = e.target.closest('.btn-refill-supply');
    if (refillBtn) {
        const id = refillBtn.dataset.id;
        const supply = getActiveSupplies().find(s => s.id === id);
        if (supply) {
            // Find if there's a matching preset key by emoji/name to activate smart calculator
            const presetChip = Array.from(document.querySelectorAll('.preset-chip')).find(c => c.dataset.name === supply.name || c.dataset.emoji === supply.emoji);
            
            // Re-open form with old data, but today's date
            supplyForm.reset();
            dateInput.value = new Date().toISOString().split('T')[0];
            
            document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
            if (presetChip) {
                presetChip.classList.add('active');
                showSmartCalculator(presetChip.dataset.key);
            } else {
                showSmartCalculator(null);
            }

            document.getElementById('supply-name').value = supply.name;
            document.getElementById('supply-emoji').value = supply.emoji;
            document.getElementById('supply-qty').value = supply.quantity;
            document.getElementById('supply-unit').value = supply.unit;
            document.getElementById('supply-price').value = supply.price;
            
            // We do NOT call finishSupply here. We just let them fill the form.
            // When they click "Add Supply", it will just add a new active supply.
            // Wait, if they refill, usually they also finished the old one. We'll let them manually check 'finish' or they can double up tracking.
            // Realistically, to quick-refill automatically means finish old + create new. 
            // In our case, clicking Add will duplicate. So we should maybe mark the old as finished?
            // Yes, let's mark the old one as finished automatically if they click this and hit submit. But that's complicated to track.
            // Let's just finish it now, and open the modal for the new one.
            const result = finishSupply(id);
            if (result) {
                showToast(`✅ Old ${supply.name} marked as finished. Now entering new purchase.`, 'info');
                supplyModal.showModal();
            }
        }
        return;
    }

    const deleteBtn = e.target.closest('.btn-delete-supply');
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (confirm('Are you sure you want to delete this supply?')) {
            deleteSupply(id);
            renderAll();
            showToast('🗑️ Supply removed.', 'info');
            cyberAudio.playDigital();
        }
        return;
    }
});

// ── Purchase History Actions ─────────────────────────────────

historyList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete-history');
    if (deleteBtn) {
        if (confirm("Are you sure you want to permanently delete this history record?")) {
            const id = deleteBtn.dataset.id;
            deleteSupply(id);
            renderAll();
            showToast('🗑️ History record removed.', 'info');
            cyberAudio.playDigital();
        }
    }
});

// ── Roommates (Split Cost) ───────────────────────────────────

addRoommateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newRoommateName.value.trim();
    if (name) {
        addRoommate(name);
        newRoommateName.value = '';
        renderAll();
        cyberAudio.playClick();
    }
});

roommatesList.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.rm-remove');
    if (removeBtn) {
        const id = parseInt(removeBtn.dataset.id);
        removeRoommate(id);
        renderAll();
        cyberAudio.playDigital();
    }
});

// ── Notifications ────────────────────────────────────────────

notifToggle.addEventListener('click', async () => {
    if (getNotificationsEnabled()) {
        // Disable
        setNotificationsEnabled(false);
        notifStatusEl.textContent = 'Enable';
        notifToggle.classList.remove('active');
        showToast('🔕 Notifications disabled.', 'info');
        cyberAudio.playDigital();
    } else {
        // Enable
        const granted = await requestNotificationPermission();
        if (granted) {
            setNotificationsEnabled(true);
            notifStatusEl.textContent = 'On ✅';
            notifToggle.classList.add('active');
            showToast('🔔 Notifications enabled! You\'ll be alerted when supplies run low.', 'success');
            checkAndNotify();
            cyberAudio.playSuccess();
        } else {
            showToast('❌ Notification permission denied by browser.', 'warning');
            cyberAudio.playError();
        }
    }
});

// ── Theme Toggle ─────────────────────────────────────────────

themeToggle.addEventListener('click', toggleTheme);

// ── Export CSV ───────────────────────────────────────────────

const btnExportCsv = document.getElementById('btn-export-csv');
if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
        const active = getActiveSupplies();
        const finished = getFinishedSupplies();
        const all = [...active, ...finished];
        
        if (all.length === 0) {
            showToast('No data to export!', 'warning');
            return;
        }
        
        const headers = ['Item Name', 'Status', 'Quantity', 'Unit', 'Price (PKR)', 'Purchase Date', 'Finished Date', 'Est. Daily Rate'];
        const rows = all.map(s => [
            s.name, 
            s.status, 
            s.quantity, 
            s.unit, 
            s.price, 
            s.purchaseDate, 
            s.finishedDate || 'N/A', 
            s.dailyRatePerPerson.toFixed(3)
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `hostel_supplies_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('CSV Exported Successfully!', 'success');
    });
}

// ── Export PDF ───────────────────────────────────────────────

const btnExportPdf = document.getElementById('btn-export-pdf');
if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
        const active = getActiveSupplies();
        const finished = getFinishedSupplies();
        const all = [...active, ...finished];
        
        if (all.length === 0) {
            showToast('No data to export!', 'warning');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            showToast('PDF library loading, please wait...', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add Title
        doc.setFontSize(18);
        doc.text('Hostel Supply Tracker Report', 14, 22);
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        const headers = [['Item', 'Status', 'Qty', 'Price (PKR)', 'Bought', 'Finished']];
        const data = all.map(s => [
            s.name, 
            s.status === 'active' ? 'Active' : 'Finished', 
            `${s.quantity} ${s.unit}`, 
            s.price.toString(), 
            s.purchaseDate, 
            s.finishedDate || '-' 
        ]);

        doc.autoTable({
            startY: 36,
            head: headers,
            body: data,
            theme: 'grid',
            headStyles: { fillColor: [74, 124, 94] }, // Moss green matching the app theme
            alternateRowStyles: { fillColor: [245, 246, 241] }, // Paper color
            styles: { fontSize: 10, cellPadding: 4 }
        });

        doc.save(`hostel_supplies_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('PDF Exported Successfully!', 'success');
    });
}

// ── Archive Filter ───────────────────────────────────────────

if (monthSelect) {
    monthSelect.addEventListener('change', () => {
        renderAll();
    });
}

// ── Back to Top ──────────────────────────────────────────────

if (btnBackToTop) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btnBackToTop.classList.add('visible');
        } else {
            btnBackToTop.classList.remove('visible');
        }
    }, { passive: true });

    btnBackToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ── Keyboard Shortcuts ───────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && supplyModal.open) {
        supplyModal.close();
    }
});

// ── Auto-refresh every 60 seconds (update timers) ────────────

setInterval(() => {
    renderAll();
}, 60000);

// ── Tactile Audio Feedback (Event Delegation) ───────────────

document.addEventListener('click', (e) => {
    // 1. Digital Sweep for navigation links
    if (e.target.closest('.nav-link')) {
        cyberAudio.playDigital();
    }

    // 2. Click sound for primary actions
    const clickSelectors = [
        '.btn-calculate',
        '.btn-reset',
        '.add-supply-card',
        '.btn-add-supply',
        '.preset-chip',
        '.rm-remove',
        '.btn-finish-supply',
        '.btn-refill-supply',
        '.btn-delete-supply',
        '.btn-delete-bill',
        '.btn-back-to-top',
        '.btn-export',
        '.theme-toggle',
        '.notification-toggle',
        '.btn-whatsapp'
    ].join(',');

    if (e.target.closest(clickSelectors)) {
        cyberAudio.playClick();
    }
});
