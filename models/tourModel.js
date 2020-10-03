const mongoose = require('mongoose');
const slugify = require('slugify');

const tourSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            requried: [true, 'A tour must have a name'], // <--- validator
            unique: true,
            trim: true,
            maxlength: [
                // <--- validator
                40,
                'A tour name must have less or equal 40 characters',
            ],
            minlength: [
                // <--- validator
                10,
                'A tour name must have more or equal 10 characters',
            ],
        },
        slug: String,
        duration: {
            type: Number,
            required: [true, 'A tour must have a duration'],
        },
        maxGroupSize: {
            type: Number,
            required: [true, 'A tour must have a group size'],
        },
        difficulty: {
            type: String,
            required: [true, 'A tour must have a difficulty'],
            enum: {
                values: ['easy', 'medium', 'difficult'],
                message: 'Difficulty must be either: easy, medium, difficult',
            },
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            //validators
            min: [1, 'Rating must be above 0'],
            max: [5, 'Rating must be below 5'],
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
        price: {
            type: Number,
            required: [true, 'A tour must have a price'],
        },
        priceDiscount: {
            type: Number,
            // <--- custom validator. ({VALUE})-> is inputted value
            validate: {
                //wont work on updates. only on create
                validator: function (val) {
                    return val < this.price;
                },
                message:
                    'Discount price: ({VALUE}) should be below than price.',
            },
        },
        summary: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            required: [true, 'A tour must have a description'],
        },
        imageCover: {
            type: String,
            required: [true, 'A tour must have a cover image'],
        },
        images: [String],
        createdAt: {
            type: Date,
            default: Date.now(),
        },
        startDates: [Date],
        secretTour: {
            type: Boolean,
            default: false,
            select: false,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

tourSchema.virtual('durationWeeks').get(function () {
    return this.duration / 7;
});

//document middleware, runs before save() and create(), not on many
tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

//QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true } });
    next();
});

tourSchema.post(/^find/, function (docs, next) {
    next();
});

//AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
    next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;