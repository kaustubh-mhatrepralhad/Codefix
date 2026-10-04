import './style.css';
import './landing.css';
import './landing-cyberpunk.css';
import { State } from './state.js';
import { setupAuth } from './auth.js';
import { setupDashboard } from './dashboard.js';
import { setupProfile } from './profile.js';

// Elements
const appShell = document.getElementById('appShell');
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('[data-nav]');

// Router
export function navigate(viewId) {
  // Mode interception for auth
  if (viewId === 'login' || viewId === 'signup') {
    const isLogin = viewId === 'login';
    const authBtn = document.getElementById('authToggleBtn');
    // If the state needs to switch
    if ((isLogin && authBtn.textContent === 'LOGIN') || (!isLogin && authBtn.textContent === 'REGISTER')) {
       authBtn.click();
    }
    viewId = 'auth';
  }

  views.forEach(v => v.classList.remove('active-view'));
  
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active-view');
  }

  // Update Nav State
  const isLoggedIn = State.isLoggedIn();
  const topNav = document.getElementById('topNav');
  
  if (viewId === 'landing' || viewId === 'auth') {
    document.getElementById('publicNavLinks').classList.remove('hidden');
    document.getElementById('playerStatsNav').classList.add('hidden');
    appShell.classList.remove('in-app');
  } else {
    document.getElementById('publicNavLinks').classList.add('hidden');
    document.getElementById('playerStatsNav').classList.remove('hidden');
    appShell.classList.add('in-app');
    
    // Update Sidebar active state
    document.querySelectorAll('.cyber-sidebar .nav-item').forEach(btn => {
      if (btn.dataset.nav === viewId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  // View-specific logic
  if (viewId === 'dashboard') {
    setupDashboard();
  } else if (viewId === 'profile') {
    setupProfile();
  }
}

// Global Nav Listeners
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.nav;
    if (target) navigate(target);
  });
});

// Demo Terminal Interactions
const demoLines = document.querySelectorAll('#demo-terminal .code-line');
demoLines.forEach(line => {
  line.addEventListener('click', () => {
    demoLines.forEach(l => l.classList.remove('selected'));
    line.classList.add('selected');
    
    if (line.classList.contains('buggy')) {
      line.classList.add('correct');
      document.getElementById('demo-feedback').classList.remove('hidden');
    } else {
      line.classList.add('error');
      setTimeout(() => line.classList.remove('error'), 1000);
    }
  });
});

// Toast System
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `cyber-toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">></span> ${message}`;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.scroll-fade-in').forEach(element => {
    observer.observe(element);
  });
}

// Init
async function init() {
  await State.initialize();
  setupAuth();
  initScrollAnimations();
  
  if (State.isLoggedIn()) {
    navigate('dashboard');
  } else {
    navigate('landing');
  }
}

document.addEventListener('DOMContentLoaded', init);
