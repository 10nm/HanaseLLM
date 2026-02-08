import type { VoiceConnection, AudioPlayer } from '@discordjs/voice';
import type { Message, VoiceBasedChannel } from 'discord.js';

// ============================================================================
// Configuration Types
// ============================================================================

export type LLMProvider = 'gemini' | 'local';

export interface Config {
  readonly discordToken: string;
  readonly geminiApiKey?: string;
  readonly googleCloudKeyFile?: string;
  readonly voicevoxUrl: string;
  readonly sampleRate: number;
  readonly silenceDuration: number;
  readonly minRecordingDuration: number;
  readonly maxTokens: number;
  readonly modelName: string;
  readonly speaker: number;
  readonly tempDir: string;
  readonly llmProvider: LLMProvider;
  readonly localLlmUrl?: string;
  readonly localLlmAutoStart: boolean;
  readonly localLlmScriptPath?: string;
  readonly maxVoiceResponseLength: number;
}

// ============================================================================
// Conversation History Types
// ============================================================================

export interface HistoryMessage {
  readonly role: 'user' | 'model';
  readonly parts: string;
}

export interface ConversationHistory {
  readonly messages: readonly HistoryMessage[];
}

// ============================================================================
// Service Types
// ============================================================================

export interface STTResult {
  readonly text: string;
  readonly confidence?: number;
  readonly processingTime: number;
}

export interface LLMResponse {
  readonly text: string;
  readonly processingTime: number;
}

export interface TTSResult {
  readonly audioPath: string;
  readonly duration?: number;
}

// ============================================================================
// Audio Processing Types
// ============================================================================

export interface AudioBuffer {
  readonly data: Buffer;
  readonly sampleRate: number;
  readonly channels: number;
}

export interface VoiceStreamOptions {
  readonly sampleRate: number;
  readonly channels: number;
  readonly silenceDuration: number;
  readonly minDuration: number;
}

// ============================================================================
// Discord Types
// ============================================================================

export interface VoiceState {
  readonly connection: VoiceConnection;
  readonly player: AudioPlayer;
  readonly channel: VoiceBasedChannel;
  readonly speaking: boolean;
}

export interface ConversationContext {
  readonly message: Message;
  readonly username: string;
  readonly isTextInput: boolean;
}

// ============================================================================
// VoiceVox Types
// ============================================================================

export interface VoiceVoxSpeaker {
  readonly name: string;
  readonly speaker_uuid: string;
  readonly styles: readonly {
    readonly name: string;
    readonly id: number;
  }[];
  readonly version: string;
}

// ============================================================================
// Result Types (for error handling)
// ============================================================================

export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

// ============================================================================
// Logger Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMessage {
  readonly level: LogLevel;
  readonly timestamp: Date;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}
