# HanaseLLM

## 概要

HanaseLLMは、DiscordボイスチャンネルでLLMと会話できるDiscordボットです。

## ディレクトリ構成

```
talkwithllama/
├── index.js          # ボットの起動を行う
├── .env              # 設定を書く
├── src/              
│   ├── discord_bot.js    # Discordクライアントの初期化、ボイスチャンネルへの接続
│   ├── transcription.js  # 音声認識(GEMINI APIを使用)
│   ├── llm.js            # 応答生成(GEMINI API)
│   ├── voice_synthesis.js # 音声合成(VoiceVox API)
│   └── config.js         # 設定の取り扱い
└── README.md
```

## 必要な環境

-   Node.js
-   Discord Botの設定  
[Discord dev](https://discord.com/developers/applications)
-   Gemini API  
[Google AI Studio](https://aistudio.google.com/apikey)
-   VoiceVox engine  
[VoiceVox_engine](https://github.com/VOICEVOX/voicevox_engine)

## 使い方

1.  リポジトリをクローンします。
2.  必要なパッケージをインストールします。

```
npm install
```

3.  .envファイルを作成し、Discordボットのトークンを設定します。

```
TOKEN=YOUR_DISCORD_BOT_TOKEN
API=true or false (外部APIを使用するかどうか)
API_KEY=YOUR_COHERE_API_KEY (外部APIを使用する場合)
```

4.  ボットを起動します。

```
node index.js
```

## Discordコマンド

-   **!join** ボイスチャンネルに参加
-   **!leave** ボイスチャンネルから退出

## 設定

以下の変数は.envファイルで設定できます。

-   **TOKEN** Discordボットのトークン
-   **API\_KEY** 
-   **duration** 音声認識を開始する最小録音時間 (秒)
-   **speaker** VoiceVoxのスピーカーID