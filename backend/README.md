# insyd-poc-backend

Node/Express + Socket.IO + SQLite notification POC.

## Quickstart

```bash
npm install
npm run seed        # optional demo data
npm run dev         # starts on :4000
```

### Endpoints
- `GET /health`
- `POST /seed`
- `POST /events` – body: `{ event_id, type, actor_id, content_id?, target_user_id?, mentioned_user_ids?[] }`
- `GET /notifications?user_id=1`
- `POST /notifications/:id/read`

### Socket
Connect with `?user_id=1` and listen for \`notification\` events in room \`room:user:1\`.
