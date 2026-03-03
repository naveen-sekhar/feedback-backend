const express = require('express');
const Feedback = require('../models/Feedback');
const { verifyToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

const EDIT_TIME_LIMIT_MINUTES = 15;

// POST /api/feedback - Submit new feedback (User only)
router.post('/', verifyToken, authorizeRole('user'), async (req, res) => {
    try {
        const { category, title, description } = req.body;

        if (!category || !title || !description) {
            return res.status(400).json({ message: 'Category, title, and description are required.' });
        }

        const feedback = new Feedback({
            userId: req.user.id,
            category,
            title,
            description
        });

        await feedback.save();

        res.status(201).json({ message: 'Feedback submitted successfully.', feedback });
    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({ message: 'Server error while submitting feedback.' });
    }
});

// GET /api/feedback - Get own feedback (User only)
router.get('/', verifyToken, authorizeRole('user'), async (req, res) => {
    try {
        const feedbacks = await Feedback.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Get feedback error:', error);
        res.status(500).json({ message: 'Server error while fetching feedback.' });
    }
});

// PUT /api/feedback/:id - Edit feedback within 15 minutes (User only)
router.put('/:id', verifyToken, authorizeRole('user'), async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found.' });
        }

        // Check ownership
        if (feedback.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own feedback.' });
        }

        // Check 15-minute time limit
        const now = new Date();
        const createdAt = new Date(feedback.createdAt);
        const diffInMinutes = (now - createdAt) / (1000 * 60);

        if (diffInMinutes > EDIT_TIME_LIMIT_MINUTES) {
            return res.status(403).json({
                message: `Edit window expired. Feedback can only be edited within ${EDIT_TIME_LIMIT_MINUTES} minutes of submission.`,
                timeElapsed: Math.floor(diffInMinutes),
                timeLimit: EDIT_TIME_LIMIT_MINUTES
            });
        }

        // Update fields
        const { category, title, description } = req.body;
        if (category) feedback.category = category;
        if (title) feedback.title = title;
        if (description) feedback.description = description;

        await feedback.save();

        res.json({ message: 'Feedback updated successfully.', feedback });
    } catch (error) {
        console.error('Edit feedback error:', error);
        res.status(500).json({ message: 'Server error while editing feedback.' });
    }
});

// DELETE /api/feedback/:id - Delete feedback (User only)
router.delete('/:id', verifyToken, authorizeRole('user'), async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found.' });
        }

        if (feedback.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own feedback.' });
        }

        await Feedback.findByIdAndDelete(req.params.id);

        res.json({ message: 'Feedback deleted successfully.' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ message: 'Server error while deleting feedback.' });
    }
});

// GET /api/feedback/all - Get all feedback (Admin only)
router.get('/all', verifyToken, authorizeRole('admin'), async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (error) {
        console.error('Get all feedback error:', error);
        res.status(500).json({ message: 'Server error while fetching all feedback.' });
    }
});

module.exports = router;
