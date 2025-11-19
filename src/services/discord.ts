import {
  Client,
  GatewayIntentBits,
  Events,
  type Message,
  type VoiceBasedChannel,
} from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  EndBehaviorType,
  entersState,
} from '@discordjs/voice';
import type { Config, ConversationHistory } from '../types.js';
import { processVoiceStream } from '../utils/audio.js';
import {
  createUserMessage,
  createModelMessage,
  pushAndSave,
} from './history.js';
import { formatSpeakers } from './tts.js';

/**
 * Discord音声処理サービス
 */

interface Services {
  stt: { transcribe: (buffer: Buffer) => Promise<any> };
  llm: { generate: (message: string, history: ConversationHistory) => Promise<any> };
  tts: {
    synthesize: (text: string) => Promise<any>;
    getSpeakers: () => Promise<any>;
    setSpeaker: (id: number) => void;
    getCurrentSpeaker: () => number;
  };
}

/**
 * Discordクライアントを作成
 */
export const createDiscordClient = () => {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent,
    ],
  });
};

/**
 * 安全にチャンネルにメッセージを送信
 */
const sendMessage = async (channel: Message['channel'], content: string): Promise<void> => {
  if ('send' in channel && typeof channel.send === 'function') {
    await channel.send(content);
  }
};

/**
 * 音声を再生する
 */
const playAudio = async (
  connection: ReturnType<typeof joinVoiceChannel>,
  audioPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const player = createAudioPlayer();
    const resource = createAudioResource(audioPath);

    player.on(AudioPlayerStatus.Idle, () => {
      resolve();
    });

    player.on('error', (error) => {
      console.error('Audio player error:', error);
      reject(error);
    });

    connection.subscribe(player);
    player.play(resource);
  });
};

/**
 * 会話処理のメインロジック
 */
