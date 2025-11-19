import { pipeline } from 'stream';
import { promisify } from 'util';
import prism from 'prism-media';
import wavConverter from 'wav-converter';
import type { Readable } from 'stream';
import type { Config } from '../types.js';

const pipelineAsync = promisify(pipeline);

/**
 * 音声処理ユーティリティ関数群
 */

/**
 * Opus音声ストリームをPCMバッファに変換する
 */
export const opusToPCM = async (
  opusStream: Readable,
  sampleRate: number
): Promise<Buffer> => {
  const decoder = new prism.opus.Decoder({
    rate: sampleRate,
    channels: 1,
    frameSize: 960,
  });

  const chunks: Buffer[] = [];

  decoder.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  await pipelineAsync(opusStream, decoder);

  return Buffer.concat(chunks);
};

/**
 * PCMバッファをWAVバッファに変換する
 */
export const pcmToWav = (pcmBuffer: Buffer, sampleRate: number): Buffer => {
  const wavBuffer = wavConverter.encodeWav(pcmBuffer, {
    numChannels: 1,
    sampleRate,
    byteRate: 16,
  });

  return Buffer.from(wavBuffer);
};

/**
 * 音声データの最小長をチェックする
 */
export const isValidDuration = (
  pcmBuffer: Buffer,
  sampleRate: number,
  minDuration: number
): boolean => {
  const durationSeconds = pcmBuffer.length / (sampleRate * 2); // 16-bit = 2 bytes
  return durationSeconds >= minDuration;
};

/**
 * Discord音声ストリームをWAVファイルに変換する（完全版）
 */
export const processVoiceStream = async (
  opusStream: Readable,
  config: Config
): Promise<Buffer | null> => {
  try {
    // Opus → PCM
    const pcmBuffer = await opusToPCM(opusStream, config.sampleRate);

    // 最小録音時間をチェック
    if (!isValidDuration(pcmBuffer, config.sampleRate, config.minRecordingDuration)) {
      console.log(
        `Recording too short: ${pcmBuffer.length / (config.sampleRate * 2)}s`
      );
      return null;
    }

    // PCM → WAV
    const wavBuffer = pcmToWav(pcmBuffer, config.sampleRate);

    return wavBuffer;
  } catch (error) {
    console.error('Error processing voice stream:', error);
    return null;
  }
};

/**
 * 音声の長さを計算する（秒）
 */
export const calculateDuration = (
  pcmBuffer: Buffer,
  sampleRate: number
): number => {
  return pcmBuffer.length / (sampleRate * 2); // 16-bit = 2 bytes
};
