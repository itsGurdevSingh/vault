import mongoose from 'mongoose';
import { getEnvConfig } from '../../config/envConfig.js';

const mongoUri = getEnvConfig('MONGO_DB_URI');

export const connectDB = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');
    } catch (err) {
        console.log('failed to connect to db ')
        throw err;
    }
};