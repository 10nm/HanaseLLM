const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, EndBehaviorType, PlayerSubscription  } = require('@discordjs/voice');
const { createWriteStream } = require('fs');
const prism = require('prism-media');
require('dotenv').config();
var wavConverter = require('wav-converter');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const TOKEN = process.env.TOKEN;
const fetch = require('node-fetch');


const sampleRate = 16000;


const audioCtx = require('web-audio-api').AudioContext
const context = new audioCtx()


// error handling
let recognizerFreed = false;
let modelFreed = false;

let userlist = [];
let userHistory = {};

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildVoiceStates
    ] 
});

function getHistory(userId) {
    if (userlist.includes(userId)) {
    } else {
        userlist.push(userId);
    }

    if (userHistory[userId]) {
        return userHistory[userId];
    } else {
        userHistory[userId] = [];
        return userHistory[userId];
    }
}

async function transcribeAudio(filePath) {
    try {
        const audioData = fs.readFileSync(filePath);
        const form = new FormData();
        form.append('audio', audioData, {
            filename: 'audio.wav',
            contentType: 'audio/wav'
        });
        const response = await axios.post('http://localhost:5000/transcribe', form, {
            headers: {
                ...form.getHeaders()
            }
        });

        return response; // Return the response data
    } catch (error) {
        if (error.response) {
            // サーバーがステータスコード400を返した場合
            console.error('Error response:', error.response.data);
            console.error('Status code:', error.response.status);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            // リクエストが送信されたが、応答がない場合
            console.error('No response received:', error.request);
        } else {
            // リクエストの設定中にエラーが発生した場合
            console.error('Error setting up request:', error.message);
        }
    }
}

let Flag=false;
let llmflag = false;
let toggleF = false;
let log = false;

client.once('ready', () => {
	console.log('Bot is online!');
});

