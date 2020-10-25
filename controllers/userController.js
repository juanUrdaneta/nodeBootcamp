const User = require('../models/userModel');
const AppError = require('../utils/appErrors');
const catchAsync = require('../utils/catchAsync');
const Factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
    const newobj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) newobj[el] = obj[el];
    });
    return newobj;
};

exports.getAllUsers = Factory.getAll(User);
exports.getUser = Factory.getOne(User);
exports.updateUser = Factory.updateOne(User);
exports.deleteUser = Factory.deleteOne(User);

exports.updateMe = catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates, please use /updateMyPassword',
                400
            )
        );
    }

    //2) update user doc
    const filteredBody = filterObj(req.body, 'name', 'email');
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        }
    );

    res.status(200).json({
        status: 'success',
        data: updatedUser,
    });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });

    res.status(204).json({
        status: 'success',
    });
});

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not defined, please use /signup',
    });
};
