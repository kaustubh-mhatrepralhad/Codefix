# CodeFix Backend & Database Server 🛠️

This is the backend REST API server and database for the **CodeFix** interactive debugging web application.

## 🗄️ Database Architecture

The backend uses an **SQLite** database (`codefix.db`) by default for zero-config local development, and includes a full SQL schema (`schema.sql`) compatible with **PostgreSQL** & **Supabase**.

### Database Tables:
1. **`users`**: Stores player accounts, total XP, streak, level, bugs fixed, accuracy, and highest unlocked level.
2. **`levels`**: Stores level titles, topics, difficulty ratings, descriptions, tasks, and JSON-encoded code snippets.
3. **`bugs`**: Stores bug details per level (line number, multiple choice options, correct index, hint, fixed line, and explanation).
4. **`user_level_progress`**: Tracks player progress per level (stars, XP earned, accuracy %, time taken, completion timestamp).
5. **`achievements`**: Game achievements/badges.
6. **`user_achievements`**: Join table tracking unlocked achievements per user.
7. **`learn_topics`**: Learning topics linked to specific game levels.

---

## 🚀 How to Run the Backend Server

### 1. Install Dependencies & Seed Database
```bash
cd backend
npm install
node seed.js
```

### 2. Start the API Server
```bash
npm start
```
> The server runs on **`http://localhost:5000`** by default.

---

## 📡 REST API Endpoints

### Health Check
- `GET /api/health` — Checks API server status.

### Authentication
- `POST /api/auth/register` — Create a new account (`name`, `email`, `password`).
- `POST /api/auth/login` — Login with `email` and `password`. Returns JWT token & user profile.

### Game Content & Progress
- `GET /api/levels` — Fetch all levels and bugs.
- `GET /api/levels/:id` — Fetch a specific level by ID.
- `GET /api/user/profile?email=you@example.com` — Fetch player profile & completed levels.
- `POST /api/user/progress` — Save completed level results, XP, stars, and unlock achievements.
- `GET /api/leaderboard` — Fetch live top player rankings ordered by XP.
- `GET /api/learn` — Fetch learning topics.
- `GET /api/achievements` — Fetch all game achievements.
