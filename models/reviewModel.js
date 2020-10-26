const mongoose = require('mongoose');
const Tour = require('./tourModel');

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

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

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

reviewSchema.statics.calcAverageRating = async function (tourId) {
    const stats = await this.aggregate([
        {
            $match: { tour: tourId },
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            },
        },
    ]);
    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating,
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5,
        });
    }
};

reviewSchema.post('save', function (next) {
    this.constructor.calcAverageRating(this.tour);
});

//this.rev will be strapped into the 'this' document so it can be used in the next 'post' middleware.
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.rev = await this.findOne(); //gets access for the query'ed review
    next();
});
reviewSchema.post('save', async function () {
    //this.findOne does not work here, query already executed.
    await this.r.constructor.calcAverageRating(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
