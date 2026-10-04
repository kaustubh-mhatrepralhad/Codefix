const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { get, all, run } = require('./db');
const seedDatabase = require('./seed');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'codefix_secret_key_2026';

app.use(cors());
app.use(express.json());

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Helper: Format user object for frontend compatibility
async function getUserFullProfile(userId) {
  const user = await get(
    'SELECT id, email, name, xp, streak, level, bugs_fixed as bugsFixed, accuracy, hints_used as hintsUsed, unlocked_level_id as unlockedLevelId FROM users WHERE id = ?',
    [userId]
  );
  if (!user) return null;

  // Get completed levels
  const progressRows = await all(
    'SELECT level_id, stars, xp, accuracy, time_seconds as time FROM user_level_progress WHERE user_id = ?',
    [userId]
  );

  const completedLevels = {};
  progressRows.forEach(row => {
    completedLevels[row.level_id] = {
      stars: row.stars,
      xp: row.xp,
      accuracy: row.accuracy,
      time: row.time
    };
  });

  // Get user achievements
  const achRows = await all(
    'SELECT achievement_id FROM user_achievements WHERE user_id = ?',
    [userId]
  );
  const achievements = achRows.map(r => r.achievement_id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    xp: user.xp,
    streak: user.streak,
    level: user.level,
    bugsFixed: user.bugsFixed,
    accuracy: user.accuracy,
    hintsUsed: user.hintsUsed,
    unlockedLevelId: user.unlockedLevelId,
    completedLevels,
    achievements
  };
}

// ------------------- API ROUTES -------------------

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeFix Backend API Server is running 🚀', timestamp: new Date() });
});

// 2. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (name, email, password_hash, xp, streak, level, bugs_fixed, accuracy, hints_used, unlocked_level_id) VALUES (?, ?, ?, 0, 1, 1, 0, 100, 0, 1)',
      [name, email, passwordHash]
    );

    const userId = result.lastID;
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    const profile = await getUserFullProfile(userId);

    res.status(201).json({ message: 'User registered successfully', token, user: profile });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error registering user' });
  }
});

// 3. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const profile = await getUserFullProfile(user.id);

    res.json({ message: 'Login successful', token, user: profile });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 4. User Profile & Progress (Authenticated or by Email)
app.get('/api/user/profile', async (req, res) => {
  try {
    const email = req.query.email || 'you@example.com';
    const user = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = await getUserFullProfile(user.id);
    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
});

// 5. Save Level Progress & Sync Player Stats
app.post('/api/user/progress', async (req, res) => {
  try {
    const { email, levelId, stars, xpEarned, accuracy, timeSeconds, bugsFixedCount, hintsUsedCount, achievementsUnlocked } = req.body;
    const userEmail = email || 'you@example.com';

    const user = await get('SELECT * FROM users WHERE email = ?', [userEmail]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.id;

    // Save or update user_level_progress
    const existingProgress = await get('SELECT stars FROM user_level_progress WHERE user_id = ? AND level_id = ?', [userId, levelId]);
    if (!existingProgress) {
      await run(
        'INSERT INTO user_level_progress (user_id, level_id, stars, xp, accuracy, time_seconds) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, levelId, stars, xpEarned, accuracy, timeSeconds]
      );
    } else if (stars > existingProgress.stars) {
      await run(
        'UPDATE user_level_progress SET stars = ?, xp = ?, accuracy = ?, time_seconds = ? WHERE user_id = ? AND level_id = ?',
        [stars, xpEarned, accuracy, timeSeconds, userId, levelId]
      );
    }

    // Update overall user stats
    const newXp = user.xp + (xpEarned || 0);
    const newBugsFixed = user.bugs_fixed + (bugsFixedCount || 0);
    const newHintsUsed = user.hints_used + (hintsUsedCount || 0);
    const nextUnlockedLevelId = Math.max(user.unlocked_level_id, levelId + 1);
    const newLevel = Math.max(user.level, Math.floor(newXp / 200));

    await run(
      'UPDATE users SET xp = ?, bugs_fixed = ?, hints_used = ?, unlocked_level_id = ?, level = ? WHERE id = ?',
      [newXp, newBugsFixed, newHintsUsed, nextUnlockedLevelId, newLevel, userId]
    );

    // Save any newly unlocked achievements
    if (Array.isArray(achievementsUnlocked)) {
      for (const achId of achievementsUnlocked) {
        await run(
          'INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
          [userId, achId]
        );
      }
    }

    const updatedProfile = await getUserFullProfile(userId);
    res.json({ message: 'Progress saved successfully', user: updatedProfile });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: 'Server error saving progress' });
  }
});