const handleConversation = async (
  audioBuffer: Buffer | null,
  textInput: string | null,
  username: string,
  message: Message,
  connection: ReturnType<typeof joinVoiceChannel>,
  config: Config,
  services: Services,
  history: ConversationHistory,
  noContextMode: boolean
): Promise<ConversationHistory> => {
  let userMessage = '';
  let updatedHistory = history;

  try {
    // 音声入力の場合は文字起こし
    if (audioBuffer) {
      const sttResult = await services.stt.transcribe(audioBuffer);

      if (!sttResult.success) {
        await sendMessage(message.channel, `❌ STTエラー: ${sttResult.error.message}`);
        return history;
      }

      userMessage = sttResult.value.text;
      await sendMessage(
        message.channel,
        `🎤 **${username}**: ${userMessage}\n⏱️ STT処理時間: ${sttResult.value.processingTime}ms`
      );
    } else if (textInput) {
      // テキスト入力の場合
      userMessage = textInput;

      // テキスト入力も音声合成して再生
      const ttsResult = await services.tts.synthesize(textInput);
      if (ttsResult.success) {
        await playAudio(connection, ttsResult.value.audioPath);
      }
    } else {
      return history;
    }

    // 会話履歴に追加
    const userHistoryMessage = createUserMessage(userMessage, username);
    const saveResult = await pushAndSave(config.tempDir, updatedHistory, userHistoryMessage);

    if (!saveResult.success) {
      console.error('Failed to save user message:', saveResult.error);
      return history;
    }

    updatedHistory = saveResult.value;

    // LLMで応答生成 (no-context modeの場合は空の履歴を使用)
    const historyForLLM = noContextMode ? { messages: [] } : updatedHistory;
    const llmResult = await services.llm.generate(userMessage, historyForLLM);

    if (!llmResult.success) {
      await sendMessage(message.channel, `❌ LLMエラー: ${llmResult.error.message}`);
      return updatedHistory;
    }

    const responseText = llmResult.value.text;

    // 会話履歴に追加
    const modelHistoryMessage = createModelMessage(responseText);
    const saveResult2 = await pushAndSave(config.tempDir, updatedHistory, modelHistoryMessage);

    if (!saveResult2.success) {
      console.error('Failed to save model message:', saveResult2.error);
      return updatedHistory;
    }

    updatedHistory = saveResult2.value;

    // 応答が適切な長さの場合のみ音声合成
    const botName = config.llmProvider === 'gemini' ? 'Gemini' : 'Local LLM';
    const contextIndicator = noContextMode ? ' [NC]' : '';
    if (responseText.length > 0 && responseText.length <= 800) {
      await sendMessage(
        message.channel,
        `💬 **${botName}${contextIndicator}**: ${responseText}\n⏱️ LLM処理時間: ${llmResult.value.processingTime}ms`
      );

      const ttsResult = await services.tts.synthesize(responseText);

      if (ttsResult.success) {
        await playAudio(connection, ttsResult.value.audioPath);
      } else {
        await sendMessage(message.channel, `❌ TTSエラー: ${ttsResult.error.message}`);
      }
    } else {
      await sendMessage(
        message.channel,
        `💬 **${botName}${contextIndicator}**: ${responseText}\n⚠️ 応答が長すぎるため音声合成をスキップしました`
      );
    }

    return updatedHistory;
  } catch (error) {
    console.error('Conversation error:', error);
    await sendMessage(
      message.channel,
      `❌ エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
    );
    return updatedHistory;
  }
};

/**
 * 音声ストリーミングをハンドルする
 */
const setupVoiceReceiver = (
  connection: ReturnType<typeof joinVoiceChannel>,
  message: Message,
  config: Config,
  services: Services,
  getHistory: () => ConversationHistory,
  setHistory: (history: ConversationHistory) => void,
  getNoContextMode: () => boolean
) => {
  const receiver = connection.receiver;

  receiver.speaking.on('start', (userId) => {
    const member = message.guild?.members.cache.get(userId);
    const user = member?.user;
    if (!user || user.bot) return;

    const audioStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: config.silenceDuration,
      },
    });

    const displayName = member?.displayName || user.username;
    console.log(`Started receiving audio from ${displayName}`);

    processVoiceStream(audioStream, config)
      .then(async (wavBuffer) => {
        if (!wavBuffer) return;

        const history = getHistory();
        const noContextMode = getNoContextMode();
        const newHistory = await handleConversation(
          wavBuffer,
          null,
          displayName,
          message,
          connection,
          config,
          services,
          history,
          noContextMode
        );
        setHistory(newHistory);
      })
      .catch((error) => {
        console.error('Voice processing error:', error);
      });
  });
};

/**
 * Discordボットを初期化する
 */
export const initDiscordBot = (
  config: Config,
  services: Services,
  initialHistory: ConversationHistory
) => {
  const client = createDiscordClient();
  let currentHistory = initialHistory;
  let activeConnection: ReturnType<typeof joinVoiceChannel> | null = null;
  let noContextMode = false;

  const getHistory = () => currentHistory;
  const setHistory = (history: ConversationHistory) => {
    currentHistory = history;
  };
  const getNoContextMode = () => noContextMode;

  client.on(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;

    const content = message.content;

    // !join - ボイスチャンネルに参加
    if (content === '!join') {
      const member = message.guild?.members.cache.get(message.author.id);
      const voiceChannel = member?.voice.channel as VoiceBasedChannel | undefined;

      if (!voiceChannel) {
        await message.reply('ボイスチャンネルに参加してください');
        return;
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
        selfDeaf: false,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        activeConnection = connection;
        await message.reply('✅ ボイスチャンネルに接続しました');

        setupVoiceReceiver(
          connection,
          message,
          config,
          services,
          getHistory,
          setHistory,
          getNoContextMode
        );
      } catch (error) {
        console.error('Connection error:', error);
        await message.reply('❌ 接続に失敗しました');
      }

      return;
    }

    // !leave - ボイスチャンネルから退出
    if (content === '!leave') {
      if (activeConnection) {
        activeConnection.destroy();
        activeConnection = null;
        await message.reply('👋 ボイスチャンネルから退出しました');
      } else {
        await message.reply('接続していません');
      }
      return;
    }

    // !speakers - スピーカー一覧を取得
    if (content === '!speakers') {
      const result = await services.tts.getSpeakers();
      if (result.success) {
        const formatted = formatSpeakers(result.value);
        await message.reply(`\`\`\`\n${formatted}\n\`\`\``);
      } else {
        await message.reply(`❌ エラー: ${result.error.message}`);
      }
      return;
    }

    // !setSpeaker <id> - スピーカーを変更
    if (content.startsWith('!setSpeaker ')) {
      const speakerId = parseInt(content.split(' ')[1], 10);
      if (isNaN(speakerId)) {
        await message.reply('❌ 無効なスピーカーID');
        return;
      }

      services.tts.setSpeaker(speakerId);
      await message.reply(`✅ スピーカーをID ${speakerId} に変更しました`);
      return;
    }

    // !nc - no-context modeのトグル
    if (content === '!nc') {
      noContextMode = !noContextMode;
      const status = noContextMode ? 'ON' : 'OFF';
      await message.reply(`🔄 No-Context Mode: **${status}**\n${noContextMode ? '履歴なしで応答します' : '履歴を使用して応答します'}`);
      return;
    }

    // .<text> - テキスト入力
    if (content.startsWith('.') && content.length > 1) {
      if (!activeConnection) {
        await message.reply('先にボイスチャンネルに接続してください（!join）');
        return;
      }

      const member = message.guild?.members.cache.get(message.author.id);
      const displayName = member?.displayName || message.author.username;
      const textInput = content.slice(1);
      const newHistory = await handleConversation(
        null,
        textInput,
        displayName,
        message,
        activeConnection,
        config,
        services,
        currentHistory,
        noContextMode
      );
      setHistory(newHistory);
      return;
    }
  });

  return {
    client,
    login: () => client.login(config.discordToken),
  };
};
