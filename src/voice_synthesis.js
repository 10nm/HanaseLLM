// voice_synthesis.js
import axios from 'axios';
import fs from 'fs';
import config from './config.js';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';

const speaker = config.speaker; // VoiceVox speaker ID

/**
 * Generates audio using VoiceVox.
 * @param {string} llmMessage - The message to synthesize.
 * @returns {string} - The base64 encoded audio data.
 */
async function VoiceVox(llmMessage) {
    try {
        const msg = llmMessage;
        const responseQuery = await axios.post(
            `http://127.0.0.1:50021/audio_query?speaker=${speaker}&text="${msg}"`
        );
        const query = responseQuery.data;
        const responseSynthesis = await axios.post(
            `http://127.0.0.1:50021/synthesis?speaker=${speaker}`,
            query,
            { responseType: 'arraybuffer' }
        );
        const base64Data = Buffer.from(responseSynthesis.data, 'binary').toString('base64');
        
        // Convert base64 to binary and save to file
        const buf = Buffer.from(base64Data, 'base64');
        fs.writeFileSync('./src/temp/output.wav', buf);
        return './src/temp/output.wav';
    } catch (error) {
        console.error("Error in VoiceVox:", error);
        return null; // Or throw the error, or return a default value
    }
}

/**
 * Plays an audio file in the voice channel.
 * @param {object} connection - The voice connection object.
 * @param {string} filePath - The path to the audio file.
 */
async function playAudio(connection, filePath) {
    try {
        const player = createAudioPlayer();
        const resource = createAudioResource(filePath);
        player.play(resource);
        connection.subscribe(player);
        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Voice played');
        });
    } catch (error) {
        console.error("Error playing audio:", error);
    }
}

export { VoiceVox, playAudio };