// llm.js
// import axios from 'axios';
import config from './config.js';
const { API_KEY } = config;
import { get_history, init_history, push_history } from './history.js';

import { GoogleGenAI } from "@google/genai";

let ai;
let chat;

/**
 * Generates a response using the Google Gemini API.
 * @param {string} userId - The ID of the user.
 * @param {string} userMessage - The message from the user.
 * @returns {string} - The generated response.
 */
async function llm(userId, userMessage) {
  // Initialize GoogleGenAI and chat only once
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  if (!chat) {
    init_history();
    const history = get_history();
    chat = ai.chats.create({
      model: "gemini-2.0-flash-lite",
      config: {
        systemInstruction: "日本語での音声電話のシミュレーションを行います。ユーザーの発言に対しては**話し言葉で**、**簡潔に**応答してください。",
      },
      history: history,
    });
  }

  // Push user message to history
  push_history({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const response = await chat.sendMessage({
      message: userMessage
    });

    const LLM_Message = response.text;

    if (LLM_Message) {
      push_history({ role: 'model', parts: [{ text: LLM_Message }] });
      return LLM_Message;
    } else {
      console.warn("No content in the last message:", response);
      return null;
    }
  } catch (error) {
    console.error("Error in llm function:", error);
    return null;
  }
}

export { llm };