const mongoose = require('mongoose');

//review / rating / createdAt / ref to Tour / ref to user;

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, 'Review cannot be empty!'],
            minlength: ['7', 'Please submit a longer review'],
            maxlength: [
                '400',
                'Please do not exceed 400 characters in a review.',
            ],
        },
        rating: {
            type: Number,
            required: [
                true,
                'You must rate the experience before submitting the review',
            ],
            min: [1, 'review cannot be lower than 1'],
            max: [5, 'review cannot be higher than 5'],
        },
        createdAt: {
            type: Date,
            default: Date.now(),
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: 'Tour',
            required: [true, 'A review must belong to a tour'],
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'A review must belong to a User'],
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: 'tour',
    //     select: 'name',
    // }).populate({
    //     path: 'user',
    //     select: 'name email',
    // });

    this.populate({
        path: 'user',
        select: 'name email',
    });
    next();
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
