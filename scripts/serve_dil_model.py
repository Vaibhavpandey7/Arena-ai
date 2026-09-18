#!/usr/bin/env python3
"""
Lightweight OpenAI-Compatible Server for DIL-V1 (Digital Insurance Language Model)
Base Model: Qwen/Qwen2.5-3B-Instruct
LoRA Adapter: Va1bhavdev/dil-v1-insurance-model

Requirements:
    pip install torch transformers peft fastapi uvicorn accelerate

Run:
    python scripts/serve_dil_model.py
    # or specify port and host:
    python scripts/serve_dil_model.py --port 8000 --host 0.0.0.0
"""

import argparse
import json
import os
import time
import uuid
import threading
from typing import List, Optional, Dict, Any

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
    from peft import PeftModel
    import uvicorn
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel, Field
except ImportError as e:
    print(f"[!] Missing requirement: {e}")
    print("Please install dependencies: pip install torch transformers peft fastapi uvicorn accelerate")
    exit(1)

BASE_MODEL_ID = os.environ.get("BASE_MODEL_ID", "Qwen/Qwen2.5-3B-Instruct")
ADAPTER_ID = os.environ.get("ADAPTER_ID", "Parthdaiict/dil-v1-insurance-model")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield

app = FastAPI(title="DIL-V1 Insurance Model Server", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
tokenizer = None
model = None

class ChatMessage(BaseModel):
    role: str
    content: Optional[str] = ""

class ChatCompletionRequest(BaseModel):
    model: str = ADAPTER_ID
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1024
    stream: Optional[bool] = False

def load_model():
    global tokenizer, model
    print(f"[*] Loading tokenizer for {ADAPTER_ID}...")
    tokenizer = AutoTokenizer.from_pretrained(ADAPTER_ID)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Detected compute device: {device.upper()}")

    print(f"[*] Loading base model: {BASE_MODEL_ID}...")
    torch_dtype = torch.bfloat16 if (torch.cuda.is_available() and torch.cuda.is_bf16_supported()) else torch.float16
    if device == "cpu":
        torch_dtype = torch.float32

    model_kwargs = {
        "low_cpu_mem_usage": True,
        "torch_dtype": torch_dtype,
    }

    if device == "cuda":
        try:
            total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            print(f"[*] Total GPU VRAM: {total_vram_gb:.1f} GB")
            if total_vram_gb <= 6.0:
                print("[*] VRAM <= 6GB detected: using 4-bit NF4 quantization to comfortably fit in GPU memory...")
                from transformers import BitsAndBytesConfig
                model_kwargs["quantization_config"] = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch_dtype,
                    bnb_4bit_quant_type="nf4",
                )
        except Exception as e:
            print(f"[!] Quantization check notice: {e}")
        model_kwargs["device_map"] = "auto"

    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL_ID,
        **model_kwargs,
    )

    print(f"[*] Attaching fine-tuned PEFT adapter: {ADAPTER_ID}...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_ID)
    model.eval()
    print("[✓] DIL-V1 Insurance Model loaded and ready!")

@app.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [
            {
                "id": ADAPTER_ID,
                "object": "model",
                "created": int(time.time()),
                "owned_by": "Va1bhavdev",
            },
            {
                "id": "dil-v1",
                "object": "model",
                "created": int(time.time()),
                "owned_by": "Va1bhavdev",
            }
        ]
    }

@app.post("/v1/chat/completions")
async def chat_completions(req: ChatCompletionRequest):
    if not model or not tokenizer:
        raise HTTPException(status_code=503, detail="Model is still initializing")

    conv_messages = [{"role": m.role, "content": m.content or ""} for m in req.messages]

    try:
        prompt = tokenizer.apply_chat_template(conv_messages, tokenize=False, add_generation_prompt=True)
    except Exception:
        # Fallback chat formatting
        prompt = "\n".join([f"{m.role}: {m.content}" for m in req.messages]) + "\nassistant:"

    device = model.device
    inputs = tokenizer(prompt, return_tensors="pt").to(device)

    max_tokens = req.max_tokens or 1024
    temp = req.temperature if req.temperature and req.temperature > 0 else 0.7
    do_sample = temp > 0.05

    request_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"

    if req.stream:
        streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
        gen_kwargs = dict(
            **inputs,
            streamer=streamer,
            max_new_tokens=max_tokens,
            temperature=temp,
            do_sample=do_sample,
            pad_token_id=tokenizer.eos_token_id,
        )

        thread = threading.Thread(target=model.generate, kwargs=gen_kwargs)
        thread.start()

        def event_generator():
            created_time = int(time.time())
            for text_chunk in streamer:
                chunk_data = {
                    "id": request_id,
                    "object": "chat.completion.chunk",
                    "created": created_time,
                    "model": req.model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {"content": text_chunk},
                            "finish_reason": None,
                        }
                    ],
                }
                yield f"data: {json.dumps(chunk_data)}\n\n"

            # End chunk
            end_chunk = {
                "id": request_id,
                "object": "chat.completion.chunk",
                "created": created_time,
                "model": req.model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield f"data: {json.dumps(end_chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    else:
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=temp,
                do_sample=do_sample,
                pad_token_id=tokenizer.eos_token_id,
            )

        gen_tokens = outputs[0][inputs.input_ids.shape[1]:]
        completion_text = tokenizer.decode(gen_tokens, skip_special_tokens=True)

        return {
            "id": request_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": req.model,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": completion_text},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": int(inputs.input_ids.shape[1]),
                "completion_tokens": int(len(gen_tokens)),
                "total_tokens": int(inputs.input_ids.shape[1] + len(gen_tokens)),
            },
        }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve DIL-V1 Hugging Face Insurance Model")
    parser.add_argument("--host", default="127.0.0.1", help="Host IP (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    args = parser.parse_args()

    print(f"Starting DIL-V1 OpenAI-compatible API on http://{args.host}:{args.port}/v1 ...")
    uvicorn.run(app, host=args.host, port=args.port)
