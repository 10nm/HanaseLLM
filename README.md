# HanaseLLM

## 概要
Discord上でのLLMとの会話(通話)  
全システムローカル動作可


### 構成図  
<picture>
  <source srcset="./pics/hanasellm-dark.png" media="(prefers-color-scheme: dark)">
  <source srcset="./pics/hanasellm-light.png" media="(prefers-color-scheme: light)">
  <img src="./pics/hanasellm-white.png" alt="構成図">
</picture>

## 使い方

### 事前構築
openai-chatgpt互換のLLMサーバ(起動プログラム run.js は text-generation-webui)   
[VOICEVOX Engine](https://github.com/VOICEVOX/voicevox_engine) APIサーバ


### 起動

**一括起動**  

```
//初回のみ
npm install

//起動
node run.js
```

**個別起動**  
**Text-generation-webui**  
[text-generation-webui](https://github.com/oobabooga/text-generation-webui) を port 5001 で起動する。  
**WSLの場合** `./wsl.sh --api --api-port 5001`  
モデルは任意のものをセットしておく。(環境に合わせて、レスポンスの良いもの。)

**VoiceVox Engine**  
[VoiceVox Engine](https://github.com/VOICEVOX/voicevox_engine)を port 50021 で起動する。  
**Dockerの場合**  公式ドキュメント通りにpullしてから  
`sudo docker run -d --name voicevox_engine_container -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest` 

#### Whisperサーバ
port 5000  
`python3 faster.py`


#### Discordサーバ本体
``` 
// 初回 パッケージインストール
npm install

// discord.js サーバ起動
node index.js
```

### Discordコマンド

- **!join** ボイスチャンネルに参加  
- **!leave** ボイスチャンネルから退出  
- **!stop** 音声認識を停止
- **!refresh** 音声認識を再開. Flag(認識・生成のパンクを防ぐ機構)をリセットする。 突然認識されなくなった場合に使用
- **!clear** 会話履歴の削除  
- **!history** サーバ側に会話履歴表示  
- **!log** Discord上に会話ログを出力するか(on/off トグル)  
- **!duration {time(float)秒}** 指定した秒数以上の音声のみを認識させる  
- **!max_token {token(int)}** 指定したトークン内で出力させる(まれに見切れる)   
- **!silence {time(float)ミリ秒}** 指定したミリ秒の沈黙があった場合に音声認識を終了する

### 注意
プッシュトゥトークを設定する(誤検知対策)

## 改善したい
- [ ] ~~発言者の名前がすべて!join実行者の名前になっている~~
- [ ] ~~複数人の場合は人別にhistoryを分ける~~
- [ ] ~~一括起動のスクリプト？docker化？~~
- [ ] text-gen-webuiもdocker化
- [ ] llmがhistoryすべてに対して応答しようとする現象
- [ ] レスポンス改善(wavエンコードを経由しないリアルタイムな手法？)
- [ ] llmの設定、サーバーを設定ファイルまたはdiscordから変更できるようにする