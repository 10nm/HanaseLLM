import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} from "@google/genai";

import config from "./config.js";
  
async function transcribeAudio(filePath) {
  const GEMINI_API_KEY = config.API_KEY;
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  try {
    const myfile = await ai.files.upload({
      file: filePath,
      config: { mimeType: "audio/mpeg" },
    });    
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
          createPartFromUri(myfile.uri, myfile.mimeType),
          "日本語で音声を文字起こししてください。もし聞き取れなかったり、内容がなかったりした場合は、'Null'とだけ返してください。",
      ]),
    });
    if (result.text === "Null") {
      console.log("No content found in the audio.");
      return null;
    }
    return result.text;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

export { transcribeAudio };