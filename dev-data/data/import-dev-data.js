//THIS IS THE SERVER CONFIG RELATED APP
//DB, ENV ETC.
const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Tour = require('../../models/tourModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DATABASE.replace(
    '<PASSWORD>',
    process.env.DATABASE_PASSWORD
);
mongoose
    .connect(DB, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('DB Connection Successful');
    });

const tours = JSON.parse(
    fs.readFileSync(`${__dirname}/tours-simple.json`, 'utf-8')
);

const importData = async () => {
    try {
        await Tour.create(tours);
        console.log('data loaded');
        process.exit();
    } catch (error) {
        console.log(error);
    }
};

const deleteData = async () => {
    try {
        await Tour.deleteMany();
        console.log('data deleted');
        process.exit();
    } catch (error) {
        console.log(error);
    }
};

if (process.argv[2] === '--import') {
    importData();
} else if (process.argv[2] === '--delete') {
    deleteData();
}
console.log(process.argv);
