import express from 'express';
import cors from 'cors';
import {Server} from 'socket.io';
import http from 'http';
import Database from 'better-sqlite3';

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// --- DB init ---
const db = new Database('insyd.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id INTEGER NOT NULL,
  followee_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, followee_id)
);
CREATE TABLE IF NOT EXISTS content (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  like INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  event_id TEXT NOT NULL,
  recipient_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  actor_id INTEGER NOT NULL,
  content_id INTEGER,
  metadata_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  read INTEGER DEFAULT 0,
  UNIQUE(event_id, recipient_id)
);
`);

// --- Socket.IO ---
io.on('connection', (socket) => {
  const { user_id } = socket.handshake.query;
  if (user_id) {
    socket.join(`room:user:${user_id}`);
    console.log(`Socket ${socket.id} joined room:user:${user_id}`);
  }
  socket.on('disconnect', () => {});
});

// --- Helpers ---
function emitNotification(n) {
  io.to(`room:user:${n.recipient_id}`).emit('notification', n);
}
// function emitPost(n){
//   io.emit("posts",n)
// }

// Simple heuristic scorer (placeholder for AI ranking hook)
function scoreNotification(n) {
  // base on recency (newer = higher)
  return Date.now();
}

// --- API ---
app.get('/health', (_, res) => res.json({ ok: true }));

// List notifications (latest first)
app.get('/notifications', (req, res) => {
  const userId = Number(req.query.user_id);
  if (!userId) return res.status(400).json({ error: 'user_id required' });
  const stmt = db.prepare(`SELECT * FROM notifications WHERE recipient_id = ? ORDER BY id DESC LIMIT 200`);
  const rows = stmt.all(userId);
  res.json(rows);
});

app.get('/posts', (req, res) => {
  const followerId = Number(req.query.follower_id);
  if (!followerId) return res.status(400).json({ error: 'follower_id required' });
  const stmt = db.prepare(`SELECT * FROM content WHERE author_id = ? ORDER BY id DESC LIMIT 200`);
  const rows = stmt.all(followerId);
  res.json(rows);
});

// Mark read
app.post('/notifications/:id/read', (req, res) => {
  const id = Number(req.params.id);
  const upd = db.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`).run(id);
  res.json({ updated: upd.changes });
});

// Create content (for demo)
app.post('/content', (req, res) => {
  const { author_id, type } = req.body;
  console.log("Author_ID: ",author_id,"\tType: ",type)
  if (!author_id) return res.status(400).json({ error: 'author_id required' });
  const info = db.prepare(`INSERT INTO content (author_id, type) VALUES (?, ?)`).run(author_id, type || 'post');
  res.json({ id: info.lastInsertRowid });
});

// Create follow (for demo)
app.post('/follows', (req, res) => {
  const { follower_id, followee_id } = req.body;
  if (!follower_id || !followee_id) return res.status(400).json({ error: 'follower_id and followee_id required' });
  const info = db.prepare(`INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)`).run(follower_id, followee_id);
  res.json({ inserted: info.changes });
});

// Seed demo users/follows
app.post('/seed', (req, res) => {
  const users = ['Aditi','Bharat','Charan','Diya'];
  const insertUser = db.prepare(`INSERT INTO users (name) VALUES (?)`);
  const exists = db.prepare(`SELECT COUNT(1) c FROM users`).get().c;
  if (!exists) users.forEach(n => insertUser.run(n));
  const follows = [
    { follower_id: 2, followee_id: 1 },
    { follower_id: 3, followee_id: 1 },
    { follower_id: 4, followee_id: 1 },
    { follower_id: 1, followee_id: 2 }
  ];
  const insFollow = db.prepare(`INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)`);
  follows.forEach(f => insFollow.run(f.follower_id, f.followee_id));
  res.json({ ok: true });
});

// Event ingest
// Body: { event_id, type, actor_id, content_id?, target_user_id?, mentioned_user_ids?[] }
app.post('/events', (req, res) => {
  const { event_id, type, actor_id, content_id, target_user_id, mentioned_user_ids } = req.body;
// console.log("Received event details:");
//   console.log(`event_id: ${event_id}`);
//   console.log(`type: ${type}`);
//   console.log(`actor_id: ${actor_id}`);
//   console.log(`content_id: ${content_id}`);
//   console.log(`target_user_id: ${target_user_id}`);
//   console.log(`mentioned_user_ids: ${Array.isArray(mentioned_user_ids) ? mentioned_user_ids.join(', ') : 'None'}`);

  if (!event_id || !type || !actor_id) return res.status(400).json({ error: 'missing fields' });

  let recipients = new Set();

  if (type === 'follow' && target_user_id) {
    console.log("Recipient ID:",target_user_id, "Followed By:",actor_id)
    recipients.add(Number(target_user_id));
  }

  if (type === 'post_created') {
  const st = db.prepare(`SELECT follower_id FROM follows WHERE followee_id = ?`);
  const rows = st.all(actor_id);

  // get the newly created post
  const latestPost = db.prepare(`SELECT * FROM content WHERE author_id = ? ORDER BY id DESC LIMIT 1`).get(actor_id);

  // send to followers
rows.forEach(r => {
  recipients.add(r.follower_id);
  io.to(`room:user:${r.follower_id}`).emit("posts", latestPost);
});

// also send to author (so they see their own post immediately)
io.to(`room:user:${actor_id}`).emit("posts", latestPost);

}


  if (type === 'like' && content_id) {
  // increment like count
  const upd = db.prepare(`UPDATE content SET like = like + 1 WHERE id = ?`).run(content_id);

  // get the updated content
  const updatedContent = db.prepare(`SELECT * FROM content WHERE id = ?`).get(content_id);

  // emit updated post to EVERYONE (global feed)
  io.emit("posts:update", updatedContent);

  // also notify the author
  const row = db.prepare(`SELECT author_id FROM content WHERE id = ?`).get(content_id);
  if (row) recipients.add(row.author_id);
}


  if (type === 'mention' && Array.isArray(mentioned_user_ids)) {
    mentioned_user_ids.forEach(id => recipients.add(Number(id)));
  }

  const ins = db.prepare(`
    INSERT OR IGNORE INTO notifications 
      (event_id, recipient_id, type, actor_id, content_id, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let created = 0;

  recipients.forEach(recipient_id => {
    const meta = JSON.stringify({ content_id, target_user_id });
    const info = ins.run(event_id, recipient_id, type, actor_id, content_id || null, meta);
    console.log("Info:",info)
    if (info.changes > 0) {
         console.log("Notification created for:", recipient_id);
      const row = db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(info.lastInsertRowid);
      row.score = scoreNotification(row);
      emitNotification(row);
      created += 1;
    }
  });

  res.json({ recipients: Array.from(recipients), created });
});

server.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
