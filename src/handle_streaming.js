// handle_streaming.js
import { EndBehaviorType } from '@discordjs/voice';
import fs from 'node:fs';
import wavConverter from 'wav-converter';
import prism from 'prism-media';
import config from './config.js';
import { main } from './main.js';
const { duration, silence, sampleRate, VoiceFilePATH } = config;

function handleStreaming(connection, message) {
    const receiver = connection.receiver;
    let flag = false;

    receiver.speaking.on('start', userId => {
        if (flag) {
            console.log(`Already listening to ${userId}`);
            return;
        }
        flag = true;
        console.log(`Listening to ${userId}`);
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
                const pcmBuffer = Buffer.concat(pcmChunks);
                const wavBuffer = wavConverter.encodeWav(pcmBuffer, {
                    numChannels: 1,
                    sampleRate: sampleRate,
                    byteRate: 16
                });

                main(userId, connection, message, wavBuffer);
                flag = false;

            } else {
                console.log(`Recording for ${userId} was too short`);
                flag = false;
            }
        });
    });
}

export { handleStreaming };