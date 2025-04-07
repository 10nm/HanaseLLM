# HanaseLLM

HanaseLLMは、Discord上でLLMと会話できるDiscord Botです。

## 必要な環境

- Node.js
- Discord Bot Token
- Google Gemini API Key
- GCP Speech-to-Text API

## 使い方

1.  必要な環境をインストールする。GCPのセットアップも行う。
2.  Discord Bot TokenとGoogle Gemini API Keyを取得する。
3.  `.env`ファイルを作成し、以下の内容を記述する。

```
TOKEN=<Discord Bot Token>
GEMINI_API_KEY=<Google Gemini API Key>
```

4.  `npm install`を実行して、必要なパッケージをインストールする。
5.  `node index.js`を実行して、Botを起動する。

## 設定
`config.js`:
- `TOKEN`: Discord Bot Token
- `GEMINI_API_KEY`: Google Gemini API Key
- `VoiceFilePATH`: 音声ファイルの保存先
- `duration`: 録音時間
- `silence`: 無音時間
- `max_token`: LLMの最大トークン数
- `speaker`: VoiceVoxのスピーカーID
- `MODEL_NAME`: Geminiのモデル名