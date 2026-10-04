export const State = {
  baseUrl: 'http://localhost:5000/api',
  isOnline: false,
  user: null,
  levels: [],
  leaderboard: [],

  async initialize() {
    await this.checkBackend();
    
    // Check local storage for token
    const token = localStorage.getItem('codefix_token');
    const email = localStorage.getItem('codefix_email');
    
    if (token && email) {
      if (this.isOnline) {
        await this.fetchProfile(email);
      } else {
        // Fallback to local user
        const localUser = localStorage.getItem('codefix_user_v2');
        if (localUser) this.user = JSON.parse(localUser);
      }
    }

    if (this.isOnline) {
      await this.fetchLevels();
      await this.fetchLeaderboard();
    } else {
      // Fallback data
      this.levels = [
        { id: 1, title: 'Variable Valley', topic: 'Variables', difficulty: 1, max_xp: 150, locked: false },
        { id: 2, title: 'Type Trouble', topic: 'Data Types', difficulty: 1, max_xp: 180, locked: true }
      ];
    }
  },

  async checkBackend() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(1500) });
      this.isOnline = res.ok;
    } catch {
      this.isOnline = false;
    }
  },

  isLoggedIn() {
    return this.user !== null;
  },

  async fetchProfile(email) {
    try {
      const res = await fetch(`${this.baseUrl}/user/profile?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        this.user = await res.json();
        localStorage.setItem('codefix_user_v2', JSON.stringify(this.user));
      }
    } catch (e) {
      console.warn('Failed to fetch profile', e);
    }
  },

  async fetchLevels() {
    try {
      const res = await fetch(`${this.baseUrl}/levels`);
      if (res.ok) {
        this.levels = await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch levels', e);
    }
  },

  async fetchLeaderboard() {
    try {
      const res = await fetch(`${this.baseUrl}/leaderboard`);
      if (res.ok) {
        this.leaderboard = await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch leaderboard', e);
    }
  },

  logout() {
    this.user = null;
    localStorage.removeItem('codefix_token');
    localStorage.removeItem('codefix_email');
    localStorage.removeItem('codefix_user_v2');
  }
};
