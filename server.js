const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    dbName: 'dualNatureDB'
})
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// Task Schema
const taskSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Stats Schema
const statsSchema = new mongoose.Schema({
    userId: { type: String, default: 'default_user' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    completedTotal: { type: Number, default: 0 },
    lastCompletedDay: { type: String, default: null },
    achievements: [{
        title: String,
        description: String,
        at: Number
    }],
    combo: { type: Number, default: 0 },
    lastCompletionAt: { type: Number, default: null },
    dailyQuestTarget: { type: Number, default: 5 },
    dailyQuestProgress: { type: Number, default: 0 },
    dailyQuestDay: { type: String, default: null },
    foundControllerEgg: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);
const Stats = mongoose.model('Stats', statsSchema);

// ========== TASK ROUTES ==========

// Get all non-deleted tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({ deleted: false }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks', details: error.message });
    }
});

// Create a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const { id, text } = req.body;
        const newTask = new Task({
            id,
            text,
            completed: false,
            deleted: false
        });
        const savedTask = await newTask.save();
        res.status(201).json(savedTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task', details: error.message });
    }
});

// Update a task (toggle completed or soft delete)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body, updatedAt: Date.now() };
        const updatedTask = await Task.findOneAndUpdate(
            { id },
            updateData,
            { new: true }
        );
        if (!updatedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update task', details: error.message });
    }
});

// Delete a task (soft delete - mark as deleted)
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTask = await Task.findOneAndUpdate(
            { id },
            { deleted: true, updatedAt: Date.now() },
            { new: true }
        );
        if (!deletedTask) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task marked as deleted', task: deletedTask });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task', details: error.message });
    }
});

// Get all tasks including deleted (for admin purposes)
app.get('/api/tasks/all', async (req, res) => {
    try {
        const tasks = await Task.find({}).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all tasks', details: error.message });
    }
});

// ========== STATS ROUTES ==========

// Get stats for the default user
app.get('/api/stats', async (req, res) => {
    try {
        let stats = await Stats.findOne({ userId: 'default_user' });

        // If no stats exist, create default stats
        if (!stats) {
            stats = new Stats({ userId: 'default_user' });
            await stats.save();
        }

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
    }
});

// Update stats
app.put('/api/stats', async (req, res) => {
    try {
        const updateData = { ...req.body, updatedAt: Date.now() };
        const updatedStats = await Stats.findOneAndUpdate(
            { userId: 'default_user' },
            updateData,
            { new: true, upsert: true }
        );
        res.json(updatedStats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update stats', details: error.message });
    }
});

// Reset stats (optional endpoint)
app.post('/api/stats/reset', async (req, res) => {
    try {
        const resetStats = {
            userId: 'default_user',
            level: 1,
            xp: 0,
            streak: 0,
            completedTotal: 0,
            lastCompletedDay: null,
            achievements: [],
            combo: 0,
            lastCompletionAt: null,
            dailyQuestTarget: 5,
            dailyQuestProgress: 0,
            dailyQuestDay: null,
            foundControllerEgg: false,
            updatedAt: Date.now()
        };

        const stats = await Stats.findOneAndUpdate(
            { userId: 'default_user' },
            resetStats,
            { new: true, upsert: true }
        );

        res.json({ message: 'Stats reset successfully', stats });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset stats', details: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
