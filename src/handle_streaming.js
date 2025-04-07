// handle_streaming.js
import { EndBehaviorType } from '@discordjs/voice';
import fs from 'node:fs';
import wavConverter from 'wav-converter';
import prism from 'prism-media';
import config from './config.js';
import { main } from './main.js';
import { llm } from './llm.js';
import { clearTimeout } from 'node:timers';
import { randomBytes } from 'node:crypto';
const { duration, silence, sampleRate, VoiceFilePATH } = config;

function handleStreaming(connection, client, message, speaker) {
    const receiver = connection.receiver;
    let flag = false;
    let llm_waiting = false;
    let timeoutId;

    receiver.speaking.on('start', userId => {
        if (flag) {
            console.log(`Already listening to ${userId}`);
            return;
        }
        flag = true;
        clearTimeout(timeoutId);
        const user = client.users.cache.get(userId);
        const username = user.displayName;
        console.log(`Listening to ${username}`);
        const audioStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: silence
            }
        });

        const pcmStream = audioStream.pipe(new prism.opus.Decoder({ rate: sampleRate, channels: 1, frameSize: 960 }));

        const pcmChunks = [];
        pcmStream.on('data', chunk => {
            pcmChunks.push(chunk);
        });

        let startTime = Date.now();
        pcmStream.on('end', () => {
            
            const endTime = Date.now();
            const session_time = (endTime - startTime) / 1000;
            console.log(`Recording duration: ${session_time} seconds`);

            if (session_time > duration) {
                llm_waiting = false;

                const pcmBuffer = Buffer.concat(pcmChunks);
                const wavBuffer = wavConverter.encodeWav(pcmBuffer, {
                    numChannels: 1,
                    sampleRate: sampleRate,
                    byteRate: 16
                });


                main(username, connection, message, wavBuffer, speaker, session_time);
                flag = false;
                let endTime = Date.now();

            } else {
                console.log(`Recording for ${userId} was too short`);
                flag = false;
            }


            if (!llm_waiting) {
                llm_waiting = true;
                const randomDelay = Math.floor(Math.random() * (90000 - 30000 + 1)) + 30000; // 30秒から90秒のランダムな遅延
                console.log("LLMの発話までの遅延時間:", randomDelay);
                timeoutId = setTimeout(() => {
                    // LLMに通話を開始させる処理
                    console.log("LLMの発話を開始します");
                    main("SYSTEM", connection, message, "[System] このメッセージはユーザーによるものではありません。ユーザーが一定時間発言しなかったので、もし何かの話題の最中であればその続き、そうでなければ全く関係のないフレッシュな話題を振ってください。", speaker, 0); // usernameを"LLM"に設定し、wavBufferをnullに設定
                    llm_waiting = false;
                }, randomDelay);
            }
        });
    });
}

export { handleStreaming };