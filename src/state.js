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
        { 
          id: 1, title: 'Variable Valley', topic: 'Variables', difficulty: 1, max_xp: 150, locked: false,
          description: "A student is trying to store their score in a variable, but typed the name differently every time they used it.",
          task: "Find and correct the mistake.",
          code: [
            { n: 1, text: "score = 10" },
            { n: 2, text: "Score = score + 5" },
            { n: 3, text: "print(score)" }
          ],
          bugs: [
            {
              bugOrder: 1,
              line: 2,
              options: [
                "Missing colon",
                "Wrong variable name (case mismatch)",
                "Wrong operator",
                "No error"
              ],
              correctIndex: 1,
              hint: "Python is case-sensitive. Look closely at the capitalization on line 2.",
              fixedLine: "score = score + 5",
              explanation: '"Score" and "score" are two different variables in Python because variable names are case-sensitive. Line 2 accidentally created a brand-new variable instead of updating the original.'
            }
          ]
        },
        { 
          id: 2, title: 'Type Trouble', topic: 'Data Types', difficulty: 1, max_xp: 180, locked: true,
          description: "A program should add two numbers entered by the user, but keeps joining them like text instead.",
          task: "Find and correct both mistakes.",
          code: [
            { n: 1, text: 'a = input("Enter first number: ")' },
            { n: 2, text: 'b = input("Enter second number: ")' },
            { n: 3, text: 'total = a + b' },
            { n: 4, text: 'print("Total:", total)' }
          ],
          bugs: [
            {
              bugOrder: 1,
              line: 1,
              options: [
                "input() should be int(input())",
                "Missing colon",
                "Wrong variable name",
                "No error"
              ],
              correctIndex: 0,
              hint: "input() always returns text (a string), even if the user types a number.",
              fixedLine: 'a = int(input("Enter first number: "))',
              explanation: 'input() always returns a string. Without converting it with int(), line 3 joins the two strings together ("3"+"4" becomes "34") instead of adding numbers.'
            }
          ]
        }
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
