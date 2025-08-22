import Database from 'better-sqlite3';
const db = new Database('insyd.db');
db.pragma('journal_mode = WAL');
db.exec(`
INSERT INTO users (id, name) VALUES (1,'Aditi') ON CONFLICT DO NOTHING;
INSERT INTO users (id, name) VALUES (2,'Bharat') ON CONFLICT DO NOTHING;
INSERT INTO users (id, name) VALUES (3,'Charan') ON CONFLICT DO NOTHING;
INSERT INTO users (id, name) VALUES (4,'Diya') ON CONFLICT DO NOTHING;
INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (2,1);
INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (3,1);
INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (4,1);
INSERT OR IGNORE INTO follows (follower_id, followee_id) VALUES (1,2);
`);
console.log('Seeded');
