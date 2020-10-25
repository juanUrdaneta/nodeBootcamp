const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// will receive the :tourId param from the tour router
// eg: POST /tours/:tourId/reviews
// eg: GET /tours/:tourId/reviews
// will also work with the already defined POST /reviews
const router = express.Router({ mergeParams: true });

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.protect,
        authController.restrictTo('user'),
        reviewController.setTourUserIds,
        reviewController.createReview
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(reviewController.updateReview)
    .delete(reviewController.deleteReview);

module.exports = router;
