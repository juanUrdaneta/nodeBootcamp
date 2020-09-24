const AppError = require('../utils/appErrors');

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        err: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        console.log(err);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong',
        });
    }
};

const handleCastErrorDB = (err) => {
    //path is for the "field" in mongoose and value is for the value that caused the error
    const message = `Invalid ${err.path}=${err.value}`;
    return new AppError(message, 400);
};

const handleNameValidationErrorDB = (err) => {
    const message = `A tour with the name: ${err.keyValue.name}, already exists`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    return new AppError(err.message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid Token. Please Log in again', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired', 401);

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    }
    if (process.env.NODE_ENV === 'production') {
        let error = Object.assign(err);
        if (error.name === 'CastError') error = handleCastErrorDB(err);
        if (error.code === 11000) error = handleNameValidationErrorDB(err);
        if (error._message === 'Validation failed') {
            error = handleValidationErrorDB(err);
        }
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        sendErrorProd(error, res);
        // res.status(400).json({ error });
    }

    next();
};
