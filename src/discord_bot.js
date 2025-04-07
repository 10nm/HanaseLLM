// discord_bot.js
import pkg from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
const { Client, GatewayIntentBits} = pkg;
import config from './config.js';
import { getSpeakerslist } from './get_info.js';
import { handleStreaming } from './handle_streaming.js';
import { llm } from './llm.js';
import { main } from './main.js';
import { playAudio, VoiceVox } from './voice_synthesis.js';
import { battle } from './battle.js';
const { TOKEN } = config;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});
let speaker = 14;
const speakers = [];

client.once('ready', () => {
    console.log('Bot is online!');
});

let isenable = false;
let obs_channel = 0;
client.on('messageCreate', async (message) => {
    if (message.content === '!join') {
        obs_channel = message.channel.id;
        isenable = true;
        if (message.member.voice.channel) {

            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('The bot has connected to the channel!');
                handleStreaming(connection, client, message, speaker);
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
    } else if (message.content === '!getspeakers') {

        const speakerList = await getSpeakerslist();
        if (speakerList) {
            const chunkSize = 25; // 分割するサイズ
            for (let i = 0; i < speakerList.length; i += chunkSize) {
                const chunk = speakerList.slice(i, i + chunkSize);
                const embed = new EmbedBuilder()
                    .setTitle(`Part ${Math.floor(i / chunkSize) + 1}`)
                    .setDescription(chunk.map(speaker => `ID: ${speaker.id}, 名前: ${speaker.name}, タイプ: ${speaker.type}`).join('\n'));
                message.channel.send({ embeds: [embed] });
            }
        } else {

        }
    } else if (message.content.startsWith('!setSpeaker')) {
        const args = message.content.split(' ');
        if (args.length > 1) {
            const newSpeaker = parseInt(args[1]);
            if (!isNaN(newSpeaker)) {
                speaker = newSpeaker;
                message.channel.send(`スピーカーが ${speaker} に設定されました！`);
            } else {
                message.channel.send('無効なスピーカーIDです！');
            }
        } else {
            message.channel.send('スピーカーIDを指定してください！');
        }
    } else if (message.content.startsWith('!destroy')) {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.channel.send('応答を停止しました！');
        } else {
            message.channel.send('私はボイスチャンネルにいません！');
        }
    } else if (message.content.startsWith('!help')) {
        const helpMessage = `
            **コマンド一覧**
            - \`!join\` : ボイスチャンネルに参加します。
            - \`!leave\` : ボイスチャンネルから退出します。
            - \`!getspeakers\` : 利用可能なスピーカーのリストを取得します。
            - \`!setSpeaker <speaker_id>\` : スピーカーを設定します。
            - \`!destroy\` : 応答を停止します。記憶は保持しています。
        `;
        message.channel.send(helpMessage);
    } else if (message.content.startsWith('!battle')) {
        const args = message.content.split(' ');
        if (args.length > 6) {
            const topic = args[1];
            const stance1 = args[2];
            const stance2 = args[3];
            const modelName = args[4];
            const additionalInstruction1 = args[5];
            const additionalInstruction2 = args[6];
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                message.channel.send(`**バトル開始！**\n**論題**: ${topic} \n**立場1**: ${stance1} \n**立場2**: ${stance2} \n**モデル名**: ${modelName} \n**立場1への追加命令**: ${additionalInstruction1} \n**立場2への追加命令**: ${additionalInstruction2}`);
                message.channel.send('----------------------\n');
                await battle(topic, stance1, stance2, modelName, message.channel.id, message, additionalInstruction1, additionalInstruction2);
            } else {
                message.reply('ボイスチャンネルに接続されていません。');
            }
        } else if (args.length > 4) {
            const topic = args[1];
            const stance1 = args[2];
            const stance2 = args[3];
            const modelName = args[4];
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                message.channel.send(`**バトル開始！**\n**論題**: ${topic} \n**立場1**: ${stance1} \n**立場2**: ${stance2} \n**モデル名**: ${modelName}`);
                message.channel.send('----------------------\n');
                await battle(topic, stance1, stance2, modelName, message.channel.id, message, "", "");
            } else {
                message.reply('ボイスチャンネルに接続されていません。');
            }
        } else {
            message.channel.send('引数が不足しています。!battle [論題] [立場1] [立場2] [モデル名] [立場1への追加命令] [立場2への追加命令] を指定してください。');
        }
    } else if (message.content.startsWith('.')) {
        const text = message.content.slice(1);
        const username = message.author.username;
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            await main(username, connection, message, null, speaker);
        } else {
            message.reply('ボイスチャンネルに接続されていません。');
        }
    } else if (message.channel.id === obs_channel && isenable && message.author.id !== client.user.id) {
        const text = message.content;
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            const path = await VoiceVox(text, 52);
            playAudio(connection, path);
        } else {
            message.reply('ボイスチャンネルに接続されていません。');
        }
    }
});

client.login(TOKEN);

export { client, getVoiceConnection };