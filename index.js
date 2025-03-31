// index.js
import { client } from './src/discord_bot.js';
import config from './src/config.js';
const { TOKEN } = config;

client.login(TOKEN);
