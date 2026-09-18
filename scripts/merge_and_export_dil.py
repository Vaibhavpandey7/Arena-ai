#!/usr/bin/env python3
"""
Merge DIL-V1 LoRA adapter with Qwen2.5-3B-Instruct into a standalone model.

Usage:
    pip install torch transformers peft
    python scripts/merge_and_export_dil.py --output-dir ./models/dil-v1-merged
"""

import argparse
import os

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import PeftModel
except ImportError:
    print("[!] Missing requirements. Run: pip install torch transformers peft")
    exit(1)

BASE_MODEL = "Qwen/Qwen2.5-3B-Instruct"
ADAPTER = "Va1bhavdev/dil-v1-insurance-model"

def merge(output_dir: str):
    print(f"[*] Loading tokenizer for {ADAPTER}...")
    tokenizer = AutoTokenizer.from_pretrained(ADAPTER)

    print(f"[*] Loading base model {BASE_MODEL}...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto" if torch.cuda.is_available() else "cpu",
        low_cpu_mem_usage=True,
    )

    print(f"[*] Attaching PEFT adapter {ADAPTER}...")
    model = PeftModel.from_pretrained(base_model, ADAPTER)

    print("[*] Merging LoRA weights with base model...")
    merged_model = model.merge_and_unload()

    print(f"[*] Saving standalone merged model to {output_dir}...")
    os.makedirs(output_dir, exist_ok=True)
    merged_model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print(f"[✓] Successfully merged model saved to: {output_dir}")
    print("[i] You can now convert this to GGUF or push to Hugging Face as a full model.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Merge DIL-V1 LoRA into a standalone model")
    parser.add_argument("--output-dir", default="./models/dil-v1-merged", help="Output directory")
    args = parser.parse_args()
    merge(args.output_dir)
