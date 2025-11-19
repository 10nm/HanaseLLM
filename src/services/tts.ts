import axios from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import type { Config, TTSResult, Result, VoiceVoxSpeaker } from '../types.js';

/**
 * VoiceVox Text-to-Speechサービス
 */

/**
 * テキストから音声を生成する
 */
export const synthesizeSpeech = async (
  text: string,
  speaker: number,
  config: Config
): Promise<Result<TTSResult, Error>> => {
  try {
    // [英語]などのパターンを除去
    const cleanedText = text.replace(/\[.*?\]/g, '').trim();

    if (!cleanedText) {
      return {
        success: false,
        error: new Error('Empty text after cleaning'),
      };
    }

    // 音声クエリを作成
    const queryResponse = await axios.post(
      `${config.voicevoxUrl}/audio_query`,
      {},
      {
        params: {
          text: cleanedText,
          speaker,
        },
        timeout: 10000,
      }
    );

    const query = queryResponse.data;

    // 音声を合成
    const synthesisResponse = await axios.post(
      `${config.voicevoxUrl}/synthesis`,
      query,
      {
        params: { speaker },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );

    // tempディレクトリに保存
    await fs.mkdir(config.tempDir, { recursive: true });
    const outputPath = join(config.tempDir, 'output.wav');
    await fs.writeFile(outputPath, Buffer.from(synthesisResponse.data));

    return {
      success: true,
      value: {
        audioPath: outputPath,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data
        ? `VoiceVox error: ${JSON.stringify(error.response.data)}`
        : `VoiceVox error: ${error.message}`;
      return {
        success: false,
        error: new Error(message),
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * VoiceVoxサーバーから利用可能なスピーカー一覧を取得
 */
export const getSpeakers = async (
  config: Config
): Promise<Result<VoiceVoxSpeaker[], Error>> => {
  try {
    const response = await axios.get<VoiceVoxSpeaker[]>(
      `${config.voicevoxUrl}/speakers`,
      { timeout: 5000 }
    );

    return {
      success: true,
      value: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: new Error(`Failed to get speakers: ${error.message}`),
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * スピーカー一覧をフォーマットして表示用の文字列を生成
 */
export const formatSpeakers = (speakers: VoiceVoxSpeaker[]): string => {
  const lines = speakers.flatMap((speaker) =>
    speaker.styles.map(
      (style) =>
        `ID: ${style.id.toString().padStart(3)} | ${speaker.name} (${style.name})`
    )
  );

  return lines.join('\n');
};

/**
 * TTSサービスを初期化する
 */
export const initTTSService = (config: Config) => {
  let currentSpeaker = config.speaker;

  return {
    synthesize: (text: string) =>
      synthesizeSpeech(text, currentSpeaker, config),
    getSpeakers: () => getSpeakers(config),
    setSpeaker: (speakerId: number) => {
      currentSpeaker = speakerId;
    },
    getCurrentSpeaker: () => currentSpeaker,
  };
};
