// ============================================================
//  calculator.js — pure math only, zero DOM touches
//  Yahan koi document.getElementById nahi hoga.
//  Input lo, calculated object return karo. That's it.
// ============================================================

import { parseInput } from './validator.js';
import { DEFAULT_RATES } from './constants.js';

/**
 * Calculate future value of a series of monthly payments (Annuity)
 * formula: FV = P * [((1 + i)^n - 1) / i]
 * @param {number} monthlyAmount - regular payment
 * @param {number} annualRate   - yearly interest rate (e.g. 0.08)
 * @param {number} years        - horizon
 */
function calculateFutureValue(monthlyAmount, annualRate, years) {
    if (monthlyAmount <= 0) return 0;
    const i = annualRate / 12;
    const n = years * 12;
    if (i === 0) return monthlyAmount * n;
    return monthlyAmount * ((Math.pow(1 + i, n) - 1) / i);
}

/**
 * Side-calc for inflation-adjusted single value
 */
function calculateInflationCost(presentCost, annualRate, years) {
    return presentCost * Math.pow(1 + annualRate, years);
}

/**
 * Main calculation function.
 * @param {Object} formData  - key/value pairs from form inputs
 * @param {Array}  allHabits - full habits array (default + custom)
 * @returns {Object}         - complete results object
 */
export function calculate(formData, allHabits = []) {
    // Step 1: Calculate per-habit monthly cost & time
    const habits = allHabits.map(habit => {
        const costPerPeriod = parseInput(formData[habit.costId]);
        const timePerPeriod = parseInput(formData[habit.timeId]);

        const monthlyCost = costPerPeriod * habit.multiplier;
        const monthlyMin = timePerPeriod * habit.multiplier;

        return {
            ...habit,
            costPerPeriod,
            timePerPeriod,
            monthlyCost,
            monthlyMin,
        };
    });

    // Step 2: Total money
    const totalMonthly = habits.reduce((sum, h) => sum + h.monthlyCost, 0);
    const totalYearly = totalMonthly * 12;
    const total5yr = totalYearly * 5;
    const total10yr = totalYearly * 10;
    const total20yr = totalYearly * 20;

    // Step 3: Investment Opportunity (Compound Interest)
    const investment10 = calculateFutureValue(totalMonthly, DEFAULT_RATES.INVESTMENT, 10);
    const investment20 = calculateFutureValue(totalMonthly, DEFAULT_RATES.INVESTMENT, 20);

    // Step 4: Inflation Impact
    const inflatedMonthly10 = calculateInflationCost(totalMonthly, DEFAULT_RATES.INFLATION, 10);

    // Step 5: Total time
    const totalMinMonth = habits.reduce((sum, h) => sum + h.monthlyMin, 0);
    const totalHrMonth = totalMinMonth / 60;
    const totalHrYear = totalHrMonth * 12;
    const totalDaysYear = totalHrYear / 24;
    const totalYrs10 = (totalHrYear * 10) / (24 * 365);

    // Step 6: Find biggest expense habit
    const activeHabits = habits.filter(h => h.monthlyCost > 0);
    const biggestHabit = activeHabits.length > 0
        ? [...activeHabits].sort((a, b) => b.monthlyCost - a.monthlyCost)[0]
        : null;

    return {
        habits,
        activeHabits,
        biggestHabit,
        money: {
            monthly: totalMonthly,
            yearly: totalYearly,
            fiveYr: total5yr,
            tenYr: total10yr,
            twentyYr: total20yr,
            investment10,
            investment20,
            inflatedMonthly10
        },
        time: {
            hrMonth: totalHrMonth,
            hrYear: totalHrYear,
            daysYear: totalDaysYear,
            yrs10: totalYrs10,
        },
    };
}