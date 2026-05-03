// ============================================================
//  validator.js — input parsing, clamping, guards
//  calculator.js aur ui.js dono yahan se import karte hain
// ============================================================

/**
 * Safely parse a form input value to a non-negative number.
 * Returns 0 for empty, NaN, or negative values.
 * @param {string|number} value
 * @returns {number}
 */
export function parseInput(value) {
    const n = parseFloat(value);
    return isNaN(n) || n < 0 ? 0 : n;
}

/**
 * Check if at least one cost field has a positive value.
 * @param {Object} formData
 * @returns {boolean}
 */
export function hasAnyValue(formData) {
    return Object.values(formData).some(v => parseInput(v) > 0);
}

/**
 * Read all form inputs and return a plain formData object.
 * @param {HTMLFormElement} form
 * @returns {Object}
 */
export function getFormData(form) {
    const data = {};
    form.querySelectorAll('input[type="number"]').forEach(input => {
        data[input.id] = input.value;
    });
    return data;
}
