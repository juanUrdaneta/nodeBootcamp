const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appErrors');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

exports.singup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,
        lastPasswordChangedAt: req.body.lastPasswordChangedAt,
    });

    const token = signToken(newUser._id);

    res.status(201).json({
        status: 'success',
        token,
        data: {
            user: newUser,
        },
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    //1) check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }

    //2) check if password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect credentials', 401));
    }

    const token = signToken(user._id);

    res.status(200).json({
        statis: 'success',
        token: token,
    });
});

exports.protect = catchAsync(async (req, res, next) => {
    let token;
    // 1) getting token and check if its there
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new AppError('You are not logged in! Please log in', 401));
    }
    // 2) Verification: validate token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user  still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser)
        return next(new AppError('The user no longer exist', 401));

    // 4) Check if user changed password after JWT was issued.
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError('Please log in again after changing passwords', 401)
        );
    }

    req.user = currentUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    "You don't have permission to perform this action",
                    403
                )
            );
        }
        next();
    };
};
