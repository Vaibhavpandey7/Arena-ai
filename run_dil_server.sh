#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🛡️  Starting DIL-V1 Local Insurance Model Server"
echo "    Base: Qwen/Qwen2.5-3B-Instruct (4-bit GPU accelerated)"
echo "    LoRA: Va1bhavdev/dil-v1-insurance-model"
echo "    API:  http://127.0.0.1:8000/v1"
echo "=========================================================="

source .venv/bin/activate
python scripts/serve_dil_model.py "$@"
