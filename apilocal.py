from openai import OpenAI
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

print("--- Initializing settings ---")
model_id = "Gemma3-1b-it-FLM"
client = OpenAI(base_url="http://localhost:8000/api/v1", api_key="lemonade")


app = FastAPI()


class PromptRequest(BaseModel):
    prompt: str
    max_new_tokens: int = 256
    temperature: float = 0.7
    top_p: float = 0.9


class GenerationResponse(BaseModel):
    response: str


@app.post("/generate", response_model=GenerationResponse)
async def generate(request: PromptRequest):
    completion = client.chat.completions.create(
        model="Gemma3-1b-it-FLM", messages=[{"role": "user", "content": request.prompt}]
    )
    response_text = completion.choices[0].message.content
    return GenerationResponse(response=response_text)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
