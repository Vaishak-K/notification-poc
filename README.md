# Notification System – Proof of Concept (POC)

## Background

This project is a **proof-of-concept (POC) notification system** for a next-gen social platform targeting the Architecture Industry. The primary objective is to keep users engaged by notifying them about activity from people they follow, people who follow them, and people who interact with their content.  
The **design target is 100 Daily Active Users (DAU)** for a bootstrapped startup stage; it is not meant for production scale.

---

## Key Points

1. **Designed for a tiny, bootstrapped team (startup mode)**
2. **Handles ~100 DAU, with simple and reliable real-time notifications**
3. **Modular, clean code: can easily be scaled/redesigned for production in the future**
4. **AI/ML hooks suggested, but not the focus for the POC**

---

## Stack Overview

| Layer       | Tech/Choices                       | Notes                          |
|-------------|:-----------------------------------|:-------------------------------|
| Frontend    | Next.js, Socket.IO client, React   | Clean demo UI, easy user swap  |
| Backend     | Node.js, Express, Socket.IO        | Simple, strong, fast prototyping|
| Database    | SQLite (file, via better-sqlite3)  | 100% local dev, WAL mode safe  |
| Deployment  | Localhost or simple cloud (Heroku) | Can run on any laptop/VM       |

---

## System Architecture

### High-Level Diagram


                                   Next.js App
                                       |
                                       |  HTTP / WebSocket
                                       |
                                       V
                                   Express Backend +
                                   Socket.io
                                       |
                                       |
                                       |
                                       V
                                   Sqlite DB

- Next.js client fetches/updates via REST API (Express)
- Real-time: Next.js client connects to Socket.IO for immediate notification delivery
- Backend persists all data in local SQLite (starter scale–see scaling section)

### Components

#### 1. **Backend (Node.js/Express)**
- **REST API endpoints**
  - Get notifications, posts
  - Create post, follow, mark notification as read
  - Seed demo users
  - Receive event (post/follow/like/mention) and dispatch notification
- **Socket.IO server**
  - Users join their own “room”
  - Notifications and live content updates sent instantly to online clients
- **SQLite database**
  - Four tables: `users`, `follows`, `content`, `notifications`
  - WAL mode for safe concurrent reads/writes
  - Auto-initializes schema

#### 2. **Frontend (Next.js)**
- **Single-page, three-column UI:**
  - My Posts | Other User’s Posts | Notifications
- “View as” any user (for demo/testing)
- Actions: Follow another user, post, like

#### 3. **Notification/Feed Logic**
- Events (`/events` API) trigger notification logic:
  - **Follow**: Notifies the user being followed
  - **Post Created**: Notifies all followers of the author
  - **Like**: Notifies the post’s author
  - **Mention**: Notifies target users
- All notifications are broadcast in real-time to any online users; also persist to DB for polling/offline use

#### 4. **(Optional) AI Scoring Hook**
- Placeholder function in backend (`scoreNotification`) for relevance/ranking
- Can be extended to use real ML models or external APIs in the future

---

## Flow of Execution

1. **User posts/likes/follows/mentions**
2. **Event sent to backend** (`/events` POST)
3. **Backend determines recipients**, writes notifications, emits via Socket.IO
4. **Frontend receives real-time notifications**, updates UI
5. **Client can fetch state on load or lose-connection via REST API**

---

## API Overview

| Endpoint                           | Description                                |
|-------------------------------------|--------------------------------------------|
| **GET /health**                    | Healthcheck                                |
| **GET /notifications?user_id=X**   | List latest notifications for user         |
| **POST /notifications/:id/read**   | Mark as read                               |
| **POST /content**                  | Create a new post                          |
| **GET /posts?follower_id=X**       | Get posts by a user                        |
| **POST /follows**                  | Follow (one user follows another)          |
| **POST /seed**                     | Seed demo users                            |
| **POST /events**                   | Event ingest (follow, post, like, mention) |

---

## Notification/Event Types

- **follow**: User A follows B → B gets notification
- **post_created**: User A posts → All A’s followers get notification
- **like**: Someone likes A’s post → A gets notification
- **mention**: Tag/mention a user in post/content → mentioned users get notified

---

## Scale Considerations

- **100 DAU target:** Plenty for 1-file SQLite, socket broadcasting, and naive queries
- **Polling + Sockets**: At this scale, both approaches are fine
- **Upgrading:** Swap DB to Postgres/MySQL and add Redis if scaling up. Move AI scoring into microservice if needed.

---

## Performance & Limitations

- POC is not secure: No authentication, rate limiting, or input validation for production
- DB is ephemeral and local; WAL helps with safety for concurrent access, but not for HA
- Notifications only in-app (no email/SMS)
- No notification batching/pagination (limit 200 applied)
- No push notifications (mobile/web)

---

## Installation & Running Notes

### Backend
```bash
cd backend
npm install
npm start # or node index.js (Port 4000)
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
### Environment Variables
```bash
NEXT_PUBLIC_API_BASE=http://your-backend-host.com
NEXT_PUBLIC_WS_BASE=http://your-backend-host.com
```
## Extending the POC

This project is designed as a Proof of Concept (POC) to demonstrate a simple, working notification system for a small, bootstrapped team. If you want to expand this system beyond demo purposes or to prepare for a production launch, consider implementing:

- **User Authentication**: Add proper login and session management using JWT or a library like [NextAuth.js](https://next-auth.js.org/).
- **Notification Ranking**: Integrate a real AI/ML model for prioritizing/recommending notifications (the backend contains a scoring stub).
- **More Notification Types**: Support for comments, tags, direct messages, group events, etc.
- **Scalable Database**: Move from SQLite to Postgres/MySQL for larger scale or team deployments.
- **Distributed Scalability**: Use Redis for Socket.IO pub/sub; deploy services in the cloud for real concurrency.
- **Email/Push Alerts**: Send critical notifications over email or push services to reach users outside the app.
- **Pagination & Filtering**: Add paging and search to notifications and feeds as data volume increases.
- **Admin Tools**: Create moderation and admin notification/event controls.
- **Advanced UI/UX**: Add user profiles, avatars, richer post content, advanced filtering, dark mode, etc.

---

## Limitations & Caveats

**Important: This project is a Proof of Concept (POC) only. It is not intended for production use.**

Key POC-related limitations include:

- **No Authentication**: The app assumes a trusted environment; users are selected by ID in the UI.
- **Security**: There is no input validation, security hardening, or rate limiting in place.
- **Data Persistence**: Relies on a file-based local SQLite database, not suitable for multi-user production or remote backups.
- **Limited Notification Types**: Only supports basic events (posts, likes, follows, mentions) as a demo.
- **Best-Effort Delivery**: Real-time delivery uses Socket.IO; if a user is offline, notifications are stored but not guaranteed for every scenario.
- **Minimal UI/UX**: Intentionally simple interface for demonstration—no focus on mobile design, visual polish, or accessibility.
- **No Mobile Push**: No mobile push, PWA, or SMS integration.
- **No Robust Error Handling**: Network/API errors may not be surfaced cleanly in the UI.
- **Hardcoded/Static Demo Data**: Data seeding and user switching is for development/testing convenience.
- **Scale**: System not designed or tested above ~100 DAU or for heavy concurrent access.

For any use beyond a local demo or internal evaluation, **major rework and engineering will be required**.

---
