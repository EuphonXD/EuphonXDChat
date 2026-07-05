# WebChat API Contract

## Auth Routes (`/api/auth`)

### POST /api/auth/register
```json
// Request
{ "username": "string", "email": "string", "password": "string", "nickname": "string" }
// Response 201
{ "token": "jwt", "user": { "id": 1, "username": "str", "nickname": "str", "avatar": null } }
// Response 400
{ "error": "Username already taken" }
```

### POST /api/auth/login
```json
// Request
{ "login": "string (username or email)", "password": "string" }
// Response 200
{ "token": "jwt", "user": { "id": 1, "username": "str", "nickname": "str", "avatar": "str|null" } }
```

### GET /api/auth/me (requires JWT)
```json
// Response 200
{ "user": { "id": 1, "username": "str", "nickname": "str", "avatar": "str|null", "email": "str" } }
```

### PUT /api/auth/profile (requires JWT)
```json
// Request
{ "nickname": "string", "avatar": "string (base64 data URL or URL)" }
// Response 200
{ "user": { "id": 1, "username": "str", "nickname": "str", "avatar": "str|null" } }
```

## Room Routes (`/api/rooms`)

### GET /api/rooms (requires JWT)
```json
// Response 200
{ "rooms": [{ "id": 1, "name": "str", "description": "str", "memberCount": 5, "isMember": true }] }
```

### POST /api/rooms (requires JWT)
```json
// Request
{ "name": "string", "description": "string" }
// Response 201
{ "room": { "id": 1, "name": "str", "description": "str" } }
```

### POST /api/rooms/:id/join (requires JWT)
```json
// Response 200
{ "message": "Joined room" }
```

### POST /api/rooms/:id/leave (requires JWT)
```json
// Response 200
{ "message": "Left room" }
```

### GET /api/rooms/:id/members (requires JWT)
```json
// Response 200
{ "members": [{ "id": 1, "username": "str", "nickname": "str", "avatar": "str|null" }] }
```

## Message Routes (`/api/messages`)

### GET /api/messages/room/:roomId?limit=50&before=timestamp (requires JWT)
```json
// Response 200
{ "messages": [{ "id": 1, "content": "str", "userId": 1, "username": "str", "nickname": "str", "avatar": "str|null", "createdAt": "ISO8601" }] }
```

### GET /api/messages/private/:userId?limit=50&before=timestamp (requires JWT)
```json
// Response 200
{ "messages": [{ "id": 1, "content": "str", "userId": 1, "username": "str", "nickname": "str", "avatar": "str|null", "createdAt": "ISO8601" }] }
```

### GET /api/messages/private-conversations (requires JWT)
```json
// Response 200
{ "conversations": [{ "userId": 2, "username": "str", "nickname": "str", "avatar": "str|null", "lastMessage": "str", "lastMessageAt": "ISO8601" }] }
```

## Emoji Routes (`/api/emoji`)

### GET /api/emoji/packs
```json
// Response 200
{ "packs": [{ "name": "shangskr-owo", "filename": "shangskr-owo.json", "categories": ["可爱猫"], "stickerCount": 50 }] }
```

### GET /api/emoji/packs/:packName
```json
// Response 200
{ "pack": "shangskr-owo", "categories": { "可爱猫": [{ "name": "blobcat-心", "url": "https://..." }] } }
// Response 404
{ "error": "Pack not found" }
```

### POST /api/emoji/custom (requires JWT)
```json
// Request
{ "name": "my-sticker", "url": "https://..." }
// Response 201
{ "emoji": { "id": 1, "user_id": 1, "name": "my-sticker", "url": "https://...", "created_at": "..." } }
```

### GET /api/emoji/custom (requires JWT)
```json
// Response 200
{ "emojis": [{ "id": 1, "name": "my-sticker", "url": "https://...", "createdAt": "..." }] }
```

### DELETE /api/emoji/custom/:id (requires JWT)
```json
// Response 200
{ "success": true }
// Response 404
{ "error": "Sticker not found or not yours" }
```

### Static Files
- Built-in emoji JSON files served at `/emoji/:filename`
- Example: `GET /emoji/shangskr-owo.json`

## Socket.IO Events

### Client → Server
- `join-room` (roomId) - Join a room channel
- `leave-room` (roomId) - Leave a room channel
- `send-message` ({ roomId, content }) - Send to room
- `send-private` ({ toUserId, content }) - Send private message
- `typing` ({ roomId, isTyping }) - Typing indicator

### Server → Client
- `new-message` ({ id, roomId, userId, username, nickname, avatar, content, createdAt })
- `new-private-message` ({ id, fromUserId, toUserId, content, createdAt })
- `user-joined` ({ roomId, user })
- `user-left` ({ roomId, userId })
- `user-typing` ({ roomId, userId, isTyping })
- `online-users` ([userId, ...])

## Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  creator_id INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_members (
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE private_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_emojis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
