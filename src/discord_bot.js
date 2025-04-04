// discord_bot.js
import pkg from 'discord.js';
import { getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
const { Client, GatewayIntentBits} = pkg;
import config from './config.js';
import { handleStreaming } from './handle_streaming.js';
const { TOKEN } = config;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.once('ready', () => {
    console.log('Bot is online!');
});

client.on('messageCreate', async (message) => {
    if (message.content === '!join') {
        if (message.member.voice.channel) {

            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('The bot has connected to the channel!');
                handleStreaming(connection, message);
            });
            message.channel.send('通話に参加しました！');
        } else {
            message.channel.send('あなたはボイスチャンネルにいません！');
        }
    } else if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.channel.send('ボイスチャンネルから退出しました！');
        } else {
            message.channel.send('私はボイスチャンネルにいません！');
        }
    }
});

client.login(TOKEN);

export { client };