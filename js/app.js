/* ============================================================
   CODEFIX — app.js
   Owns the DOM: view switching, rendering, form handling, and
   wiring buttons to CodeFixGame. All game rules live in game.js;
   all content lives in data.js. This file just connects them.
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- STATE ---------------- */
  let currentGameLevelId = null;
  let gameTimerInterval = null;
  let gameTimerSeconds = 0;
  let pendingLineSelection = null;
  let pendingOptionSelection = null;
  let loggedInEmail = "you@example.com";

  /* ---------------- UTIL ---------------- */
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("toast--show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("toast--show"), 2400);
  }

  function animateCount(el, from, to, suffix) {
    suffix = suffix || "";
    const duration = 600;
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const val = Math.round(from + (to - from) * p);
      el.textContent = val + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function starString(n) {
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }
  function starStringSmall(n, max) {
    max = max || 3;
    return "⭐".repeat(n) + "☆".repeat(Math.max(0, max - n));
  }

  /* ============================================================
     NAVIGATION
  ============================================================ */
  const PUBLIC_VIEWS = ["landing", "login", "signup"];
  const APP_VIEWS = [
    "dashboard", "levelmap", "levelintro", "game", "explanation",
    "learn", "leaderboard", "achievements", "profile", "settings"
  ];

  function navigate(target, opts) {
    opts = opts || {};
    if (PUBLIC_VIEWS.includes(target)) {
      $("appShell").classList.remove("app-shell--active");
      qsa(".view").forEach(v => v.classList.remove("view--active"));
      $(`view-${target}`).classList.add("view--active");
      window.scrollTo(0, 0);
      closeMobileMenus();
      return;
    }

    if (APP_VIEWS.includes(target)) {
      qsa(".view").forEach(v => v.classList.remove("view--active"));
      $("appShell").classList.add("app-shell--active");
      qsa(".app-view").forEach(v => v.classList.remove("app-view--active"));
      $(`view-${target}`).classList.add("app-view--active");

      qsa(".app-nav__item").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.nav === target);
      });

      renderView(target, opts);
      window.scrollTo(0, 0);
      closeMobileMenus();
    }
  }

  function closeMobileMenus() {
    $("appSidebar").classList.remove("open");
    $("landingNav").classList.remove("open");
  }

  function renderView(target, opts) {
    switch (target) {
      case "dashboard": renderDashboard(); break;
      case "levelmap": renderLevelMap(); break;
      case "levelintro": renderLevelIntro(opts.levelId); break;
      case "game": renderGame(opts.levelId); break;
      case "explanation": renderExplanation(); break;
      case "learn": renderLearn(); break;
      case "leaderboard": renderLeaderboard(); break;
      case "achievements": renderAchievements(); break;
      case "profile": renderProfile(); break;
      case "settings": renderSettings(); break;
    }
  }

  // Delegate all [data-nav] clicks
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-nav]");
    if (btn) {
      e.preventDefault();
      navigate(btn.dataset.nav);
    }
  });

  /* ============================================================
     LANDING PAGE — mobile nav toggle
  ============================================================ */
  $("navToggle").addEventListener("click", () => {
    const open = $("landingNav").classList.toggle("open");
    $("navToggle").setAttribute("aria-expanded", open);
  });
  $("mobileNavToggle").addEventListener("click", () => {
    $("appSidebar").classList.toggle("open");
  });

  /* ============================================================
     FORM VALIDATION HELPERS
  ============================================================ */
  function setFieldError(inputEl, errorEl, message) {
    if (message) {
      inputEl.classList.add("invalid");
      errorEl.textContent = message;
    } else {
      inputEl.classList.remove("invalid");
      errorEl.textContent = "";
    }
  }
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  /* ============================================================
     LOGIN
  ============================================================ */
  $("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("loginEmail");
    const password = $("loginPassword");
    let ok = true;

    if (!isValidEmail(email.value.trim())) {
      setFieldError(email, $("loginEmailError"), "Enter a valid email address.");
      ok = false;
    } else setFieldError(email, $("loginEmailError"), "");

    if (password.value.length < 6) {
      setFieldError(password, $("loginPasswordError"), "Password must be at least 6 characters.");
      ok = false;
    } else setFieldError(password, $("loginPasswordError"), "");

    if (!ok) return;

    loggedInEmail = email.value.trim();
    showToast("Welcome back!");
    navigate("dashboard");
  });

  $("forgotPasswordBtn").addEventListener("click", () => {
    showToast("Password reset isn't wired up in this prototype yet.");
  });

  /* ============================================================
     SIGN UP
  ============================================================ */
  $("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("signupName");
    const email = $("signupEmail");
    const password = $("signupPassword");
    const confirm = $("signupConfirm");
    let ok = true;

    if (name.value.trim().length < 2) {
      setFieldError(name, $("signupNameError"), "Enter your full name.");
      ok = false;
    } else setFieldError(name, $("signupNameError"), "");

    if (!isValidEmail(email.value.trim())) {
      setFieldError(email, $("signupEmailError"), "Enter a valid email address.");
      ok = false;
    } else setFieldError(email, $("signupEmailError"), "");

    if (password.value.length < 6) {
      setFieldError(password, $("signupPasswordError"), "Use at least 6 characters.");
      ok = false;
    } else setFieldError(password, $("signupPasswordError"), "");

    if (confirm.value !== password.value || !confirm.value) {
      setFieldError(confirm, $("signupConfirmError"), "Passwords don't match.");
      ok = false;
    } else setFieldError(confirm, $("signupConfirmError"), "");

    if (!ok) return;

    loggedInEmail = email.value.trim();
    CodeFixGame.player.name = name.value.trim().split(" ")[0];
    CodeFixGame.savePlayer();
    showToast("Account created — let's go!");
    navigate("dashboard");
  });

  /* ============================================================
     DASHBOARD
  ============================================================ */
  function renderDashboard() {
    const p = CodeFixGame.player;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    $("dashboardGreeting").textContent = `${greeting}, ${p.name} 👋`;

    animateCount($("statXp"), 0, p.xp);
    animateCount($("statStreak"), 0, p.streak);
    animateCount($("statLevel"), 0, p.level);
    animateCount($("statBugs"), 0, p.bugsFixed);

    // continue card -> next uncompleted, unlocked level (or last level)
    const nextLevel = CODEFIX_DATA.levels.find(l => CodeFixGame.isLevelUnlocked(l.id) && !CodeFixGame.isLevelCompleted(l.id))
      || CODEFIX_DATA.levels.find(l => l.id === p.unlockedLevelId)
      || CODEFIX_DATA.levels[CODEFIX_DATA.levels.length - 1];

    $("continueLevelTitle").textContent = `Level ${nextLevel.id} — ${nextLevel.title}`;
    $("continueLevelTopic").textContent = `Topic: ${nextLevel.topic}`;
    const progressPct = Math.round((Object.keys(p.completedLevels).length / CODEFIX_DATA.levels.length) * 100);
    $("continueProgressFill").style.width = progressPct + "%";
    $("continueBtn").onclick = () => navigate("levelintro", { levelId: nextLevel.id });

    // daily challenge -> pick a deterministic level based on day of month
    const dailyLevel = CODEFIX_DATA.levels[new Date().getDate() % CODEFIX_DATA.levels.length];
    $("dailyTitle").textContent = `Can you find ${dailyLevel.bugs.length === 1 ? "the bug" : `all ${dailyLevel.bugs.length} bugs`}?`;
    $("dailyDesc").textContent = `${dailyLevel.title} · ${dailyLevel.topic}`;
    $("dailyBtn").onclick = () => navigate("levelintro", { levelId: dailyLevel.id });

    renderSidebarPlayer();
  }

  function renderSidebarPlayer() {
    const p = CodeFixGame.player;
    $("sidebarPlayer").innerHTML = `
      <div class="avatar">${p.name.charAt(0).toUpperCase()}</div>
      <div class="sidebar-player__meta">
        <strong>${escapeHtml(p.name)}</strong>
        <span>Level ${p.level} · ${p.xp} XP</span>
      </div>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ============================================================
     LEVEL MAP
  ============================================================ */
  function renderLevelMap() {
    const container = $("levelPath");
    container.innerHTML = "";
    CODEFIX_DATA.levels.forEach((level, idx) => {
      if (idx > 0) {
        const connector = document.createElement("div");
        connector.className = "level-node__connector";
        container.appendChild(connector);
      }

      const completed = CodeFixGame.isLevelCompleted(level.id);
      const unlocked = CodeFixGame.isLevelUnlocked(level.id);
      const isCurrent = !completed && unlocked;
      const state = completed ? "completed" : isCurrent ? "current" : unlocked ? "unlocked" : "locked";

      const node = document.createElement("div");
      node.className = "level-node";
      node.dataset.state = state;

      let statusIcon = "";
      if (state === "completed") statusIcon = "✓";
      else if (state === "current") statusIcon = "▶";
      else if (state === "locked") statusIcon = "🔒";

      const starsHtml = completed
        ? `<div class="level-node__stars">${starStringSmall(CodeFixGame.player.completedLevels[level.id].stars)}</div>`
        : "";

      node.innerHTML = `
        <div class="level-node__icon">${level.icon}</div>
        <div class="level-node__body">
          <div class="level-node__title">Level ${level.id} — ${escapeHtml(level.title)}</div>
          <div class="level-node__topic">${escapeHtml(level.topic)}</div>
          ${starsHtml}
        </div>
        <div class="level-node__status">${statusIcon}</div>
      `;

      if (state !== "locked") {
        node.addEventListener("click", () => navigate("levelintro", { levelId: level.id }));
      }
      container.appendChild(node);
    });
  }

  /* ============================================================
     LEVEL INTRODUCTION
  ============================================================ */
  function renderLevelIntro(levelId) {
    const level = CODEFIX_DATA.levels.find(l => l.id === levelId);
    if (!level) { navigate("levelmap"); return; }

    $("introLevelLabel").textContent = `LEVEL ${level.id}`;
    $("introTitle").textContent = `${level.icon} ${level.title}`;
    $("introDifficulty").textContent = starString(level.difficulty);
    $("introBugCount").textContent = level.bugs.length;
    $("introMaxXp").textContent = level.maxXp;
    $("introDescription").textContent = level.description;
    $("introTask").textContent = level.task;
    $("startDebuggingBtn").onclick = () => navigate("game", { levelId: level.id });
  }

  /* ============================================================
     DEBUGGING GAME
  ============================================================ */
  function renderGame(levelId) {
    currentGameLevelId = levelId;
    CodeFixGame.startLevel(levelId);
    pendingLineSelection = null;
    pendingOptionSelection = null;

    const level = CodeFixGame.session.level;
    $("gameLevelLabel").textContent = `Level ${level.id}`;
    $("gameFileName").textContent = level.topic.toLowerCase().replace(/\s+/g, "_") + ".py";
    $("gameTopicLine").textContent = `Topic: ${level.topic}`;
    $("gameDifficultyLine").textContent = `Difficulty: ${level.difficulty <= 2 ? "Easy" : level.difficulty === 3 ? "Medium" : "Hard"}`;
    $("gameDescription").textContent = level.description;
    $("gameBackBtn").onclick = () => { stopGameTimer(); navigate("levelintro", { levelId: level.id }); };

    hideAllModals();
    renderCodePanel();
    renderBugQuestion();
    updateGameHud();
    startGameTimer();
  }

  function renderCodePanel() {
    const level = CodeFixGame.session.level;
    const codeBody = $("gameCode");
    codeBody.innerHTML = "";
    level.code.forEach(line => {
      const wrap = document.createElement("span");
      wrap.className = "code-line selectable";
      wrap.dataset.line = line.n;
      wrap.innerHTML = `<span class="cl">${line.n}</span><span class="ct">${escapeHtml(line.text)}</span>`;
      wrap.addEventListener("click", () => selectLine(line.n));
      codeBody.appendChild(wrap);
    });
  }

  function selectLine(lineNumber) {
    pendingLineSelection = lineNumber;
    pendingOptionSelection = null;
    qsa(".code-line", $("gameCode")).forEach(el => {
      el.classList.toggle("line-selected", Number(el.dataset.line) === lineNumber);
      el.classList.remove("line-correct", "line-wrong");
    });
    qsa(".choice-btn", $("lineChoices")).forEach(el => {
      el.classList.toggle("selected", Number(el.dataset.line) === lineNumber);
    });
    showReasonQuestion();
  }

  function renderBugQuestion() {
    const level = CodeFixGame.session.level;
    const lineChoices = $("lineChoices");
    lineChoices.innerHTML = "";
    level.code.forEach(line => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.type = "button";
      btn.dataset.line = line.n;
      btn.textContent = `Line ${line.n}`;
      btn.addEventListener("click", () => selectLine(line.n));
      lineChoices.appendChild(btn);
    });
    $("reasonQuestionBlock").classList.add("hidden");
    $("hintBox").classList.add("hidden");
  }

  function showReasonQuestion() {
    const bug = CodeFixGame.currentBug();
    const reasonBlock = $("reasonQuestionBlock");
    const reasonChoices = $("reasonChoices");
    reasonChoices.innerHTML = "";

    bug.options.forEach((optionText, idx) => {
      const btn = document.createElement("button");
      btn.className = "reason-btn";
      btn.type = "button";
      btn.dataset.index = idx;
      btn.textContent = `${String.fromCharCode(65 + idx)}. ${optionText}`;
      btn.addEventListener("click", () => {
        pendingOptionSelection = idx;
        qsa(".reason-btn", reasonChoices).forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        $("submitAnswerBtn").disabled = false;
      });
      reasonChoices.appendChild(btn);
    });

    reasonBlock.classList.remove("hidden");
    $("submitAnswerBtn").disabled = true;
  }

  $("submitAnswerBtn").addEventListener("click", () => {
    if (pendingLineSelection == null || pendingOptionSelection == null) return;
    const result = CodeFixGame.submitAnswer(pendingLineSelection, pendingOptionSelection);
    const bugJustAnswered = result.correct
      ? CodeFixGame.session.log[CodeFixGame.session.log.length - 1].bug
      : CodeFixGame.currentBug();

    const lineEl = qs(`.code-line[data-line="${pendingLineSelection}"]`, $("gameCode"));
    if (lineEl) lineEl.classList.add(result.correct ? "line-correct" : "line-wrong");

    updateGameHud();
    showFeedback(result, bugJustAnswered);
  });

  function showFeedback(result, bug) {
    const overlay = $("feedbackOverlay");
    const card = $("feedbackCard");
    card.classList.remove("is-correct", "is-wrong");
    card.classList.add(result.correct ? "is-correct" : "is-wrong");

    $("feedbackIcon").textContent = result.correct ? "✓" : "✕";
    $("feedbackTitle").textContent = result.correct ? "CORRECT!" : "NOT QUITE";
    $("feedbackSub").textContent = result.correct
      ? `+${result.xp} XP · Bug found!`
      : "That's not the correct mistake. Take another look.";

    const explainBlock = $("feedbackExplain");
    if (result.correct) {
      explainBlock.classList.remove("hidden");
      $("feedbackExplainText").textContent = bug.explanation;
    } else {
      explainBlock.classList.add("hidden");
    }

    $("feedbackContinueBtn").textContent = result.correct ? "CONTINUE" : "TRY AGAIN";
    overlay.classList.remove("hidden");

    $("feedbackContinueBtn").onclick = () => {
      overlay.classList.add("hidden");
      afterFeedback(result);
    };
  }

  function afterFeedback(result) {
    const session = CodeFixGame.session;
    if (session.status === "gameover") {
      stopGameTimer();
      $("gameOverModal").classList.remove("hidden");
      return;
    }
    if (session.status === "complete") {
      stopGameTimer();
      showCompleteModal();
      return;
    }
    if (result.correct) {
      renderCodePanel();
      renderBugQuestion();
    } else {
      // stay on same bug, clear selection state for retry
      pendingLineSelection = null;
      pendingOptionSelection = null;
      qsa(".code-line", $("gameCode")).forEach(el => el.classList.remove("line-selected", "line-wrong", "line-correct"));
      qsa(".choice-btn", $("lineChoices")).forEach(el => el.classList.remove("selected"));
      $("reasonQuestionBlock").classList.add("hidden");
    }
  }

  $("hintBtn").addEventListener("click", () => {
    const hintText = CodeFixGame.useHint();
    $("hintBox").textContent = "💡 " + hintText;
    $("hintBox").classList.remove("hidden");
    updateGameHud();
  });

  function updateGameHud() {
    const s = CodeFixGame.session;
    $("gameBugCount").textContent = `${s.bugsFound}/${s.level.bugs.length}`;
    $("gameXp").textContent = s.xpEarned;
    $("gameLives").innerHTML = "❤️".repeat(Math.max(0, s.lives)) + "🖤".repeat(3 - Math.max(0, s.lives));
  }

  function startGameTimer() {
    gameTimerSeconds = 0;
    $("gameTimer").textContent = formatTime(0);
    clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
      gameTimerSeconds++;
      $("gameTimer").textContent = formatTime(gameTimerSeconds);
    }, 1000);
  }
  function stopGameTimer() { clearInterval(gameTimerInterval); }

  function hideAllModals() {
    $("feedbackOverlay").classList.add("hidden");
    $("completeModal").classList.add("hidden");
    $("gameOverModal").classList.add("hidden");
  }

  function showCompleteModal() {
    const s = CodeFixGame.session;
    $("completeStars").textContent = "⭐".repeat(s.stars) + "☆".repeat(3 - s.stars);
    animateCount($("completeScore"), 0, s.totalXp);
    $("completeAccuracy").textContent = s.accuracy + "%";
    $("completeTime").textContent = formatTime(s.timeSec);
    $("completeBugs").textContent = `${s.bugsFound}/${s.level.bugs.length}`;
    $("completeBonus").textContent = s.noHintBonus > 0 ? `🎁 No-hint bonus: +${s.noHintBonus} XP` : "";

    const msgs = [
      "Excellent debugging! You're getting better.",
      "Sharp eyes — that's exactly how real developers work.",
      "Bug-free and confident. Nice work!"
    ];
    $("completeMsg").textContent = msgs[s.stars - 1] || msgs[0];

    if (s.newAchievements && s.newAchievements.length) {
      setTimeout(() => showToast("🏅 Achievement unlocked!"), 400);
    }

    $("completeModal").classList.remove("hidden");
  }

  $("nextLevelBtn").addEventListener("click", () => {
    hideAllModals();
    const nextId = currentGameLevelId + 1;
    if (CODEFIX_DATA.levels.find(l => l.id === nextId)) {
      navigate("levelintro", { levelId: nextId });
    } else {
      showToast("You've completed every level! 👑");
      navigate("levelmap");
    }
  });
  $("viewExplanationsBtn").addEventListener("click", () => { hideAllModals(); navigate("explanation"); });
  $("tryAgainBtn").addEventListener("click", () => { hideAllModals(); navigate("game", { levelId: currentGameLevelId }); });
  $("gameOverExplainBtn").addEventListener("click", () => { hideAllModals(); navigate("explanation"); });

  /* ============================================================
     EXPLANATION PAGE
  ============================================================ */
  function renderExplanation() {
    const session = CodeFixGame.session;
    const list = $("explanationList");
    list.innerHTML = "";

    if (!session || !session.log.length) {
      list.innerHTML = `<p>Play a level to see bug explanations here.</p>`;
      $("explanationLevelLabel").textContent = "";
      return;
    }

    $("explanationLevelLabel").textContent = `Level ${session.level.id} — ${session.level.title}`;

    session.log.forEach((entry, idx) => {
      const card = document.createElement("div");
      card.className = "explanation-card" + (idx === 0 ? " open" : "");
      const badge = entry.correct
        ? `<span class="explanation-card__badge explanation-card__badge--correct">Correct</span>`
        : `<span class="explanation-card__badge explanation-card__badge--wrong">Missed</span>`;

      card.innerHTML = `
        <button class="explanation-card__head" type="button">
          <span>BUG #${idx + 1} — Line ${entry.bug.line} ${badge}</span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div class="explanation-card__body">
          <p><strong>Your answer:</strong> ${escapeHtml(entry.bug.options[entry.selectedOptionIndex] || "—")}</p>
          <div class="fixed-line">${escapeHtml(entry.bug.fixedLine)}</div>
          <p>${escapeHtml(entry.bug.explanation)}</p>
        </div>
      `;
      card.querySelector(".explanation-card__head").addEventListener("click", () => {
        card.classList.toggle("open");
      });
      list.appendChild(card);
    });
  }

  /* ============================================================
     LEARN PAGE
  ============================================================ */
  function renderLearn() {
    const grid = $("learnGrid");
    grid.innerHTML = "";
    CODEFIX_DATA.learnTopics.forEach(topic => {
      const card = document.createElement("div");
      card.className = "learn-card";
      card.innerHTML = `
        <span class="learn-card__icon">${topic.icon}</span>
        <h3>${escapeHtml(topic.title)}</h3>
        <p>${escapeHtml(topic.desc)}</p>
        <button class="btn btn--outline">${topic.levelId ? "PRACTICE NOW" : "COMING SOON"}</button>
      `;
      const btn = card.querySelector("button");
      if (topic.levelId) {
        btn.addEventListener("click", () => navigate("levelintro", { levelId: topic.levelId }));
      } else {
        btn.disabled = true;
      }
      grid.appendChild(card);
    });
  }

  /* ============================================================
     LEADERBOARD
  ============================================================ */
  function renderLeaderboard() {
    const list = $("leaderboardList");
    list.innerHTML = "";
    const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
    CODEFIX_DATA.leaderboard.forEach(row => {
      const li = document.createElement("li");
      li.className = "leaderboard-row" + (row.you ? " is-you" : "");
      li.innerHTML = `
        <span class="leaderboard-row__rank ${medals[row.rank] ? "leaderboard-row__rank--medal" : ""}">${medals[row.rank] || row.rank}</span>
        <span class="leaderboard-row__name">${escapeHtml(row.name)}${row.you ? " (You)" : ""}</span>
        <span class="leaderboard-row__xp">${row.xp.toLocaleString()} XP</span>
      `;
      list.appendChild(li);
    });
  }

  qsa("#leaderboardTabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      qsa("#leaderboardTabs .tab").forEach(t => t.classList.remove("tab--active"));
      tab.classList.add("tab--active");
      showToast(`Showing ${tab.textContent} leaderboard (sample data).`);
    });
  });
  qsa("#leaderboardTimeTabs .tab").forEach(tab => {
    tab.addEventListener("click", () => {
      qsa("#leaderboardTimeTabs .tab").forEach(t => t.classList.remove("tab--active"));
      tab.classList.add("tab--active");
    });
  });

  /* ============================================================
     ACHIEVEMENTS
  ============================================================ */
  function renderAchievementGrid(targetEl) {
    targetEl.innerHTML = "";
    CODEFIX_DATA.achievements.forEach(a => {
      const unlocked = CodeFixGame.player.achievements.includes(a.id);
      const card = document.createElement("div");
      card.className = "achievement-card " + (unlocked ? "unlocked" : "locked");
      card.innerHTML = `
        <span class="achievement-card__icon">${a.icon}</span>
        <h3>${escapeHtml(a.title)}</h3>
        <p>${escapeHtml(a.desc)}</p>
      `;
      targetEl.appendChild(card);
    });
  }
  function renderAchievements() { renderAchievementGrid($("achievementGrid")); }

  /* ============================================================
     PROFILE
  ============================================================ */
  function renderProfile() {
    const p = CodeFixGame.player;
    $("profileAvatar").textContent = p.name.charAt(0).toUpperCase();
    $("profileName").textContent = p.name;
    $("profileLevel").textContent = `Level ${p.level}`;
    $("profileXp").textContent = `${p.xp.toLocaleString()} XP`;
    $("profileStreak").textContent = p.streak;

    $("profileLevelsCompleted").textContent = Object.keys(p.completedLevels).length;
    $("profileBugsFixed").textContent = p.bugsFixed;
    $("profileAccuracy").textContent = p.accuracy + "%";
    $("profileHints").textContent = p.hintsUsed;

    const pct = Math.round((Object.keys(p.completedLevels).length / CODEFIX_DATA.levels.length) * 100);
    $("profileProgressFill").style.width = pct + "%";
    $("profileProgressLabel").textContent = `${pct}% of all levels completed`;

    renderAchievementGrid($("profileAchievementGrid"));
  }

  /* ============================================================
     SETTINGS
  ============================================================ */
  function renderSettings() {
    $("settingsEmail").textContent = loggedInEmail;
  }
  $("logoutBtn").addEventListener("click", () => {
    showToast("Logged out.");
    navigate("landing");
  });
  $("resetProgressBtn").addEventListener("click", () => {
    if (confirm("Reset all CodeFix progress? This can't be undone.")) {
      CodeFixGame.resetPlayer();
      showToast("Progress reset.");
      navigate("dashboard");
    }
  });
  qsa(".switch input, .select").forEach(el => {
    el.addEventListener("change", () => showToast("Setting saved (prototype only)."));
  });

  /* ============================================================
     INIT
  ============================================================ */
  function init() {
    CodeFixGame.loadPlayer();
    navigate("landing");
  }
  document.addEventListener("DOMContentLoaded", init);
})();
