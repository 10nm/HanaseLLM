import { promises as fs } from 'fs';
import { join } from 'path';
import type { ConversationHistory, HistoryMessage, Result } from '../types.js';

/**
 * 会話履歴を管理する関数群
 */

/**
 * 会話履歴をファイルから読み込む
 */
export const loadHistory = async (tempDir: string): Promise<ConversationHistory> => {
  const historyPath = join(tempDir, 'history.json');

  try {
    const data = await fs.readFile(historyPath, 'utf-8');
    const parsed = JSON.parse(data) as { messages: HistoryMessage[] };
    return { messages: parsed.messages || [] };
  } catch (error) {
    // ファイルが存在しない場合は空の履歴を返す
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { messages: [] };
    }
    throw error;
  }
};

/**
 * 会話履歴をファイルに保存する
 */
export const saveHistory = async (
  tempDir: string,
  history: ConversationHistory
): Promise<Result<void, Error>> => {
  const historyPath = join(tempDir, 'history.json');

  try {
    // tempディレクトリが存在しない場合は作成
    await fs.mkdir(tempDir, { recursive: true });

    await fs.writeFile(
      historyPath,
      JSON.stringify({ messages: history.messages }, null, 2),
      'utf-8'
    );

    return { success: true, value: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * 会話履歴に新しいメッセージを追加する（イミュータブル）
 */
export const addMessage = (
  history: ConversationHistory,
  message: HistoryMessage
): ConversationHistory => {
  return {
    messages: [...history.messages, message],
  };
};

/**
 * 会話履歴をクリアする
 */
export const clearHistory = (): ConversationHistory => {
  return { messages: [] };
};

/**
 * 会話履歴を取得する（読み取り専用）
 */
export const getMessages = (history: ConversationHistory): readonly HistoryMessage[] => {
  return history.messages;
};

/**
 * ユーザーメッセージを作成する
 */
export const createUserMessage = (content: string, username?: string): HistoryMessage => {
  const parts = username ? `${username}: ${content}` : content;
  return { role: 'user', parts };
};

/**
 * モデルメッセージを作成する
 */
export const createModelMessage = (content: string): HistoryMessage => {
  return { role: 'model', parts: content };
};

/**
 * 会話履歴を初期化して保存する
 */
export const initHistory = async (tempDir: string): Promise<ConversationHistory> => {
  const history = await loadHistory(tempDir);
  console.log(`Loaded ${history.messages.length} messages from history`);
  return history;
};

/**
 * 会話履歴にメッセージを追加して保存する
 */
export const pushAndSave = async (
  tempDir: string,
  history: ConversationHistory,
  message: HistoryMessage
): Promise<Result<ConversationHistory, Error>> => {
  const newHistory = addMessage(history, message);
  const saveResult = await saveHistory(tempDir, newHistory);

  if (!saveResult.success) {
    return { success: false, error: saveResult.error };
  }

  return { success: true, value: newHistory };
};
