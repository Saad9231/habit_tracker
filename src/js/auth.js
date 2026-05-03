// ============================================================
//  auth.js — Login/Signup logic
// ============================================================

import { fetchAPI } from './api.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupBtn = document.getElementById('showSignup');
const showLoginBtn = document.getElementById('showLogin');
const authSubtitle = document.getElementById('authSubtitle');

const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

// ── Switch Forms ────────────────────────────────────────────
showSignupBtn.addEventListener('click', () => {
    loginForm.classList.remove('active-form');
    signupForm.classList.add('active-form');
    authSubtitle.textContent = 'Create an account to sync your data';
    loginError.textContent = '';
});

showLoginBtn.addEventListener('click', () => {
    signupForm.classList.remove('active-form');
    loginForm.classList.add('active-form');
    authSubtitle.textContent = 'Sign in to sync your data';
    signupError.textContent = '';
});

// ── Helpers ─────────────────────────────────────────────────
function setBtnLoading(btn, isLoading, originalText) {
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<span>Processing...</span>';
    } else {
        btn.disabled = false;
        btn.innerHTML = `<span>${originalText}</span>`;
    }
}

// ── Login Submit ────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    setBtnLoading(loginBtn, true, 'Login');

    try {
        const result = await fetchAPI('/auth/login', 'POST', { email, password });
        
        if (result && result.success) {
            localStorage.setItem('auth-token', result.token);
            localStorage.setItem('auth-user', JSON.stringify(result.user));
            window.location.href = './index.html';
        } else {
            loginError.textContent = result ? result.message : 'Server unreachable';
        }
    } catch (err) {
        loginError.textContent = 'Network error. Try again.';
    } finally {
        setBtnLoading(loginBtn, false, 'Login');
    }
});

// ── Signup Submit ───────────────────────────────────────────
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.textContent = '';
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    setBtnLoading(signupBtn, true, 'Create Account');

    try {
        const result = await fetchAPI('/auth/register', 'POST', { name, email, password });
        
        if (result && result.success) {
            localStorage.setItem('auth-token', result.token);
            localStorage.setItem('auth-user', JSON.stringify(result.user));
            window.location.href = './index.html';
        } else {
            signupError.textContent = result ? result.message : 'Server unreachable';
        }
    } catch (err) {
        signupError.textContent = 'Network error. Try again.';
    } finally {
        setBtnLoading(signupBtn, false, 'Create Account');
    }
});

// ── Auto-Redirect if logged in ──────────────────────────────
if (localStorage.getItem('auth-token')) {
    window.location.href = './index.html';
}
