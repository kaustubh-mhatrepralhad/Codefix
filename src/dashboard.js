import { State } from './state.js';
import { navigate, showToast } from './main.js';
import { startGame } from './game.js';

export function setupDashboard() {
  updateNavStats();
  renderLevels();

  // Setup Logout
  document.querySelectorAll('#logoutBtn, #logoutBtnLB, #logoutBtnProfile').forEach(btn => {
    btn.onclick = () => {
      State.logout();
      navigate('landing');
      showToast('Disconnected from Network', 'info');
    };
  });

  renderLeaderboard();
}

function updateNavStats() {
  if (!State.user) return;
  document.getElementById('navXp').textContent = State.user.xp || 0;
  document.getElementById('navStreak').textContent = State.user.streak || 0;
  document.getElementById('navAvatar').textContent = (State.user.name || 'U')[0].toUpperCase();
}

function renderLevels() {
  const container = document.getElementById('levelsGrid');
  if (!container) return;
  container.innerHTML = '';

  const unlockedId = State.user?.unlockedLevelId || 1;
  const completed = State.user?.completedLevels || {};

  State.levels.forEach(level => {
    const isUnlocked = level.id <= unlockedId;
    const isCompleted = completed[level.id];
    
    const card = document.createElement('div');
    card.className = `level-card ${isUnlocked ? '' : 'locked'}`;
    
    let statusHtml = '';
    if (isCompleted) {
      statusHtml = `<div class="level-stars">${'⭐'.repeat(isCompleted.stars)}</div>`;
    } else if (isUnlocked) {
      statusHtml = `<div class="text-xs text-neon-cyan">> READY</div>`;
    } else {
      statusHtml = `<div class="text-xs text-muted">LOCKED</div>`;
    }

    card.innerHTML = `
      <div class="level-icon">${level.icon || '👾'}</div>
      <div>
        <h3 class="level-title">M-${String(level.id).padStart(2, '0')}: ${level.title}</h3>
        <p class="text-sm text-muted">${level.topic}</p>
      </div>
      <div class="level-meta">
        <span>MAX XP: ${level.maxXp || level.max_xp || 100}</span>
        ${statusHtml}
      </div>
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        startGame(level.id);
        navigate('game');
      });
    }

    container.appendChild(card);
  });
}

function renderLeaderboard() {
  const container = document.getElementById('leaderboardList');
  if (!container) return;
  container.innerHTML = '';

  State.leaderboard.forEach((user, index) => {
    const isMe = State.user && State.user.email === user.email;
    const row = document.createElement('div');
    row.className = `lb-row ${isMe ? 'is-me' : ''}`;
    
    row.innerHTML = `
      <div class="lb-rank">#${index + 1}</div>
      <div class="lb-name">${user.name} ${isMe ? '(YOU)' : ''}</div>
      <div class="lb-xp">${user.xp} XP</div>
    `;
    
    container.appendChild(row);
  });
}
