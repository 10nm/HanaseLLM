// handle_streaming.js
import { EndBehaviorType } from '@discordjs/voice';
import fs from 'node:fs';
import wavConverter from 'wav-converter';
import prism from 'prism-media';
import config from './config.js';
import { main } from './main.js';
import { SpeechClient } from '@google-cloud/speech';
const { duration, silence, sampleRate, VoiceFilePATH } = config;

const client = new SpeechClient();

async function googleSTT(wavdata) {

    const request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: sampleRate,
            languageCode: 'ja-JP',
        },
        audio: {
            content: wavdata.toString('base64')
        }
    }
    const [response] = await client.recognize(request);
    const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
    console.log('Transcription: ', transcription);
    return transcription;
}

export { googleSTT };