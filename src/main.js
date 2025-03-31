import config from "./config.js";
// 文字起こし
import { transcribeAudio } from "./transcription.js";
// 応答生成
import { llm } from "./llm.js";
// 音声合成
import { VoiceVox, playAudio } from "./voice_synthesis.js";


const VoiceFilePATH = config.VoiceFilePATH;

// pcmStream end (話し終わり)にトリガされる 
async function main(userId, connection, message) {
    // gemini に文字起こしさせる
    const usermessage = await transcribeAudio(VoiceFilePATH);
    const username = message.author.username;
    if (usermessage) {
        console.log(`User message: ${usermessage}`);
        message.channel.send(`[transcription] ${username}: ${usermessage}`);
    } else {
        console.log("Error: No user message received.");
        return;
    }
    // gemini に応答を生成させる
    const LLM_Message = await llm(userId, usermessage);
    if (LLM_Message) {
        console.log(`LLM message: ${LLM_Message}`);
        message.channel.send(`[LLM_gen] Gemini-2.0-flash-lite: ${LLM_Message}`);
    } else {
        console.log("Error: No LLM message received.");
        return;
    }
    
    // voicevox に音声合成させる ・ 流す
    const result = await VoiceVox(LLM_Message);
    if (result) {
        console.log(`Voice synthesis result: ${result}`);
    } else {
        console.log("Error: No voice synthesis result received.");
        return;
    }
    // 音声を流す
    if (result) {
        await playAudio(connection, result);
    } else {
        console.log("Error: No audio to play.");
        return;
    }

}

export { main };