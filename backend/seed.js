const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { initDb, run, get, all } = require('./db');

const initialData = {
  defaultUser: {
    email: 'you@example.com',
    password: 'password123',
    name: 'Kaustubh',
    xp: 1250,
    streak: 5,
    level: 7,
    bugsFixed: 42,
    accuracy: 91,
    hintsUsed: 14,
    unlockedLevelId: 3,
    completedLevels: [
      { levelId: 1, stars: 3, xp: 130, accuracy: 100, timeSeconds: 62 },
      { levelId: 2, stars: 2, xp: 150, accuracy: 85, timeSeconds: 98 }
    ],
    unlockedAchievements: ['first-bug', 'streak-master']
  },

  leaderboardUsers: [
    { email: 'rahul@example.com', name: 'Rahul', xp: 5420 },
    { email: 'priya@example.com', name: 'Priya', xp: 5120 },
    { email: 'aman@example.com', name: 'Aman', xp: 4850 },
    { email: 'rohan@example.com', name: 'Rohan', xp: 4100 },
    { email: 'sneha@example.com', name: 'Sneha', xp: 3870 },
    { email: 'vikram@example.com', name: 'Vikram', xp: 3510 }
  ],

  achievements: [
    { id: 'first-bug', icon: '🐞', title: 'First Bug', desc: 'Find your first bug.' },
    { id: 'streak-master', icon: '🔥', title: 'Streak Master', desc: 'Play for 7 consecutive days.' },
    { id: 'speed-debugger', icon: '⚡', title: 'Speed Debugger', desc: 'Complete a level in under 2 minutes.' },
    { id: 'no-hint-master', icon: '🧠', title: 'No Hint Master', desc: 'Complete 5 levels without hints.' },
    { id: 'code-master', icon: '👑', title: 'Code Master', desc: 'Complete all levels.' }
  ],

  learnTopics: [
    { id: 'variables', icon: '🌱', title: 'Variables', desc: 'Learn how variables store information.', levelId: 1 },
    { id: 'data-types', icon: '🔤', title: 'Data Types', desc: 'Understand text, numbers, and booleans.', levelId: 2 },
    { id: 'operators', icon: '➗', title: 'Operators', desc: 'Compare, calculate, and assign values.', levelId: 3 },
    { id: 'conditions', icon: '🐞', title: 'Conditions', desc: 'Make decisions with if / else logic.', levelId: 4 },
    { id: 'loops', icon: '🔁', title: 'Loops', desc: 'Repeat actions without repeating code.', levelId: 5 },
    { id: 'functions', icon: '🧩', title: 'Functions', desc: 'Package logic into reusable blocks.', levelId: null },
    { id: 'arrays', icon: '📚', title: 'Arrays', desc: 'Store and organize collections of data.', levelId: null },
    { id: 'strings', icon: '✂️', title: 'Strings', desc: 'Slice, search, and format text.', levelId: null }
  ],

  levels: [
    {
      id: 1,
      title: "Variable Valley",
      topic: "Variables",
      icon: "🌱",
      difficulty: 1,
      maxXp: 150,
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
      id: 2,
      title: "Type Trouble",
      topic: "Data Types",
      icon: "🔤",
      difficulty: 1,
      maxXp: 180,
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
        },
        {
          bugOrder: 2,
          line: 2,
          options: [
            "input() should be int(input())",
            "Wrong operator",
            "Missing print",
            "No error"
          ],
          correctIndex: 0,
          hint: "The same problem from line 1 repeats here.",
          fixedLine: 'b = int(input("Enter second number: "))',
          explanation: "Just like line 1, this value needs to be converted to an integer before it can be added as a number."
        }
      ]
    },
    {
      id: 3,
      title: "Operator Outpost",
      topic: "Operators",
      icon: "➗",
      difficulty: 2,
      maxXp: 200,
      description: "A program is supposed to check if a number is exactly equal to 10, but something is off with the comparison.",
      task: "Find and correct both mistakes.",
      code: [
        { n: 1, text: "number = 10" },
        { n: 2, text: "if number = 10:" },
        { n: 3, text: '    print("Match!")' },
        { n: 4, text: "total = 10 % 3" },
        { n: 5, text: "print(total)" }
      ],
      bugs: [
        {
          bugOrder: 1,
          line: 2,
          options: [
            "Should use == instead of =",
            "Missing colon",
            "Wrong variable name",
            "No error"
          ],
          correctIndex: 0,
          hint: "A single = assigns a value. Comparing two values needs a different operator.",
          fixedLine: "if number == 10:",
          explanation: "A single = is the assignment operator, used to store a value. To compare two values, Python needs the equality operator ==."
        },
        {
          bugOrder: 2,
          line: 4,
          options: [
            "% should be //",
            "Should use == instead of =",
            "Missing colon",
            "No error"
          ],
          correctIndex: 1,
          hint: "This line is actually testing your attention — read it again.",
          fixedLine: "total = 10 % 3",
          explanation: "Trick line! % is the modulo operator and correctly returns the remainder of 10 divided by 3 (which is 1). This line has no bug."
        }
      ]
    },
    {
      id: 4,
      title: "Condition Crash",
      topic: "Conditions",
      icon: "🐞",
      difficulty: 2,
      maxXp: 250,
      description: "A student wrote a program to determine whether someone is eligible to vote. Unfortunately, the program contains multiple mistakes.",
      task: "Find and correct all the bugs.",
      code: [
        { n: 1, text: 'age = int(input("Enter your age: "))' },
        { n: 2, text: "if age > 18" },
        { n: 3, text: '    print("You are eligible")' },
        { n: 4, text: "else:" },
        { n: 5, text: '    print("You are not eligible")' }
      ],
      bugs: [
        {
          bugOrder: 1,
          line: 2,
          options: [
            "Missing colon",
            "Wrong variable",
            "Wrong operator",
            "No error"
          ],
          correctIndex: 0,
          hint: "Every if statement in Python needs to end with a certain punctuation mark.",
          fixedLine: "if age >= 18:",
          explanation: "The if statement is missing a colon at the end. Python uses the colon to mark the start of the indented block that follows."
        },
        {
          bugOrder: 2,
          line: 2,
          options: [
            "Missing colon",
            "Wrong variable",
            "Should be >= instead of >",
            "No error"
          ],
          correctIndex: 2,
          hint: "Someone who is exactly 18 should be eligible — is that what the code currently does?",
          fixedLine: "if age >= 18:",
          explanation: 'The >= operator means "greater than or equal to." Using > alone would incorrectly exclude someone who is exactly 18.'
        }
      ]
    },
    {
      id: 5,
      title: "Loop Labyrinth",
      topic: "Loops",
      icon: "🔁",
      difficulty: 3,
      maxXp: 260,
      description: "A program should print the numbers 1 through 5, but it either loops forever or misses a number.",
      task: "Find and correct all the bugs.",
      code: [
        { n: 1, text: "i = 1" },
        { n: 2, text: "while i < 5:" },
        { n: 3, text: "    print(i)" },
        { n: 4, text: "    i = i" }
      ],
      bugs: [
        {
          bugOrder: 1,
          line: 2,
          options: [
            "Should be i <= 5",
            "Missing colon",
            "Wrong variable name",
            "No error"
          ],
          correctIndex: 0,
          hint: "Trace through the loop by hand — which number never gets printed?",
          fixedLine: "while i <= 5:",
          explanation: "With i < 5, the loop stops before i reaches 5, so 5 is never printed. Changing it to <= 5 includes the final number."
        },
        {
          bugOrder: 2,
          line: 4,
          options: [
            "Missing colon",
            "i is never incremented, causing an infinite loop",
            "Wrong print statement",
            "No error"
          ],
          correctIndex: 1,
          hint: "What value does i have on the second pass through the loop? And the third?",
          fixedLine: "    i = i + 1",
          explanation: "i = i doesn't change i at all, so the condition i <= 5 is always true and the loop never ends. It needs to increase i on every pass, e.g. i = i + 1."
        }
      ]
    }
  ]
};

