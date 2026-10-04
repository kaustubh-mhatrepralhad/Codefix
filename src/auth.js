import { State } from './state.js';
import { navigate, showToast } from './main.js';

let isLoginMode = true;

export function setupAuth() {
  const toggleBtn = document.getElementById('authToggleBtn');
  const toggleText = document.getElementById('authToggleText');
  const title = document.getElementById('authTitle');
  const nameGroup = document.getElementById('nameGroup');
  const submitBtn = document.getElementById('authSubmitBtn');
  const form = document.getElementById('authForm');

  toggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
      title.textContent = 'SYS.LOGIN';
      toggleText.textContent = 'New operative?';
      toggleBtn.textContent = 'REGISTER';
      submitBtn.textContent = 'AUTHENTICATE';
      nameGroup.classList.add('hidden');
      document.getElementById('authName').removeAttribute('required');
    } else {
      title.textContent = 'SYS.REGISTER';
      toggleText.textContent = 'Existing operative?';
      toggleBtn.textContent = 'LOGIN';
      submitBtn.textContent = 'INITIALIZE';
      nameGroup.classList.remove('hidden');
      document.getElementById('authName').setAttribute('required', 'true');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'PROCESSING...';

    try {
      if (!State.isOnline) {
        showToast('System Offline. Using Mock Auth.', 'info');
        // Mock Auth
        State.user = { id: 1, name: name || 'Guest', email, xp: 0, streak: 1, level: 1, unlockedLevelId: 1, completedLevels: {} };
        localStorage.setItem('codefix_email', email);
        localStorage.setItem('codefix_token', 'mock_token');
        navigate('dashboard');
        return;
      }

      const endpoint = isLoginMode ? '/auth/login' : '/auth/register';
      const body = isLoginMode ? { email, password } : { name, email, password };

      const res = await fetch(`${State.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('codefix_token', data.token);
        localStorage.setItem('codefix_email', email);
        State.user = data.user;
        showToast('Authentication Successful', 'success');
        navigate('dashboard');
      } else {
        showToast(data.error || 'Authentication Failed', 'error');
      }
    } catch (err) {
      showToast('Network error during authentication', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = isLoginMode ? 'AUTHENTICATE' : 'INITIALIZE';
    }
  });
}
