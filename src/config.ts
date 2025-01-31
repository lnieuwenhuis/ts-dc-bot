import dotenv from 'dotenv';

dotenv.config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    throw new Error('DISCORD_TOKEN or DISCORD_CLIENT_ID is not defined');
}

export const config = {
    DISCORD_TOKEN,
    DISCORD_CLIENT_ID
}