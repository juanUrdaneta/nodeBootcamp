const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppError = require('../utils/appErrors');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const cookieOptions = {
    expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httOnly: true,
};

const createAndSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    user.password = undefined;
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
    res.cookie('jwt', token, cookieOptions);
    res.status(statusCode).json({
        statis: 'success',
        data: user,
        token: token,
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

    createAndSendToken(newUser, 201, res);
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

    createAndSendToken(user, 200, res);
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

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1)get user based on POSTed email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new AppError('There is no user with email address', 404));
    }
    //2)gen random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); //when creating the token document was not saved, it is now.

    //3)send it to users email
    const resetURL = `${req.protocol}://${req.get(
        'host'
    )}/api/v1/user/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with new password
     and passWord confirm to ${resetURL}. \n If no, then ignore`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset Token (valid for 10 min)',
            message,
        });

        res.status(200).json({
            status: 'success',
            message: 'Token sent to email',
        });
    } catch (error) {
        user.createPasswordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false }); //when creating the token document was not saved, it is now.
        return next(
            new AppError('There was an error sending the email. Try Again', 500)
        );
    }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
    //1) get user based onthe token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    //2) if token is not expired and there is a user, set new password

    if (!user) {
        return next(new AppError('Token is not valid', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();
    //3) Update changedPasswordAt property for the user
    //4) log the user in. send JWT

    createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //1) get user from collection
    const user = await User.findById(req.user.id).select('+password');
    //2) check is POSTed password is correct
    if (
        !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
        return next(new AppError('Password not valid', 401));
    }
    //3) if correct, update
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.newPasswordConfirm;

    await user.save();
    //4) log user in.
    createAndSendToken(user, 200, res);
});
