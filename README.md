# HanaseLLM v2.1

HanaseLLM は、Discord上でLLMと音声で会話ができるBotです。

## 技術

- TypeScript 5.7+ (ES2022)
- Node.js (ES Module)
- discord.js v14 + @discordjs/voice
- Google Cloud Speech-to-Text v7
- Google Gemini (@google/genai v0.7) / Local LLM API
- VoiceVox
- prism-media, wav-converter

## 必要なもの

### 必須

1. **Node.js** (v18以上)
2. **Discord Bot Token**
   - [Discord Developer Portal](https://discord.com/developers/applications)でBotを作る
   - 必要なIntent: `Guilds`, `GuildMessages`, `GuildVoiceStates`, `MessageContent`
3. **Google Cloud Speech-to-Text**
   - [GCP Console](https://console.cloud.google.com/)でプロジェクト作成
   - Speech-to-Text APIを有効化
   - サービスアカウントキーを作ってダウンロード
4. **VoiceVox**
   - [VoiceVox公式サイト](https://voicevox.hiroshiba.jp/)からダウンロード
   - ローカルで起動する（127.0.0.1:50021）

### LLM

#### 1. Google Gemini API

- [Google AI Studio](https://aistudio.google.com/api-keys) からAPI Keyを取得

#### 2. Local LLM

OpenAI API互換LLMサーバーが必要です。

## セットアップ

リポジトリをクローンする

```bash
git clone <repository-url>
cd HanaseLLM
```

依存関係をインストールする

```bash
npm install
```


`.env.example`をコピーして`.env`を作る：

```bash
cp .env.example .env
```

`.env`を編集：

#### Gemini API を使う場合

```env
DISCORD_TOKEN=your_discord_bot_token_here
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
LLM_PROVIDER=gemini
```

#### Local LLM を使う場合

```env
DISCORD_TOKEN=your_discord_bot_token_here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
LLM_PROVIDER=local
LOCAL_LLM_AUTO_START=true
LOCAL_LLM_URL=http://localhost:8000
LOCAL_LLM_SCRIPT_PATH=./llmapi.py
```

ビルドする

```bash
npm run build
```

VoiceVox Engine を起動する（Port: 50021で待機）

Botを起動する

```bash
npm start
```

## 使い方

### コマンド

| コマンド | 説明 |
|---------|------|
| `!join` | Botがボイスチャンネルに参加 |
| `!leave` | Botがボイスチャンネルから退出 |
| `!speakers` | VoiceVoxスピーカー一覧を表示 |
| `!setSpeaker <ID>` | スピーカーをID番号で切り替え |
| `!nc` | No-Context Modeの切り替え（履歴なしで応答） |
|`!history`|履歴を表示|
|`!clear`|履歴を消去|
|`!system`|システムプロンプトを編集|
| `.<text>` | テキストで会話 |

### No-Context Mode

`!nc`コマンドで切り替え：
- **ON**: 会話履歴使わない、各入力に独立して応答
- **OFF**: 会話履歴を保持、文脈を考慮して応答

## フォルダ構成

```
HanaseLLM/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── config.ts             # 環境変数管理
│   ├── types.ts              # 型定義
│   ├── services/
│   │   ├── discord.ts        # Discord音声処理
│   │   ├── stt.ts            # Speech-to-Text
│   │   ├── llm.ts            # Gemini
│   │   ├── tts.ts            # VoiceVox
│   │   └── history.ts        # 会話履歴管理
│   ├── utils/
│   │   └── audio.ts          # 音声処理
│   └── temp/                 # 一時ファイル・履歴保存
├── dist/                     # ビルド出力
├── tsconfig.json
├── package.json
├── .env                      # gitignore
└── .env.example
```

## 設定

`.env`

```env
# 必須
DISCORD_TOKEN=
GOOGLE_APPLICATION_CREDENTIALS=

# LLM設定
LLM_PROVIDER=gemini         # gemini or local

# Gemini
GEMINI_API_KEY=
MODEL_NAME=gemini-2.0-flash

# Local LLM
LOCAL_LLM_AUTO_START=true
LOCAL_LLM_URL=http://localhost:8000
LOCAL_LLM_SCRIPT_PATH=./llmapi.py

# VoiceVox
VOICEVOX_URL=http://127.0.0.1:50021
SAMPLE_RATE=48000
SILENCE_DURATION=1000
MIN_RECORDING_DURATION=1.5
MAX_TOKENS=150
SPEAKER=1
```
