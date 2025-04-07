// llm.js
// import axios from 'axios';
import config from './config.js';
const { API_KEY } = config;
import { get_history, init_history, push_history } from './history.js';

import { GoogleGenAI } from "@google/genai";

let ai;
let chat;


// 適当にAIに書かせたプロンプト
// 要修正 応答が面白くない 絵文字出しがち
const systemInstruction = `
# 日本語音声通話シミュレーション設定

## 基本設定
- 環境：Discordボイスチャンネル
- 現在時刻：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
- 現在曜日：${new Date().toLocaleDateString('ja-JP', { weekday: 'long', timeZone: 'Asia/Tokyo' })}

## キャラクター設定
あなたは個性的な知的好奇心を持つ一人の人間として振る舞います。
会話は自然な話し言葉で行い、以下の特徴を持ちます：

- 知識が豊富で、様々な分野に独自の視点を持っている
- ときおり予想外の連想や思考の飛躍を見せる
- 自分なりの価値観や意見を持ち、単なる同意だけでなく、建設的な反論や別の視点も提示する
- ユーモアと洞察に富んだ会話を心がける

## 応答スタイル
- 自然な話し言葉を使用
- **端的に**、会話の流れに合った返答
- 箇条書きや機械的な応答は避ける
- 英語や英語の固有名詞はカタカナ表記の後、[英語]を添える: グーグル[Google]
`

console.log("systemInstruction:", systemInstruction);
/**
 * Generates a response using the Google Gemini API.
 * @param {string} username - The name of the user.
 * @param {string} userMessage - The message from the user.
 * @returns {string} - The generated response.
 */

async function llm(username, userMessage) {
  // Initialize GoogleGenAI and chat only once
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  if (!chat) {
    init_history();
    const history = get_history();
    chat = ai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: systemInstruction,
      },
      history: history,
    });
  }

  // Push user message to history
  push_history({ role: 'user', parts: [{ text: userMessage }] });

  const sendMSG = `${username}: ${userMessage}`;
  console.log("sendMSG:", sendMSG);
  try {
    const startTime = Date.now();
    const response = await chat.sendMessage({
      message: sendMSG
    });
    const endTime = Date.now();
    const session_time = (endTime - startTime) / 1000;

    const LLM_Message = response.text;

    if (LLM_Message) {
      push_history({ role: 'model', parts: [{ text: LLM_Message }] });
      return [LLM_Message, session_time];
    } else {
      console.warn("No content in the last message:", response);
      return null;
    }
  } catch (error) {
    console.error("Error in llm function:", error);
    return null;
  }
}

async function llm_battle(username, userMessage) {
  const ai_battle = new GoogleGenAI({ apiKey: API_KEY });
  const send_msg = `${username}: ${userMessage}`;
  const response = await ai_battle.models.generateContent({
    model: "gemini-2.0-flash",
    contents: send_msg,
  });
  return response.text;
}

export { llm, llm_battle };