import config from "./config.js";
const MODEL_NAME = config.MODEL_NAME;
// 応答生成
import { llm } from "./llm.js";
// 音声合成
import { VoiceVox, playAudio } from "./voice_synthesis.js";
// 文字起こし
import { googleSTT } from "./STT.js";


// const VoiceFilePATH = config.VoiceFilePATH;

// pcmStream end (話し終わり)にトリガされる 
async function main(username, connection, message, data, speaker, speak_long) {
    // gemini に文字起こしさせる
    // const usermessage = await transcribeAudio(VoiceFilePATH);
    // const username = message.author.displayName;
    // if (usermessage) {
    //     console.log(`User message: ${usermessage}`);
    //     message.channel.send(`[transcription] ${username}: ${usermessage}`);
    // } else {
    //     console.log("Error: No user message received.");
    //     return;
    // }

    let usermessage;
    if (data) {
        if (typeof data === 'string') {
            usermessage = data;
        } else {
            // googleSTT に音声認識させる
            const start = performance.now();
            usermessage = await googleSTT(data);
            console.log(usermessage.length);
            const end = performance.now();
            let session_time = (end - start) / 1000;
            session_time = session_time.toFixed(2);
            if (usermessage.length > 0) {
                console.log(`STT時間: ${session_time} seconds`);
                console.log(`User message: "${usermessage}"`);
                message.channel.send(`[transcription in ${session_time}s <- ${speak_long}s <= ${usermessage.length}L] **${username}**: \n"${usermessage}"`);
           }
        }
    } else {
        usermessage = message.content.slice(1);
        console.log(`User message: "${usermessage}"`);
        message.channel.send(`[text input ${usermessage.length}L] **${username}**: \n"${usermessage}"`);

        const text_speaker = 52
        // voicevox に音声合成させる ・ 流す
        const result = await VoiceVox(usermessage, text_speaker);
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
    // gemini に応答を生成させる
    let LLM_Message;
    if (usermessage) {
        console.log("Generating response...");
        let session_time = 0;
        [LLM_Message, session_time] = await llm(username, usermessage, MODEL_NAME);
        console.log(`LLM message: ${LLM_Message}`);
        message.channel.send(`[LLM_generate in ${(Number(session_time)).toFixed(2)}s <= ${LLM_Message.length}L] **他者くん (${MODEL_NAME})**: \n${LLM_Message}`);
    } else {
        console.log("Error: No user message received.");
        return;
    }
    
    // voicevox に音声合成させる ・ 流す
    console.log(LLM_Message.length);
    if (LLM_Message.length > 0 && LLM_Message.length < 800) {
        LLM_Message = LLM_Message.replace(/\[.*?\]/g, '');
        const result = await VoiceVox(LLM_Message, speaker);
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
}

export { main };