# HanaseLLM

## 概要
Discord上でのLLMとの会話(通話)  
全システムローカル動作可

### Scrapbox
https://scrapbox.io/NLP-irony/%E7%A0%94%E7%A9%B6%E5%A4%96_LLM%E3%81%A8%E8%A9%B1%E3%81%97%E3%81%9F%E3%81%84_(Discord)(Python,_JS)

### 構成図  
<picture>
<source media="(prefers-color-scheme: dark)" srcset="pics/hanasellm-dark.png">
<source media="(prefers-color-scheme: light)" srcset="pics/hanasellm-white.png">
</picture>

## 使い方

### 事前構築
openai-chatgpt互換のLLMサーバを localhost:5001 に  
[VOICEVOX](https://github.com/VOICEVOX/voicevox_engine)のAPIサーバを localhost:50021 に


### 起動

``` 
// whisperサーバの起動 :5000
python3 faster.py 

// 初回 パッケージインストール
npm install

// discord.js サーバ起動
node index.js
```

### Discordコマンド

- !join ボイスチャンネルに参加
- !clear 会話履歴の削除
- !history サーバ側に会話履歴表示

### 注意
プッシュトゥトークを設定する(誤検知対策)

## 改善したい
- [ ]  レスポンス改善(wavエンコードを経由しないリアルタイムな手法？)
- [ ] 文字起こしのリソース削減、リアルタイム化
- [ ] llmの設定、サーバーを設定ファイルまたはdiscordから変更できるようにする