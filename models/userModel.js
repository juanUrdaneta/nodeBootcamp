const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        trim: true,
        maxLengt: [20, 'A user name cannot have more than 20 characters'],
        minLengt: [20, 'A user name cannot have less than 4 characters'],
        required: [true, 'Please index an user name'],
    },
    email: {
        type: String,
        unique: true,
        required: [true, 'Please add your email'],
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email'],
    },
    photo: {
        type: String,
        default: './',
    },
    role: {
        type: String,
        enum: {
            values: ['user', 'guide', 'lead-guide', 'admin'],
            message: ['please provide a valid role'],
        },
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minLengt: [6, 'A password cannot have less than 6 characters'],
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please provide a password'],
        minLengt: [6, 'A password cannot have less than 6 characters'],
        validate: {
            //this only workds on create and save, NOT on update
            validator: function (el) {
                return el === this.password;
            },
            message: 'passwords are not the same',
        },
    },
    lastPasswordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        select: false,
        default: true,
    },
});

userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next();
});

userSchema.pre('save', async function (next) {
    //only run when passwrod is modified
    if (!this.isModified('password')) return next();

    //hash password with salt = 12
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    //minus 1 second because the token password will likely be modified
    //after the token is signed. this is a "small hack" so the user can
    //log in after changing password
    this.lastPasswordChangedAt = Date.now() - 1000;

    next();
});

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.lastPasswordChangedAt) {
        const changedTimeStamp = parseInt(
            this.lastPasswordChangedAt.getTime() / 1000,
            10
        );
        console.log(changedTimeStamp, JWTTimestamp);

        return JWTTimestamp < changedTimeStamp;
    }

    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    console.log({ resetToken }, this.passwordResetToken);
    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
