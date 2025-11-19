declare module 'wav-converter' {
  export interface EncodeOptions {
    numChannels: number;
    sampleRate: number;
    byteRate: number;
  }

  export function encodeWav(
    buffer: Buffer,
    options: EncodeOptions
  ): ArrayBuffer;

  export function decodeWav(
    buffer: ArrayBuffer
  ): {
    sampleRate: number;
    channelData: Float32Array[];
  };
}
