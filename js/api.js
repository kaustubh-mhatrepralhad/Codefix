/* ============================================================
   CODEFIX — api.js
   Optional backend database sync module. Connects the frontend to
   http://localhost:5000/api when the Node/Express server is active.
   If the server is offline, it falls back silently to localStorage.
   ============================================================ */

const CodeFixAPI = {
  baseUrl: "http://localhost:5000/api",
  isOnline: false,

  async checkBackend() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        this.isOnline = true;
        console.log("🟢 Connected to CodeFix Backend Database Server");
        return true;
      }
    } catch (e) {
      this.isOnline = false;
      console.log("ℹ️ CodeFix Backend Server offline — using localStorage mode.");
    }
    return false;
  },

  async syncLevels() {
    if (!this.isOnline) return;
    try {
      const res = await fetch(`${this.baseUrl}/levels`);
      if (res.ok) {
        const levels = await res.json();
        if (Array.isArray(levels) && levels.length > 0) {
          CODEFIX_DATA.levels = levels;
        }
      }
    } catch (e) {
      console.warn("Could not sync levels from backend:", e);
    }
  },

  async syncProfile(email) {
    if (!this.isOnline) return null;
    try {
      const res = await fetch(`${this.baseUrl}/user/profile?email=${encodeURIComponent(email || 'you@example.com')}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not sync profile from backend:", e);
    }
    return null;
  },

  async saveProgress(progressData) {
    if (!this.isOnline) return null;
    try {
      const res = await fetch(`${this.baseUrl}/user/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progressData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not save progress to backend:", e);
    }
    return null;
  },

  async syncLeaderboard() {
    if (!this.isOnline) return null;
    try {
      const res = await fetch(`${this.baseUrl}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          CODEFIX_DATA.leaderboard = data;
        }
        return data;
      }
    } catch (e) {
      console.warn("Could not sync leaderboard from backend:", e);
    }
    return null;
  }
};

// Check backend availability on load
if (typeof window !== "undefined") {
  CodeFixAPI.checkBackend().then(online => {
    if (online) {
      CodeFixAPI.syncLevels();
      CodeFixAPI.syncLeaderboard();
    }
  });
}