async function seedDatabase() {
  console.log('⚡ Initializing CodeFix database schema...');
  await initDb();

  // Check if levels already exist
  const existingLevels = await get('SELECT COUNT(*) as count FROM levels');
  if (existingLevels && existingLevels.count > 0) {
    console.log('✅ Database already seeded.');
    return;
  }

  console.log('🌱 Seeding achievements...');
  for (const ach of initialData.achievements) {
    await run(
      'INSERT INTO achievements (id, icon, title, desc) VALUES (?, ?, ?, ?)',
      [ach.id, ach.icon, ach.title, ach.desc]
    );
  }

  console.log('🌱 Seeding levels & bugs...');
  for (const lvl of initialData.levels) {
    await run(
      'INSERT INTO levels (id, title, topic, icon, difficulty, max_xp, description, task, code_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        lvl.id,
        lvl.title,
        lvl.topic,
        lvl.icon,
        lvl.difficulty,
        lvl.maxXp,
        lvl.description,
        lvl.task,
        JSON.stringify(lvl.code)
      ]
    );

    for (const bug of lvl.bugs) {
      await run(
        'INSERT INTO bugs (level_id, bug_order, line, options_json, correct_index, hint, fixed_line, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          lvl.id,
          bug.bugOrder,
          bug.line,
          JSON.stringify(bug.options),
          bug.correctIndex,
          bug.hint,
          bug.fixedLine,
          bug.explanation
        ]
      );
    }
  }

  console.log('🌱 Seeding learn topics...');
  for (const topic of initialData.learnTopics) {
    await run(
      'INSERT INTO learn_topics (id, icon, title, desc, level_id) VALUES (?, ?, ?, ?, ?)',
      [topic.id, topic.icon, topic.title, topic.desc, topic.levelId]
    );
  }

  console.log('🌱 Seeding default user (Kaustubh)...');
  const defaultPassHash = await bcrypt.hash(initialData.defaultUser.password, 10);
  const userResult = await run(
    `INSERT INTO users (email, password_hash, name, xp, streak, level, bugs_fixed, accuracy, hints_used, unlocked_level_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      initialData.defaultUser.email,
      defaultPassHash,
      initialData.defaultUser.name,
      initialData.defaultUser.xp,
      initialData.defaultUser.streak,
      initialData.defaultUser.level,
      initialData.defaultUser.bugsFixed,
      initialData.defaultUser.accuracy,
      initialData.defaultUser.hintsUsed,
      initialData.defaultUser.unlockedLevelId
    ]
  );
  const userId = userResult.lastID;

  // Insert default user level progress
  for (const progress of initialData.defaultUser.completedLevels) {
    await run(
      `INSERT INTO user_level_progress (user_id, level_id, stars, xp, accuracy, time_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, progress.levelId, progress.stars, progress.xp, progress.accuracy, progress.timeSeconds]
    );
  }

  // Insert default user achievements
  for (const achId of initialData.defaultUser.unlockedAchievements) {
    await run(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
      [userId, achId]
    );
  }

  console.log('🌱 Seeding leaderboard demo users...');
  for (const lbUser of initialData.leaderboardUsers) {
    const hash = await bcrypt.hash('password123', 10);
    await run(
      'INSERT INTO users (email, password_hash, name, xp, streak, level) VALUES (?, ?, ?, ?, 3, 5)',
      [lbUser.email, hash, lbUser.name, lbUser.xp]
    );
  }

  console.log('✨ CodeFix database seeding complete!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error seeding database:', err);
      process.exit(1);
    });
}

module.exports = seedDatabase;
