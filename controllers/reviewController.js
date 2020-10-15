const Review = require('../models/reviewModel');
const catchAsync = require('../utils/catchAsync');
// const AppError = require('../utils/appErrors');

exports.getAllReviews = catchAsync(async (req, res, next) => {
    //gat all reviews for a tour
    //get all reviews from a user

    let filter = {};

    if (req.params.tourId) filter = { tour: req.params.tourId };

    const reviews = await Review.find(filter);

    res.status(200).json({
        status: 'success',
        reviews,
    });
});

exports.createReview = catchAsync(async (req, res, next) => {
    //allowing nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    const review = await Review.create(req.body);

    res.status(201).json({
        staus: 'success',
        review,
    });
});