const mongoose = require('mongoose');
const { getEnvConfig } = require('../config/envConfig');


const mongoUri = getEnvConfig('MONGO_DB_URI');

const connectDB = async () => {
    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true, // use the new URL parser
            useUnifiedTopology: true, // use the new Server Discover and Monitoring engine
        });
        console.log('MongoDB connected');
    } catch (err) {
        console.log('failed to connect to db ')
        throw err;
    }
};

module.exports = {
    connectDB,
};