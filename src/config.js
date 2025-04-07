// config.js
import dotenv from 'dotenv';
dotenv.config();

const config = {
    TOKEN: process.env.TOKEN,
    API_KEY: process.env.GEMINI_API_KEY,
    VoiceFilePATH: "./src/temp/voice.wav",
    duration: 1.5, // Minimum recording duration (seconds)
    silence: 1000, // Silence duration to end recording (milliseconds)
    max_token: 150, // Maximum number of tokens for LLM response
    speaker: 1, // VoiceVox speaker ID
    sampleRate: 48000,
    MODEL_NAME: "gemini-2.0-flash", // Model name for LLM
};

export default config;