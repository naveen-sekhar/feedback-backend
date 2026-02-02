const express = require('express');
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/auth');
const { roleCheck } = require('../middleware/roleCheck');

const router = express.Router();

// @desc    Create new feedback
// @route   POST /api/feedback
// @access  Private (USER only)
router.post('/', protect, roleCheck('USER'), async (req, res) => {
    try {
        const { title, description, category } = req.body;

        const feedback = await Feedback.create({
            user: req.user._id,
            title,
            description,
            category
        });

        res.status(201).json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Get feedback (USER: own feedback, ADMIN: all feedback)
// @route   GET /api/feedback
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let feedback;

        if (req.user.role === 'ADMIN') {
            // ADMIN can see all feedback
            feedback = await Feedback.find()
                .populate('user', 'name email')
                .sort({ createdAt: -1 });
        } else {
            // USER can only see their own feedback
            feedback = await Feedback.find({ user: req.user._id })
                .populate('user', 'name email')
                .sort({ createdAt: -1 });
        }

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Get single feedback by ID
// @route   GET /api/feedback/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id).populate('user', 'name email');

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Check if user owns the feedback or is admin
        if (feedback.user._id.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Not authorized to view this feedback' });
        }

        res.json(feedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Update feedback (only within 15 minutes of creation)
// @route   PUT /api/feedback/:id
// @access  Private (USER only, own feedback, within 15 min)
router.put('/:id', protect, roleCheck('USER'), async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Check if user owns the feedback
        if (feedback.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this feedback' });
        }

        // ⚠️ CRITICAL: Check if within 15-minute edit window
        const timeDiffMinutes = (Date.now() - feedback.createdAt.getTime()) / 1000 / 60;

        if (timeDiffMinutes > 15) {
            return res.status(403).json({
                message: 'Edit window expired. Feedback can only be edited within 15 minutes of submission.',
                editWindowExpired: true,
                submittedAt: feedback.createdAt,
                timeSinceSubmission: Math.floor(timeDiffMinutes)
            });
        }

        // Update the feedback
        const { title, description, category } = req.body;

        feedback.title = title || feedback.title;
        feedback.description = description || feedback.description;
        feedback.category = category || feedback.category;

        const updatedFeedback = await feedback.save();

        res.json(updatedFeedback);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private (USER only, own feedback)
router.delete('/:id', protect, roleCheck('USER'), async (req, res) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({ message: 'Feedback not found' });
        }

        // Check if user owns the feedback
        if (feedback.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this feedback' });
        }

        await feedback.deleteOne();

        res.json({ message: 'Feedback removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
