const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        trim: true,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    category: {
        type: String,
        enum: ['Bug', 'Feature', 'Improvement', 'General'],
        default: 'General'
    }
}, {
    timestamps: true
});

// Virtual field to check if feedback is editable (within 15 minutes)
feedbackSchema.virtual('isEditable').get(function () {
    const timeDiff = (Date.now() - this.createdAt.getTime()) / 1000 / 60; // in minutes
    return timeDiff <= 15;
});

// Include virtuals when converting to JSON
feedbackSchema.set('toJSON', { virtuals: true });
feedbackSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
