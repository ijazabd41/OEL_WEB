# Dual Nature List - Database Integration

A gamified task list application with MongoDB database integration, featuring two distinct modes: Focus Mode (minimal) and Play Mode (gamified with achievements, combos, and level progression).

---

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- MongoDB Atlas account (or local MongoDB instance)

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure MongoDB:**
   - Update `.env` file with your MongoDB connection string:
   ```
   MONGO_URL=your_mongodb_connection_string
   PORT=5000
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open `http://localhost:5000` in your browser

---

## 📊 Database Schema

### Tasks Table
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique task identifier |
| `text` | String | Task description |
| `completed` | Boolean | Whether the task is completed |
| **`deleted`** | **Boolean** | **Soft delete flag (deleted tasks won't show in UI)** |
| `createdAt` | Date | Creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Stats Table
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | String | 'default_user' | User identifier |
| `level` | Number | 1 | User's current level |
| `xp` | Number | 0 | Total experience points |
| `streak` | Number | 0 | Consecutive days streak |
| `completedTotal` | Number | 0 | Total tasks completed |
| `lastCompletedDay` | String | null | Last completion date |
| `achievements` | Array | [] | Achievement objects |
| `combo` | Number | 0 | Current combo count |
| `lastCompletionAt` | Number | null | Last completion timestamp |
| `dailyQuestTarget` | Number | 5 | Daily quest target |
| `dailyQuestProgress` | Number | 0 | Current daily progress |
| `dailyQuestDay` | String | null | Current quest date |
| `foundControllerEgg` | Boolean | false | Easter egg discovery flag |
| `updatedAt` | Date | now | Last update timestamp |

---

## 🔌 API Endpoints

### Tasks Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tasks` | Get all **non-deleted** tasks |
| `POST` | `/api/tasks` | Create a new task |
| `PUT` | `/api/tasks/:id` | Update a task (toggle completed) |
| `DELETE` | `/api/tasks/:id` | **Soft delete** a task (sets deleted=true) |
| `GET` | `/api/tasks/all` | Get ALL tasks including deleted (admin) |

### Stats Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Get user stats |
| `PUT` | `/api/stats` | Update user stats |
| `POST` | `/api/stats/reset` | Reset stats to default values |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |

---

## ✨ Key Features

### 🗑️ Soft Delete Implementation
- Tasks are **never permanently removed** from the database
- `DELETE` endpoint sets `deleted: true` instead of removing
- `GET /api/tasks` automatically filters out deleted tasks
- Only non-deleted tasks appear in the UI
- Deleted tasks remain in database for potential recovery/audit

### 🔄 Real-time Database Sync
- All tasks and stats are fetched from MongoDB on page load
- Create/update/delete operations immediately sync to the database
- UI automatically refreshes after successful database operations
- No localStorage dependency - works across devices

### 🎮 Gamification Features
- **XP & Levels**: Earn experience points by completing tasks
- **Daily Streaks**: Track consecutive days of productivity
- **Combos**: Quick completions within 10 seconds earn combo bonuses
- **Daily Quests**: Complete 5 tasks per day for bonus XP
- **Achievements**: Unlock achievements for milestones
- **Easter Eggs**: Hidden surprises to discover

### 🎨 Two Modes
- **Focus Mode**: Clean, minimal interface for productivity
- **Play Mode**: Full gamification with animations, sounds, and rewards

---

## 🎯 How It Works

### 1. Page Load
```
User opens page
  ↓
Frontend calls GET /api/tasks
  ↓
Backend filters deleted=false
  ↓
Only non-deleted tasks displayed
  ↓
Frontend calls GET /api/stats
  ↓
Stats loaded and UI rendered
```

### 2. Adding a Task
```
User submits form
  ↓
Frontend calls POST /api/tasks
  ↓
Task saved to MongoDB
  ↓
Frontend refreshes task list
```

### 3. Completing a Task
```
User clicks "Done"
  ↓
Frontend calls PUT /api/tasks/:id {completed: true}
  ↓
Stats calculated (XP, streak, combo)
  ↓
Frontend calls PUT /api/stats
  ↓
UI refreshed with animations
```

### 4. Deleting a Task (Soft Delete)
```
User clicks "Delete"
  ↓
Frontend calls DELETE /api/tasks/:id
  ↓
Backend sets deleted: true
  ↓
Task removed from local array
  ↓
UI refreshed (task disappears)
  ↓
Task still exists in database!
```

---

## 📦 Dependencies

### Production
- `express@^4.18.2` - Web server framework
- `mongoose@^7.6.3` - MongoDB ODM
- `cors@^2.8.5` - Cross-Origin Resource Sharing
- `dotenv@^16.3.1` - Environment variable management

### Development
- `nodemon@^3.0.1` - Auto-restart server on file changes

---

## 🔧 Development

### File Structure
```
OEL_WEB/
├── server.js           # Express server & MongoDB setup
├── script.js           # Frontend JavaScript with API calls
├── index.html          # Main HTML file
├── styles.css          # Styling
├── package.json        # Dependencies & scripts
├── .env                # Environment variables (MongoDB URL)
├── .gitignore          # Git ignore rules
├── README.md           # This file
└── assets/             # Images and audio files
```

### Available Scripts
```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
```

---

## 🔥 Before vs After

| Feature | Before (localStorage) | After (MongoDB) |
|---------|----------------------|-----------------|
| **Storage** | Browser only | Cloud database |
| **Persistence** | Lost on browser clear | Permanent |
| **Multi-device** | No | Yes (same DB) |
| **Server required** | No | Yes |
| **Delete behavior** | Permanent | Soft delete |
| **Scalability** | Single user | Multi-user ready |
| **API** | No | RESTful API |
| **Recovery** | No | Yes (deleted tasks kept) |

---

## 🛡️ Important Notes

- **Soft Delete**: Deleted tasks are marked as `deleted: true`, not removed
- **Task Filtering**: `/api/tasks` only returns non-deleted tasks by default
- **Admin Access**: Use `/api/tasks/all` to view all tasks including deleted
- **Stats Sync**: Stats automatically save after each game action
- **MongoDB**: Ensure MongoDB is running and connection string is correct
- **Port**: Default port is 5000, can be changed in `.env`

---

## 🐛 Troubleshooting

**Server won't start:**
- Check if MongoDB connection string in `.env` is correct
- Ensure port 5000 is not already in use
- Run `npm install` to ensure all dependencies are installed

**Tasks not loading:**
- Check browser console for errors
- Verify server is running (`npm start`)
- Check MongoDB connection status in server logs

**Stats not updating:**
- Ensure you're in "Play Mode" (toggle the mode switch)
- Check browser console for API errors
- Verify `/api/stats` endpoint is accessible

---

## 📝 License

This project is for educational purposes.

---

## 🎉 Enjoy your gamified productivity!

Complete tasks, level up, and maintain your streak! 🚀
