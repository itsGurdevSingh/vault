import Redis from 'ioredis';
import { logger } from '../../logging/index.js';
import { getEnvConfig } from '../../../config/envConfig.js';

const redis = new Redis({
    host: getEnvConfig('REDIS_HOST'),
    port: getEnvConfig('REDIS_PORT'),
    password: getEnvConfig('REDIS_PASSWORD'),
});

redis.on('connect', () => {
    logger.info('Connected to Redis');
});

redis.on('error', (err) => {
    logger.error('Redis connection error:', { err });
});

export default redis;

// import redis and then use set and get methods to interact with redis.