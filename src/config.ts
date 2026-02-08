import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Config } from './types.js';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 環境変数から設定値を取得し、デフォルト値とマージする
 */
export const getConfig = (): Config => {
  const discordToken = process.env.DISCORD_TOKEN;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const llmProvider = (process.env.LLM_PROVIDER || 'gemini') as 'gemini' | 'local';

  if (!discordToken) {
    throw new Error('DISCORD_TOKEN is required in environment variables');
  }

  // Geminiプロバイダーの場合のみAPIキー必須
  if (llmProvider === 'gemini' && !geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required when LLM_PROVIDER is gemini');
  }

  // ローカルプロバイダーの場合の検証
  const localLlmUrl = process.env.LOCAL_LLM_URL || 'http://localhost:8000';
  const localLlmAutoStart = process.env.LOCAL_LLM_AUTO_START !== 'false';
  const localLlmScriptPath = process.env.LOCAL_LLM_SCRIPT_PATH;

  if (llmProvider === 'local' && localLlmAutoStart && !localLlmScriptPath) {
    throw new Error(
      'LOCAL_LLM_SCRIPT_PATH is required when LLM_PROVIDER is local and LOCAL_LLM_AUTO_START is true'
    );
  }

  return {
    discordToken,
    geminiApiKey,
    googleCloudKeyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    voicevoxUrl: process.env.VOICEVOX_URL || 'http://127.0.0.1:50021',
    sampleRate: parseInt(process.env.SAMPLE_RATE || '48000', 10),
    silenceDuration: parseInt(process.env.SILENCE_DURATION || '1000', 10),
    minRecordingDuration: parseFloat(process.env.MIN_RECORDING_DURATION || '1.5'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '150', 10),
    modelName: process.env.MODEL_NAME || 'gemini-2.0-flash',
    speaker: parseInt(process.env.SPEAKER || '1', 10),
    tempDir: join(__dirname, 'temp'),
    llmProvider,
    localLlmUrl,
    localLlmAutoStart,
    localLlmScriptPath,
    maxVoiceResponseLength: parseInt(process.env.MAX_VOICE_RESPONSE_LENGTH || '300', 10),
  };
};

/**
 * 設定値の妥当性を検証する
 */
export const validateConfig = (config: Config): Result<Config, string> => {
  const errors: string[] = [];

  if (config.sampleRate <= 0) {
    errors.push('Sample rate must be positive');
  }

  if (config.silenceDuration < 0) {
    errors.push('Silence duration must be non-negative');
  }

  if (config.minRecordingDuration <= 0) {
    errors.push('Min recording duration must be positive');
  }

  if (config.maxTokens <= 0) {
    errors.push('Max tokens must be positive');
  }

  if (config.speaker < 0) {
    errors.push('Speaker ID must be non-negative');
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join(', ') };
  }

  return { success: true, value: config };
};

type Result<T, E> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };
