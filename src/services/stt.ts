import { SpeechClient } from '@google-cloud/speech';
import type { Config, STTResult, Result } from '../types.js';

/**
 * Google Cloud Speech-to-Textサービス
 */

/**
 * Speech-to-Textクライアントを作成
 */
export const createSTTClient = (config: Config) => {
  const clientConfig = config.googleCloudKeyFile
    ? { keyFilename: config.googleCloudKeyFile }
    : {};

  return new SpeechClient(clientConfig);
};

/**
 * WAVデータをテキストに変換する
 */
export const transcribeAudio = async (
  client: SpeechClient,
  audioBuffer: Buffer,
  config: Config
): Promise<Result<STTResult, Error>> => {
  const startTime = Date.now();

  try {
    const audio = {
      content: audioBuffer.toString('base64'),
    };

    const requestConfig = {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: config.sampleRate,
      languageCode: 'ja-JP',
    };

    const request = {
      audio,
      config: requestConfig,
    };

    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      return {
        success: false,
        error: new Error('No transcription results'),
      };
    }

    const transcription = response.results
      .map((result) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcription) {
      return {
        success: false,
        error: new Error('Empty transcription result'),
      };
    }

    const confidence =
      response.results[0]?.alternatives?.[0]?.confidence || undefined;

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      value: {
        text: transcription,
        confidence,
        processingTime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * STTサービスを初期化する
 */
export const initSTTService = (config: Config) => {
  const client = createSTTClient(config);

  return {
    transcribe: (audioBuffer: Buffer) =>
      transcribeAudio(client, audioBuffer, config),
  };
};
