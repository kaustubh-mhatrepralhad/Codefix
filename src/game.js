import { State } from './state.js';
import { navigate, showToast } from './main.js';
import { setupDashboard } from './dashboard.js';

let session = null;
let timerInterval = null;

export async function startGame(levelId) {
  const level = State.levels.find(l => l.id === levelId);
  if (!level) return;

  let fullLevel = level;
  if (!level.code && State.isOnline) {
    try {
      const res = await fetch(`${State.baseUrl}/levels/${levelId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      fullLevel = await res.json();
    } catch (e) {
      showToast('Failed to load level data', 'error');
      return;
    }
  }

  if (!fullLevel || !fullLevel.code) {
    showToast('Level code is unavailable', 'error');
    return;
  }

  session = {
    level: fullLevel,
    bugIndex: 0,
    selectedLine: null,
    selectedReason: null,
    lives: 3,
    xpEarned: 0,
    startTime: Date.now(),
    hintsUsed: 0
  };

  document.getElementById('gameLevelTitle').textContent = `MISSION ${String(levelId).padStart(2, '0')}: ${fullLevel.title.toUpperCase()}`;
  document.getElementById('gameTaskDesc').textContent = fullLevel.description;
  document.getElementById('gameFileName').textContent = `${fullLevel.topic.toLowerCase().replace(/\s/g, '_')}.exe`;

  updateHUD();
  startTimer();
  renderCode();
  hideReasonBlock();
}

function startTimer() {
  clearInterval(timerInterval);
  const timerEl = document.getElementById('gameTimer');
  timerInterval = setInterval(() => {
    if (!session) return clearInterval(timerInterval);
    const diff = Math.floor((Date.now() - session.startTime) / 1000);
    const m = String(Math.floor(diff / 60)).padStart(2, '0');
    const s = String(diff % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function updateHUD() {
  document.getElementById('navLives').textContent = session.lives;
  document.getElementById('navXp').textContent = (State.user?.xp || 0) + session.xpEarned;
}

function renderCode() {
  const body = document.getElementById('gameTerminalBody');
  body.innerHTML = '';
  
  session.level.code.forEach(line => {
    const lineEl = document.createElement('div');
    lineEl.className = 'code-line selectable';
    lineEl.dataset.line = line.n;
    lineEl.innerHTML = `<span class="line-num">${line.n}</span> <span class="code-text">${escapeHtml(line.text)}</span>`;
    
    lineEl.addEventListener('click', () => {
      document.querySelectorAll('#gameTerminalBody .code-line').forEach(l => l.classList.remove('selected'));
      lineEl.classList.add('selected');
      session.selectedLine = line.n;
      document.getElementById('selectedLineDisplay').innerHTML = `Line: <span>${line.n}</span>`;
      document.getElementById('selectedLineDisplay').classList.remove('hidden');
      
      showReasonBlock();
    });
    
    body.appendChild(lineEl);
  });
}

function showReasonBlock() {
  const bug = session.level.bugs[session.bugIndex];
  if (!bug) return;

  const block = document.getElementById('qReasonBlock');
  const list = document.getElementById('reasonList');
  const submitBtn = document.getElementById('submitBugBtn');
  
  list.innerHTML = '';
  session.selectedReason = null;
  submitBtn.disabled = true;

  bug.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'reason-btn';
    btn.textContent = opt;
    btn.onclick = () => {
      document.querySelectorAll('.reason-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      session.selectedReason = idx;
      submitBtn.disabled = false;
    };
    list.appendChild(btn);
  });

  block.classList.remove('hidden');
}

function hideReasonBlock() {
  document.getElementById('qReasonBlock').classList.add('hidden');
  document.getElementById('selectedLineDisplay').classList.add('hidden');
}

document.getElementById('submitBugBtn')?.addEventListener('click', () => {
  if (session.selectedLine === null || session.selectedReason === null) return;
  
  const bug = session.level.bugs[session.bugIndex];
  const isLineCorrect = session.selectedLine === bug.line;
  const isReasonCorrect = session.selectedReason === (bug.correctIndex ?? bug.correct_index);

  const selectedLineEl = document.querySelector(`#gameTerminalBody .code-line[data-line="${session.selectedLine}"]`);

  if (isLineCorrect && isReasonCorrect) {
    // CORRECT
    if (selectedLineEl) selectedLineEl.classList.add('correct');
    session.xpEarned += 50;
    showToast('BUG SQUASHED +50 XP', 'success');
    
    // Move to next bug or complete level
    session.bugIndex++;
    if (session.bugIndex >= session.level.bugs.length) {
      completeLevel();
    } else {
      hideReasonBlock();
      updateHUD();
    }
  } else {
    // WRONG
    if (selectedLineEl) {
      selectedLineEl.classList.add('error');
      setTimeout(() => selectedLineEl.classList.remove('error'), 1000);
    }
    session.lives--;
    session.xpEarned = Math.max(0, session.xpEarned - 10);
    showToast('INCORRECT ANALYSIS -1 LIFE', 'error');
    updateHUD();
    
    if (session.lives <= 0) {
      showModal('SYSTEM FAILURE', 'You ran out of lives. Simulation aborted.', () => navigate('dashboard'));
    }
  }
});

document.getElementById('gameHintBtn')?.addEventListener('click', () => {
  if (!session) return;
  const bug = session.level.bugs[session.bugIndex];
  if (bug) {
    session.hintsUsed++;
    session.xpEarned = Math.max(0, session.xpEarned - 10);
    showToast(`HINT: ${bug.hint}`, 'info');
    updateHUD();
  }
});

async function completeLevel() {
  clearInterval(timerInterval);
  const timeSeconds = Math.floor((Date.now() - session.startTime) / 1000);
  const accuracy = Math.round((session.level.bugs.length / (session.level.bugs.length + (3 - session.lives))) * 100);
  let stars = accuracy === 100 ? 3 : accuracy > 70 ? 2 : 1;
  const totalXp = session.xpEarned + session.level.maxXp;

  // Save to backend
  if (State.isOnline && State.user) {
    try {
      await fetch(`${State.baseUrl}/user/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: State.user.email,
          levelId: session.level.id,
          stars,
          xpEarned: totalXp,
          accuracy,
          timeSeconds,
          bugsFixedCount: session.level.bugs.length,
          hintsUsedCount: session.hintsUsed
        })
      });
      // Refresh Profile
      await State.fetchProfile(State.user.email);
    } catch(e) {
      console.warn("Failed to save progress", e);
    }
  }

  showModal('MISSION COMPLETE', `
    <div style="font-family: var(--font-mono); color: var(--neon-cyan); margin-bottom: 20px;">
      <p>STATUS: <span style="color:var(--neon-green)">CLEARED</span></p>
      <p>STARS: ${'⭐'.repeat(stars)}</p>
      <p>XP EARNED: +${totalXp}</p>
      <p>ACCURACY: ${accuracy}%</p>
      <p>TIME: ${timeSeconds}s</p>
    </div>
  `, () => {
    setupDashboard();
    navigate('dashboard');
  });
}

function showModal(title, htmlContent, onContinue) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalContent').innerHTML = htmlContent;
  document.getElementById('gameModalOverlay').classList.remove('hidden');
  
  const btn = document.getElementById('modalActionBtn');
  btn.onclick = () => {
    document.getElementById('gameModalOverlay').classList.add('hidden');
    if (onContinue) onContinue();
  };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
