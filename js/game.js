/* ============================================================
   CODEFIX — game.js
   Player persistence (localStorage) + the debugging-session
   state machine. app.js calls into this file; this file never
   touches the DOM directly — it only returns state that app.js
   renders. That split is what makes it easy to swap localStorage
   for Supabase later (see the note at the bottom of data.js).
   ============================================================ */

const STORAGE_KEY = "codefix_player_v1";

const CodeFixGame = {

  player: null,      // the persisted player object
  session: null,      // the in-progress debugging session (per level)

  /* ---------------- PLAYER PERSISTENCE ---------------- */

  loadPlayer() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {
      console.warn("CodeFix: could not read saved player, using defaults.", e);
    }
    this.player = Object.assign(
      {},
      CODEFIX_DATA.defaultPlayer,
      saved || {}
    );
    // completedLevels needs a real merge, not an overwrite
    this.player.completedLevels = Object.assign(
      {},
      CODEFIX_DATA.defaultPlayer.completedLevels,
      (saved && saved.completedLevels) || {}
    );
    this.player.achievements = (saved && saved.achievements) || CODEFIX_DATA.defaultPlayer.achievements.slice();
    return this.player;
  },

  savePlayer() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.player));
    } catch (e) {
      console.warn("CodeFix: could not save player.", e);
    }
  },

  resetPlayer() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    this.loadPlayer();
  },

  isLevelUnlocked(levelId) {
    return levelId <= this.player.unlockedLevelId;
  },

  isLevelCompleted(levelId) {
    return !!this.player.completedLevels[levelId];
  },

  unlockAchievement(id) {
    if (!this.player.achievements.includes(id)) {
      this.player.achievements.push(id);
      this.savePlayer();
      return true; // newly unlocked
    }
    return false;
  },

  /* ---------------- DEBUGGING SESSION ---------------- */

  startLevel(levelId) {
    const level = CODEFIX_DATA.levels.find(l => l.id === levelId);
    if (!level) return null;

    this.session = {
      level,
      bugIndex: 0,           // which bug in level.bugs we're on
      selectedLine: null,
      lives: 3,
      xpEarned: 0,
      bugsFound: 0,
      hintsUsedThisLevel: 0,
      wrongAttempts: 0,
      startedAt: Date.now(),
      finishedAt: null,
      status: "playing",     // playing | complete | gameover
      log: []                // per-bug results, for the explanation page
    };
    return this.session;
  },

  currentBug() {
    if (!this.session) return null;
    return this.session.level.bugs[this.session.bugIndex];
  },

  selectLine(lineNumber) {
    if (!this.session) return;
    this.session.selectedLine = lineNumber;
  },

  /** Returns true if the chosen answer index is correct for the current bug. */
  submitAnswer(lineNumber, optionIndex) {
    const bug = this.currentBug();
    if (!bug || !this.session) return { correct: false };

    const lineCorrect = lineNumber === bug.line;
    const answerCorrect = lineCorrect && optionIndex === bug.correctIndex;

    if (answerCorrect) {
      const xp = CODEFIX_DATA.xpRules.correctBug;
      this.session.xpEarned += xp;
      this.session.bugsFound += 1;
      this.session.log.push({
        bug,
        selectedOptionIndex: optionIndex,
        correct: true
      });
      this.session.bugIndex += 1;

      if (this.session.bugIndex >= this.session.level.bugs.length) {
        this._completeLevel();
      }
      return { correct: true, xp, session: this.session };
    } else {
      this.session.xpEarned = Math.max(0, this.session.xpEarned + CODEFIX_DATA.xpRules.wrongAnswer);
      this.session.wrongAttempts += 1;
      this.session.lives -= 1;

      if (this.session.lives <= 0) {
        this.session.status = "gameover";
        this.session.log.push({
          bug,
          selectedOptionIndex: optionIndex,
          correct: false
        });
      }
      return { correct: false, xp: CODEFIX_DATA.xpRules.wrongAnswer, session: this.session };
    }
  },

  useHint() {
    if (!this.session) return null;
    this.session.hintsUsedThisLevel += 1;
    this.session.xpEarned = Math.max(0, this.session.xpEarned + CODEFIX_DATA.xpRules.hint);
    this.player.hintsUsed += 1;
    return this.currentBug().hint;
  },

  _completeLevel() {
    const s = this.session;
    s.status = "complete";
    s.finishedAt = Date.now();

    const noHintBonus = s.hintsUsedThisLevel === 0 ? CODEFIX_DATA.xpRules.noHintBonus : 0;
    const totalXp = s.xpEarned + CODEFIX_DATA.xpRules.levelComplete + noHintBonus;
    const timeSec = Math.round((s.finishedAt - s.startedAt) / 1000);
    const accuracy = Math.round(
      (s.bugsFound / (s.bugsFound + s.wrongAttempts || 1)) * 100
    );

    let stars = 1;
    if (accuracy >= 90 && s.hintsUsedThisLevel === 0) stars = 3;
    else if (accuracy >= 70) stars = 2;

    s.totalXp = totalXp;
    s.accuracy = accuracy;
    s.timeSec = timeSec;
    s.stars = stars;
    s.noHintBonus = noHintBonus;

    // --- persist to player ---
    const p = this.player;
    p.xp += totalXp;
    p.bugsFixed += s.bugsFound;
    const prevBest = p.completedLevels[s.level.id];
    if (!prevBest || stars > prevBest.stars) {
      p.completedLevels[s.level.id] = { stars, xp: totalXp, accuracy, time: timeSec };
    }
    if (s.level.id === p.unlockedLevelId && s.level.id < CODEFIX_DATA.levels.length) {
      p.unlockedLevelId = s.level.id + 1;
    }
    p.level = Math.max(p.level, Math.floor(p.xp / 200));

    // --- achievement checks ---
    const newAchievements = [];
    if (this.unlockAchievement("first-bug")) newAchievements.push("first-bug");
    if (timeSec < 120 && this.unlockAchievement("speed-debugger")) newAchievements.push("speed-debugger");
    if (s.hintsUsedThisLevel === 0) {
      const noHintCount = Object.keys(p.completedLevels).length; // approximation for prototype
      if (noHintCount >= 5 && this.unlockAchievement("no-hint-master")) newAchievements.push("no-hint-master");
    }
    if (Object.keys(p.completedLevels).length >= CODEFIX_DATA.levels.length && this.unlockAchievement("code-master")) {
      newAchievements.push("code-master");
    }
    s.newAchievements = newAchievements;

    this.savePlayer();

    if (typeof CodeFixAPI !== "undefined" && CodeFixAPI.isOnline) {
      CodeFixAPI.saveProgress({
        email: this.player.email || "you@example.com",
        levelId: s.level.id,
        stars: s.stars,
        xpEarned: s.totalXp,
        accuracy: s.accuracy,
        timeSeconds: s.timeSec,
        bugsFixedCount: s.bugsFound,
        hintsUsedCount: s.hintsUsedThisLevel,
        achievementsUnlocked: newAchievements
      });
    }
  }
};

