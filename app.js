//THIS IS THE EXPRESS RELATED FILE
//ALL THINGS EXPRESS HERE
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const AppError = require('./utils/appErrors');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many request, try again in an hour.',
});
////GLOBAL MIDDLWARES
//set security http
app.use(helmet());
//dev logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
//limit request from same IP
app.use('/api', limiter);
//body parser, reading data from the req.body
app.use(express.json({ limit: '10kb' }));
//data sanitization against NoSQL query injector
app.use(mongoSanitize());
//data sanitizaion against XSS attacks
//-->look for something to replace old xss-clean
//prevent parameter polution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsAverge',
            'ratingsQuantity',
            'maxGroupSize',
            'difficulty',
            'price',
        ],
    })
);
//serving static files
app.use(express.static(`${__dirname}/public`));
//test middleware
app.use((req, res, next) => {
    // console.log(req.headers);
    next();
});
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
