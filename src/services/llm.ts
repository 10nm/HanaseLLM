import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import type { Config, ConversationHistory, LLMResponse, Result } from '../types.js';

/**
 * Google Gemini LLMサービス
 */

/**
 * システムプロンプトを生成
 */
const createSystemPrompt = (): string => {
  const now = new Date();
  const formattedDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const formattedTime = `${now.getHours()}時${now.getMinutes()}分`;

  return `ユーザーに対して適切に応答してください。`;
};

/**
 * Gemini APIクライアントを作成
 */
export const createLLMClient = (config: Config) => {
  if (config.llmProvider === 'local') {
    return null;
  }
  return new GoogleGenAI({ apiKey: config.geminiApiKey });
};

/**
 * 会話履歴をGemini APIのフォーマットに変換
 */
const formatHistory = (history: ConversationHistory) => {
  return history.messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.parts }],
  }));
};

/**
 * ローカルLLM用のプロンプトを作成
 */
const createLocalPrompt = (
  systemPrompt: string,
  history: ConversationHistory,
  userMessage: string
): string => {
  let prompt = `${systemPrompt}\n\n`;

  for (const msg of history.messages) {
    const role = msg.role === 'user' ? 'User' : 'Model';
    prompt += `${role}: ${msg.parts}\n`;
  }

  prompt += `User: ${userMessage}\nModel:`;
  return prompt;
};

/**
 * LLMで応答を生成する
 */
export const generateResponse = async (
  client: GoogleGenAI | null,
  userMessage: string,
  history: ConversationHistory,
  config: Config
): Promise<Result<LLMResponse, Error>> => {
  const startTime = Date.now();

  try {
    const systemPrompt = createSystemPrompt();

    // ローカルLLMの場合
    if (config.llmProvider === 'local') {
      console.log('🤖 Using Local LLM Provider');
      const prompt = createLocalPrompt(systemPrompt, history, userMessage);

      const response = await axios.post(
        `${config.localLlmUrl}/generate`,
        {
          prompt,
          max_new_tokens: config.maxTokens,
          temperature: 0.7,
          top_p: 0.9,
        },
        { timeout: 60000 } // 長めのタイムアウト
      );

      const text = response.data.response;

      if (!text) {
        return {
          success: false,
          error: new Error('Empty response from Local LLM'),
        };
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        value: {
          text,
          processingTime,
        },
      };
    }

    // Gemini APIの場合
    if (!client) {
      return {
        success: false,
        error: new Error('Gemini client not initialized'),
      };
    }

    const formattedHistory = formatHistory(history);

    // チャットセッションを作成
    const chat = client.chats.create({
      model: config.modelName,
      config: {
        maxOutputTokens: config.maxTokens,
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
      history: formattedHistory,
    });

    // メッセージを送信
    const result = await chat.sendMessage({ message: userMessage });
    const text = result.text ?? '';

    if (!text) {
      return {
        success: false,
        error: new Error('Empty response from LLM'),
      };
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      value: {
        text,
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
 * LLMサービスを初期化する
 */
export const initLLMService = (config: Config) => {
  const model = createLLMClient(config);

  return {
    generate: (userMessage: string, history: ConversationHistory) =>
      generateResponse(model, userMessage, history, config),
  };
};