client.on('messageCreate', async message => {

    if (message.content === '!stop') {
        toggleF = true;
        message.channel.send('Stopped');
    }

    if (message.content === '!start') {
        toggleF = false;
        let Flag=false;
        let llmflag = false;
        message.channel.send('Started');
    }

    if (message.content === '!log') {
        if (log) {
            log = false;
            message.channel.send('Log OFF')
        } else {
            log = true;
            message.channel.send('Log ON')
        }
    }

    if (message.content === '!history') {
        await message.channel.send(`${userlist}`);
        for (let userId of userlist) {
            var name = message.guild.members.cache.get(userId).user.username;
            await message.channel.send(name);
            var history = getHistory(userId);
            await message.channel.send(JSON.stringify(history));
        }
    }

    if (message.content === '!clear') {
        userHistory = {};
        message.channel.send('History cleared');
    }

    if (message.content === '!join') {
        if (message.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: message.member.voice.channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });
            
            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('The bot has connected to the channel!');
            });

            const receiver = connection.receiver;

            receiver.speaking.on('start', userId => {
                if (toggleF) {
                    return;
                }
                if (Flag) return;
                Flag=true;
                console.log(`Listening to ${userId}`);
                const audioStream = receiver.subscribe(userId, {
                    end: {
                        behavior: EndBehaviorType.AfterSilence,
                        duration: 1000
                    }
                });

                const pcmStream = audioStream.pipe(new prism.opus.Decoder({ rate: sampleRate, channels: 2, frameSize: 960 }));
                
                const pcmChunks = []
                pcmStream.on('data', chunk => {
                    pcmChunks.push(chunk);
                });

                let startTime = Date.now();
                pcmStream.on('end', () => {
                    Flag=false;
                    const endTime=Date.now();
                    const duration = (endTime-startTime-1000)/1000;
                    console.log(`Recording duration: ${duration} seconds`);
                    
                    if (duration > 0.7){
                        if (llmflag) return;
                        llmflag = true;
                        const pcmBuffer = Buffer.concat(pcmChunks);
                        const wavBuffer = wavConverter.encodeWav(pcmBuffer, {
                            numChannels: 2,
                            sampleRate: sampleRate,
                            byteRate: 16
                        });
                        
                        const filePath = `voice.wav`;

                        fs.writeFileSync(filePath, wavBuffer);
                        console.log(`Saved recording for ${userId}`);
                        
                        transcribeAudio(filePath).then(response => {
                            if (response) {
                                if (response.data.text === '') {
                                    console.log('No speech detected');
                                    return;
                                }
                                const user = message.guild.members.cache.get(userId);
                                const userName = user.user.username;
                                llmflag = false;
                                console.log(response.data);
                                const transcription = response.data.text;
                                console.log(transcription);

                                if (log) { 
                                    message.channel.send(`Recognized: ${userName}: ${transcription}`);
                                }

                                var userhistory = getHistory(userId);
                                
                                llm(userName,transcription,userhistory).then(responsellm => {
                                    if (responsellm) {
                                        console.log(responsellm);
                                        userhistory.push({ role: "Assistant", content: responsellm });

                                        if (log) {
                                            message.channel.send(`Assistant: ${responsellm}`);
                                        }
                                        voicevox(responsellm).then(async (audioBase64) => {
                                            const buf = Buffer.from(audioBase64, 'base64');
                                            fs.writeFileSync('output.wav', buf);
                                            const connection = getVoiceConnection(message.guild.id);
                                            playAudio(connection, 'output.wav');

                                        });

                                    } else {
                                        console.error('Error response llm:');
                                    }
                                });

                            } else {
                                console.error('Error transcribing audio');
                            }


                        });
                        
                        
                        // try {
                        //     const result = transcribeAudio(filePath);
                        //     console.log(result);
                        //     const transcription = result[0].text;
                        //     const jsonResponse = JSON.stringify({ text: transcription });
                        //     console.log(`Recognized: ${message.author.username}: ${jsonResponse}`);
                        //     message.channel.send(`Recognized: ${message.author.username}: ${jsonResponse}`);
                        // } catch (error) {
                        //     console.error('Error transcribing audio:', error);
                        // }

                        // fs.readFile(filePath, (err, buffer) => {
                        //     if (err) {
                        //         console.error("Error reading file:", err);
                        //         return;
                        //     }
                            
                        //     wav.decode(buffer).then(audioData => {
                        //         if (audioData.sampleRate !== sampleRate) {
                        //             console.error(`Sample rate ${audioData.sampleRate} is not supported. Please use ${sampleRate}`);
                        //             return;
                        //         }

                        //         const channelData = audioData.channelData[0];
                        //         const int16Array = new Int16Array(channelData.length);
                        //         for (let i = 0; i < channelData.length; i++) {
                        //             int16Array[i] = channelData[i] * 32767;
                        //         }

                        //         const rec = new Recognizer({ model: model, sampleRate: sampleRate });
                        //         rec.acceptWaveform(int16Array);
                        //         console.log(message.author.username)
                        //         var result = rec.finalResult();
                        //         console.log(result);
                        //         rec.free();

                        //         if (result != null) {
                        //             console.log(`Recognized: ${message.author.username}: ${result.text}`);
                        //         }
                                
                        //     }).catch(err => {
                        //         console.error("Error decoding WAV file:", err);
                        //     });
                        // });

                        // process.on('SIGINT', function() {
                        //     console.log("\nStopping");
                        //     model.free();
                        //     process.exit();
                        // });

                        // const fileStream = fs.createReadStream(filePath);
                        // const reader = new wav.Reader();

                        // reader.on('format', format => {
                        //     reader.on('data', data => {
                        //         rec.acceptWaveform(data);
                        //     });
                        //     reader.on('end', () => {
                        //         console.log("Cleaning up");
                        //         console.log(rec.finalResult());
                        //         rec.free();
                        //         model.free();
                        //     });
                        // })

                        // fileStream.pipe(reader);

                        // process.on('SIGINT', function() {
                        //     console.log("\nStopping");
                        //     fileStream.stop();
                        // });
                    } else {
                        console.log(`Recording for ${userId} was too short`);
                    }
                });
            });
            message.channel.send('Joined the voice channel!');
        } else {
            message.channel.send('You need to join a voice channel first!');
        }
    } else if (message.content === '!leave') {
        const connection = getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.channel.send('Left the voice channel!');
        } else {
            message.channel.send('I am not in a voice channel!');
        }
    }
});

async function llm(username,userMessage,history) {
    history.push({ role: "user", content: userMessage });
    const url = "http://127.0.0.1:5001/v1/chat/completions";
    var headers = {
        'Content-Type': 'application/json'
    };

    let data = {
        mode: "chat",
        character: "Assistant",
        messages: history,
        max_tokens: 100,
        auto_max_new_tokens: false,
        temperature: 1.0,
        top_p: 0.9,
        seed: -1,
        stop: ["\n", "User", "Assistant"]
    };

    try {
        var response = await axios.post(url, data, { headers });
        var assistantMessage = response.data.choices[0].message.content;
        return assistantMessage;
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
}

//URL
//http://127.0.0.1:50021/audio_query?text=aaa&speaker=3


//https://zenn.dev/hathle/books/next-voicevox-book/viewer/05_playaudio


async function voicevox(llmMessage) {
    const msg = llmMessage;

    const responseQuery = await axios.post(`http://127.0.0.1:50021/audio_query?speaker=4&text=${msg}`)

    const query = responseQuery.data

    const responseSynthesis = await axios.post(`http://127.0.0.1:50021/synthesis?speaker=4`, query, { responseType: 'arraybuffer'})

    const base64Data = Buffer.from(responseSynthesis.data, 'binary').toString('base64')

    return base64Data;
}

async function playAudio(connection, filePath){
    const player = createAudioPlayer();
    const resource = createAudioResource(filePath);
    player.play(resource);
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => {
        console.log('audio play!!')
    });
}

client.login(TOKEN);