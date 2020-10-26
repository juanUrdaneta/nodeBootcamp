const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// will receive the :tourId param from the tour router
// eg: POST /tours/:tourId/reviews
// eg: GET /tours/:tourId/reviews
// will also work with the already defined POST /reviews
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setTourUserIds,
        reviewController.createReview
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(
        authController.restrictTo('user', 'admin'),
        reviewController.updateReview
    )
    .delete(
        authController.restrictTo('user', 'admin'),
        reviewController.deleteReview
    );

module.exports = router;
