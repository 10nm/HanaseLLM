// config.js
import dotenv from 'dotenv';
dotenv.config();

const config = {
    TOKEN: process.env.TOKEN,
    API_KEY: process.env.GEMINI_API_KEY,
    VoiceFilePATH: "./src/temp/voice.wav",
    duration: 0.5, // Minimum recording duration (seconds)
    silence: 1000, // Silence duration to end recording (milliseconds)
    max_token: 150, // Maximum number of tokens for LLM response
    speaker: 4, // VoiceVox speaker ID
    sampleRate: 16000
};

export default config;