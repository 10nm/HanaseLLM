import './polyfills.js';

import ffmpeg from 'ffmpeg-static';
import { getConfig, validateConfig } from './config.js';
import { initHistory } from './services/history.js';
import { initSTTService } from './services/stt.js';
import { initLLMService } from './services/llm.js';
import { initTTSService } from './services/tts.js';
import { initDiscordBot } from './services/discord.js';
import { LocalLLMProcessManager } from './utils/processManager.js';

// Set FFMPEG_PATH for prism-media/discord.js
if (ffmpeg) {
  process.env.FFMPEG_PATH = ffmpeg;
  console.log(`✅ FFMPEG_PATH set to: ${ffmpeg}`);
} else {
  console.warn('⚠️ ffmpeg-static failed to provide a path');
}

/**
 * HanaseLLM - LLMと音声通話するDiscord Bot
 *
 * 必要最小限のモダンなアーキテクチャで再実装
 */

// グローバル変数でプロセスマネージャーを保持
let localLLMManager: LocalLLMProcessManager | null = null;

async function main() {
  console.log('🚀 HanaseLLM starting...');

  try {
    // 設定を読み込み
    const config = getConfig();
    console.log('✅ Configuration loaded');
    console.log(`   LLM Provider: ${config.llmProvider}`);

    // 設定を検証
    const validationResult = validateConfig(config);
    if (!validationResult.success) {
      throw new Error(`Configuration validation failed: ${validationResult.error}`);
    }

    // ローカルLLM APIサーバーの起動（必要な場合）
    if (config.llmProvider === 'local' && config.localLlmAutoStart) {
      if (!config.localLlmScriptPath || !config.localLlmUrl) {
        throw new Error('Local LLM configuration is incomplete');
      }

      console.log('🔧 Starting local LLM API server...');
      localLLMManager = new LocalLLMProcessManager(config.localLlmScriptPath, config.localLlmUrl);
      await localLLMManager.start();
      console.log('✅ Local LLM API server started');
    }

    // 会話履歴を初期化
    const history = await initHistory(config.tempDir);
    console.log('✅ Conversation history initialized');

    // 各サービスを初期化
    const sttService = initSTTService(config);
    console.log('✅ STT service initialized');

    const llmService = initLLMService(config);
    console.log('✅ LLM service initialized');

    const ttsService = initTTSService(config);
    console.log('✅ TTS service initialized');

    // Discordボットを初期化
    const bot = initDiscordBot(
      config,
      {
        stt: sttService,
        llm: llmService,
        tts: ttsService,
      },
      history
    );
    console.log('✅ Discord bot initialized');

    // Discordにログイン
    await bot.login();

    console.log('\n✨ HanaseLLM is ready!\n');
    console.log('Available commands:');
    console.log('  !join         - Join voice channel');
    console.log('  !leave        - Leave voice channel');
    console.log('  !speakers     - List available speakers');
    console.log('  !setSpeaker N - Set speaker ID to N');
    console.log('  .<text>       - Send text message\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// 終了処理
async function cleanup() {
  console.log('\n🛑 Shutting down...');

  if (localLLMManager && localLLMManager.isRunning()) {
    console.log('Stopping local LLM API server...');
    await localLLMManager.stop();
  }

  console.log('Goodbye! 👋');
  process.exit(0);
}

// シグナルハンドリング
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// プログラム開始
main();
