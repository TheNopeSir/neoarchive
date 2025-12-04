
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const DIST_DIR = path.join(__dirname, 'dist');

// Increase limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(cors());

// Serve static frontend files
app.use(express.static(DIST_DIR));

// --- INITIAL DATA FOR FRESH INSTALL OR RESET ---
const INITIAL_DB_STATE = {
  exhibits: [
    {
        id: '1',
        title: 'Прототип Nokia 3310',
        description: 'Неразрушимое устройство связи из эпохи до смартфонов. Заряд батареи: бесконечный. Артефакт древней цивилизации.',
        imageUrls: ['https://picsum.photos/400/300?random=1'],
        category: 'ТЕЛЕФОНЫ',
        owner: 'Morpheus',
        timestamp: '24.10.2023 10:00',
        likes: 1337,
        likedBy: [],
        views: 8542,
        rating: 5,
        quality: 'Оригинальный корпус',
        specs: { 'Год выпуска': '2000', 'Вес': '133 г', 'Экран': 'Монохромный' },
        comments: []
    },
    {
        id: '2',
        title: 'Game Boy Color (Clear)',
        description: 'Портативная консоль в прозрачном корпусе "Atomic Purple".',
        imageUrls: ['https://picsum.photos/400/300?random=2'],
        category: 'ИГРЫ',
        owner: 'Trinity',
        timestamp: '25.10.2023 14:20',
        likes: 404,
        likedBy: [],
        views: 2103,
        rating: 5,
        quality: 'Мелкие царапины',
        specs: { 'Процессор': 'Z80', 'Цвет': 'Atomic Purple' },
        comments: []
    },
    {
        id: '3',
        title: 'Hacker Magazine #13',
        description: 'Редкий выпуск журнала "Хакер".',
        imageUrls: ['https://picsum.photos/400/300?random=3'],
        category: 'ЖУРНАЛЫ',
        owner: 'Tank',
        timestamp: '26.10.2023 09:15',
        likes: 99,
        likedBy: [],
        views: 567,
        rating: 4,
        quality: 'Надорвана обложка',
        specs: { 'Страниц': '120', 'Издательство': 'Gameland' },
        comments: []
    }
  ],
  collections: [],
  notifications: [],
  messages: [],
  guestbook: [],
  users: [
      {
        username: "Neo_User_01",
        tagline: "Подключен к сети.",
        avatarUrl: "https://picsum.photos/100/100?grayscale",
        joinedDate: "31.12.1999",
        following: [],
        password: "123",
        isAdmin: false
      }
  ]
};

// Ensure DB directory exists and Initialize
const initDb = async () => {
  try {
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    
    let shouldSeed = false;

    try {
      await fs.access(DB_FILE);
      // File exists, check if empty
      const content = await fs.readFile(DB_FILE, 'utf-8');
      const json = JSON.parse(content);
      
      // CRITICAL FIX: If exhibits array is empty, force re-seed
      if (!json.exhibits || json.exhibits.length === 0) {
          console.log("Database file exists but exhibits list is empty. Re-seeding...");
          shouldSeed = true;
      }
    } catch (e) {
      // File doesn't exist or is corrupt
      console.log("Database missing or corrupt. Creating new...");
      shouldSeed = true;
    }

    if (shouldSeed) {
        await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_DB_STATE, null, 2));
        console.log("Database seeded successfully.");
    }

  } catch (err) {
    console.error("DB Init Error:", err);
  }
};
initDb();

// --- API ROUTES ---

// Get all data
app.get('/api/db', async (req, res) => {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Read DB Error:", err);
    res.status(500).json({ error: 'Failed to read DB' });
  }
});

// Sync data
app.post('/api/sync', async (req, res) => {
  try {
    const { key, data } = req.body;
    const currentFile = await fs.readFile(DB_FILE, 'utf-8');
    const db = JSON.parse(currentFile);
    db[key] = data;
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Write DB Error:", err);
    res.status(500).json({ error: 'Failed to write DB' });
  }
});

// Admin: Reset DB
app.post('/api/reset', async (req, res) => {
  try {
      await fs.writeFile(DB_FILE, JSON.stringify(INITIAL_DB_STATE, null, 2));
      res.json({ success: true });
  } catch (e) {
      res.status(500).json({ error: e.message });
  }
});

// --- HANDLE REACT ROUTING ---
app.get(/.*/, (req, res) => {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found. Please build and upload "dist" folder.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