// 6. Get All Levels with Bugs
app.get('/api/levels', async (req, res) => {
  try {
    const levels = await all('SELECT * FROM levels ORDER BY id ASC');
    const result = [];

    for (const lvl of levels) {
      const bugs = await all('SELECT * FROM bugs WHERE level_id = ? ORDER BY bug_order ASC', [lvl.id]);
      result.push({
        id: lvl.id,
        title: lvl.title,
        topic: lvl.topic,
        icon: lvl.icon,
        difficulty: lvl.difficulty,
        maxXp: lvl.max_xp,
        description: lvl.description,
        task: lvl.task,
        code: JSON.parse(lvl.code_json),
        bugs: bugs.map(b => ({
          line: b.line,
          options: JSON.parse(b.options_json),
          correctIndex: b.correct_index,
          hint: b.hint,
          fixedLine: b.fixed_line,
          explanation: b.explanation
        }))
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ error: 'Server error fetching levels' });
  }
});

// 7. Get Single Level by ID
app.get('/api/levels/:id', async (req, res) => {
  try {
    const lvlId = parseInt(req.params.id, 10);
    const lvl = await get('SELECT * FROM levels WHERE id = ?', [lvlId]);
    if (!lvl) {
      return res.status(404).json({ error: 'Level not found' });
    }

    const bugs = await all('SELECT * FROM bugs WHERE level_id = ? ORDER BY bug_order ASC', [lvlId]);
    const levelData = {
      id: lvl.id,
      title: lvl.title,
      topic: lvl.topic,
      icon: lvl.icon,
      difficulty: lvl.difficulty,
      maxXp: lvl.max_xp,
      description: lvl.description,
      task: lvl.task,
      code: JSON.parse(lvl.code_json),
      bugs: bugs.map(b => ({
        line: b.line,
        options: JSON.parse(b.options_json),
        correctIndex: b.correct_index,
        hint: b.hint,
        fixedLine: b.fixed_line,
        explanation: b.explanation
      }))
    };

    res.json(levelData);
  } catch (error) {
    console.error('Get level error:', error);
    res.status(500).json({ error: 'Server error fetching level' });
  }
});

// 8. Get Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const currentUserEmail = req.query.email || 'you@example.com';
    const users = await all('SELECT name, email, xp FROM users ORDER BY xp DESC LIMIT 20');

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      name: u.name,
      xp: u.xp,
      you: u.email === currentUserEmail
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

// 9. Get Learn Topics
app.get('/api/learn', async (req, res) => {
  try {
    const rows = await all('SELECT id, icon, title, desc, level_id as levelId FROM learn_topics');
    res.json(rows);
  } catch (error) {
    console.error('Get learn topics error:', error);
    res.status(500).json({ error: 'Server error fetching learn topics' });
  }
});

// 10. Get Achievements
app.get('/api/achievements', async (req, res) => {
  try {
    const rows = await all('SELECT id, icon, title, desc FROM achievements');
    res.json(rows);
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Server error fetching achievements' });
  }
});

// Start Server after database is initialized & seeded
seedDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🟢 CODEFIX BACKEND API SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database server:', err);
});
