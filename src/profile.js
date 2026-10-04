import { State } from './state.js';
import { navigate } from './main.js';

const RANKS = [
  { max: 0, title: 'NEW RECRUIT' },
  { max: 500, title: 'SCRIPT KIDDIE' },
  { max: 1500, title: 'CODE HUNTER' },
  { max: 3000, title: 'NETRUNNER' },
  { max: 5000, title: 'SYSTEM ARCHITECT' },
  { max: Infinity, title: 'CYBER NINJA' }
];

const ACHIEVEMENTS = [
  { id: 'first-fix', name: 'First Blood', desc: 'Squash your first bug.', icon: 'fa-solid fa-droplet' },
  { id: 'bug-hunter', name: 'Bug Hunter', desc: 'Squash 5 total bugs.', icon: 'fa-solid fa-spider' },
  { id: 'flawless', name: 'Flawless', desc: 'Clear a mission with 100% accuracy.', icon: 'fa-solid fa-crosshairs' },
  { id: 'speed-demon', name: 'Speed Demon', desc: 'Clear a mission in under 30 seconds.', icon: 'fa-solid fa-gauge-high' },
  { id: 'streak-3', name: 'Consistent', desc: 'Maintain a 3-mission streak.', icon: 'fa-solid fa-fire-flame-curved' }
];

export function setupProfile() {
  if (!State.user) return;
  
  const user = State.user;
  const completed = user.completedLevels || {};
  const missions = Object.keys(completed).map(id => ({ id, ...completed[id] }));
  
  // 1. Header & Identity
  document.getElementById('profileAvatar').textContent = (user.name || 'U')[0].toUpperCase();
  document.getElementById('profileName').textContent = (user.name || 'UNKNOWN').toUpperCase();
  document.getElementById('profileName').dataset.text = (user.name || 'UNKNOWN').toUpperCase();
  
  // Rank Calc
  const currentRank = RANKS.find(r => user.xp <= r.max) || RANKS[RANKS.length - 1];
  document.getElementById('profileTitle').textContent = currentRank.title;
  
  // XP Progress
  const level = user.level || Math.floor(user.xp / 200) + 1;
  const currentLevelXp = (level - 1) * 200;
  const nextLevelXp = level * 200;
  const xpInLevel = user.xp - currentLevelXp;
  const percent = Math.min(100, Math.max(0, (xpInLevel / 200) * 100));
  
  document.getElementById('profileLevelTxt').textContent = `LEVEL ${level}`;
  document.getElementById('profileXpTxt').textContent = user.xp;
  document.getElementById('profileNextXpTxt').textContent = nextLevelXp;
  document.getElementById('profileXpBar').style.width = `${percent}%`;
  document.getElementById('profileXpRemainingTxt').textContent = `${nextLevelXp - user.xp} XP TO NEXT LEVEL`;

  // 2. Core Stats
  document.getElementById('statXp').textContent = user.xp;
  document.getElementById('statStreak').textContent = user.streak || 0;
  
  const totalBugs = user.bugsFixed || missions.length; // fallback
  document.getElementById('statBugs').textContent = totalBugs;
  
  let avgAcc = 0;
  if (missions.length > 0) {
    const totalAcc = missions.reduce((sum, m) => sum + (m.accuracy || 0), 0);
    avgAcc = Math.round(totalAcc / missions.length);
  } else {
    avgAcc = user.accuracy || 0;
  }
  document.getElementById('statAccuracy').textContent = `${avgAcc}%`;

  // 3. Next Milestone
  const msBlock = document.getElementById('nextMilestoneContent');
  const lockedLevels = State.levels.filter(l => !completed[l.id]);
  if (lockedLevels.length > 0) {
    const nextLvl = lockedLevels[0];
    msBlock.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <div class="font-mono text-neon-cyan">MISSION: ${nextLvl.title}</div>
        <div class="text-xs text-muted">+${nextLvl.maxXp || 100} XP</div>
      </div>
      <p class="text-sm text-muted mb-4">${nextLvl.description || nextLvl.topic}</p>
      <button class="cyber-button-sm primary w-full" id="btnContinueMilestone">INITIATE MISSION</button>
    `;
    document.getElementById('btnContinueMilestone').onclick = () => navigate('dashboard');
  } else {
    msBlock.innerHTML = `<div class="text-neon-green">ALL CURRENT MISSIONS CLEARED. AWAITING NEW DIRECTIVES.</div>`;
  }

  // 4. Achievements Calculation & Rendering
  // Dynamic unlocks based on stats
  const unlockedIds = new Set(user.achievements || []);
  if (missions.length >= 1) unlockedIds.add('first-fix');
  if (totalBugs >= 5) unlockedIds.add('bug-hunter');
  if (user.streak >= 3) unlockedIds.add('streak-3');
  if (missions.some(m => m.accuracy === 100)) unlockedIds.add('flawless');
  if (missions.some(m => m.time && m.time < 30)) unlockedIds.add('speed-demon');

  const achContainer = document.getElementById('achievementsList');
  achContainer.innerHTML = '';
  ACHIEVEMENTS.forEach(ach => {
    const isUnlocked = unlockedIds.has(ach.id);
    achContainer.innerHTML += `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
        <i class="${ach.icon} achievement-icon"></i>
        <div class="achievement-title">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>
    `;
  });

  // 5. Recent Missions
  const logContainer = document.getElementById('recentMissionsList');
  logContainer.innerHTML = '';
  
  if (missions.length === 0) {
    logContainer.innerHTML = `<div class="text-muted text-sm italic">No missions logged in the database yet.</div>`;
  } else {
    // Sort descending by ID (assuming ID correlates to order played for now)
    const recent = missions.sort((a,b) => b.id - a.id).slice(0, 5);
    recent.forEach(m => {
      const lvlData = State.levels.find(l => l.id == m.id);
      const title = lvlData ? lvlData.title : `MISSION ${m.id}`;
      logContainer.innerHTML += `
        <div class="mission-row">
          <div class="mission-name">> ${title}</div>
          <div class="flex gap-4 text-sm text-muted">
            <span class="text-neon-yellow">${'⭐'.repeat(m.stars || 1)}</span>
            <span>+${m.xp || 100} XP</span>
            ${m.time ? `<span>${m.time}s</span>` : ''}
          </div>
        </div>
      `;
    });
  }
}
