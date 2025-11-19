import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

# --- 1. 設定 ---
# アプリケーションの起動時に一度だけ実行される
print("--- Initializing settings ---")
base_model_id = "google/gemma-3-270m-it"
adapter_path = "/home/nm/gemma/gemma-3-270m-it-open2ch-lora"
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# --- 2. モデルとトークナイザの読み込み ---
# これも起動時に一度だけ実行
print("--- 1. Loading base model and tokenizer ---")
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
tokenizer = AutoTokenizer.from_pretrained(base_model_id)
tokenizer.pad_token = tokenizer.eos_token
print("--- Base model and tokenizer loaded ---")

import os

# # --- 3. LoRAアダプターの適用 ---
# print("--- 2. Applying LoRA adapter ---")
# if os.path.exists(adapter_path):
#     try:
#         model = PeftModel.from_pretrained(base_model, adapter_path)
#         print("--- LoRA adapter applied successfully ---")
#     except Exception as e:
#         print(f"--- Warning: Failed to load LoRA adapter: {e} ---")
#         print("--- Continuing with base model only ---")
#         model = base_model
# else:
#     print(f"--- Warning: Adapter path '{adapter_path}' not found ---")
#     print("--- Continuing with base model only ---")
#     model = base_model
# print("\n🎉 Model initialization complete. Starting API server. 🎉")

# --- 4. FastAPIアプリケーションの定義 ---
app = FastAPI()

# リクエストボディのデータ形式を定義
class PromptRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.9

# レスポンスボディのデータ形式を定義
class GenerationResponse(BaseModel):
    response: str

# --- 5. APIエンドポイントの作成 ---
@app.post("/generate", response_model=GenerationResponse)
async def generate(request: PromptRequest):
    """
    ユーザーからのプロンプトを受け取り、モデルの応答を生成して返すエンドポイント
    """
    # ワンショット形式の対話データを作成
    chat = [
        {"role": "user", "content": request.prompt},
    ]

    # モデルへの入力プロンプトを作成
    prompt_text = tokenizer.apply_chat_template(chat, tokenize=False, add_generation_prompt=True)

    # 入力をテンソルに変換
    inputs = tokenizer(prompt_text, return_tensors="pt", add_special_tokens=False).to(device)

    # 応答を生成
    outputs = base_model.generate(
        **inputs,
        max_new_tokens=request.max_new_tokens,
        do_sample=True,
        temperature=request.temperature,
        top_p=request.top_p,
    )

    # 生成された応答をデコード
    response_text = tokenizer.decode(outputs[0][len(inputs['input_ids'][0]):], skip_special_tokens=True)

    # 生成したテキストをJSONで返す
    return GenerationResponse(response=response_text)

# このファイルが直接実行された場合にサーバーを起動するためのコード
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
