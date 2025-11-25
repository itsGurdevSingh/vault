import dotenv from 'dotenv';

dotenv.config();

const ENV_CONFIG = {
    MONGO_DB_URI: process.env.MONGO_DB_URI,
    PORT: process.env.PORT,
};

// freeze the config object to prevent modifications
Object.freeze(ENV_CONFIG);

// check is all environment variables are set
for (const [key, value] of Object.entries(ENV_CONFIG)) {
    if (value === undefined) {
        throw new Error(`Environment variable ${key} is not set.`);
    }
}

// fuction to get config values
function getEnvConfig(key) {
    return ENV_CONFIG[key];
}

// export the getEnvConfig function
export { getEnvConfig };
