import os
import threading
import gradio as gr
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer
from peft import PeftModel

# Check for Hugging Face ZeroGPU environment
try:
    import spaces
    USING_SPACES = True
except ImportError:
    USING_SPACES = False

BASE_MODEL = "Qwen/Qwen2.5-3B-Instruct"
ADAPTER = "Va1bhavdev/dil-v1-insurance-model"

print(f"Loading tokenizer from {ADAPTER}...")
tokenizer = AutoTokenizer.from_pretrained(ADAPTER)

device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.bfloat16 if (torch.cuda.is_available() and torch.cuda.is_bf16_supported()) else torch.float16
if device == "cpu":
    dtype = torch.float32

print(f"Loading base model {BASE_MODEL} on {device} ({dtype})...")
base_model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=dtype,
    device_map="auto" if device == "cuda" else None,
    low_cpu_mem_usage=True,
)

print(f"Attaching LoRA adapter {ADAPTER}...")
model = PeftModel.from_pretrained(base_model, ADAPTER)
model.eval()
print("Model initialization complete.")

DEFAULT_SYSTEM_PROMPT = """You are DIL-V1, a Digital Insurance Language Model.

Your role is to understand the insurance scenario, identify which information
is relevant, prioritize the required evidence, select the appropriate capability,
and provide grounded reasoning.

Possible actions include:
- direct_answer
- retrieve
- tool
- solvency_tool
- currency_tool
- time_tool
- multi_step
- human_review

Do not invent policy wording, regulatory requirements, calculations or current
information. Use retrieval or tools when required."""

def generate_response(user_message, history, system_prompt, temperature, max_new_tokens):
    messages = []
    if system_prompt.strip():
        messages.append({"role": "system", "content": system_prompt.strip()})

    for user_text, bot_text in history:
        if user_text:
            messages.append({"role": "user", "content": user_text})
        if bot_text:
            messages.append({"role": "assistant", "content": bot_text})

    messages.append({"role": "user", "content": user_message})

    try:
        prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    except Exception:
        prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages]) + "\nassistant:"

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    streamer = TextIteratorStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    do_sample = float(temperature) > 0.05

    gen_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=int(max_new_tokens),
        temperature=float(temperature),
        do_sample=do_sample,
        pad_token_id=tokenizer.eos_token_id,
    )

    thread = threading.Thread(target=model.generate, kwargs=gen_kwargs)
    thread.start()

    partial_text = ""
    for new_text in streamer:
        partial_text += new_text
        yield partial_text

# If ZeroGPU is available, decorate with @spaces.GPU
if USING_SPACES:
    generate_response = spaces.GPU(duration=60)(generate_response)

EXAMPLES = [
    ["Explain the difference between Solvency II Solvency Capital Requirement (SCR) and Minimum Capital Requirement (MCR)."],
    ["Calculate the pure premium for a fleet of 80 courier vans if the historical annual claim frequency is 0.15 and average severity is £2,850."],
    ["A customer reports water damage due to a burst pipe during unheated winter premises. What policy conditions and exclusions should be checked?"],
    ["A retail policyholder displays signs of cognitive vulnerability during a claim dispute. Under FCA Consumer Duty principles, how should this be handled?"],
    ["How does a loss ratio of 78% combined with an expense ratio of 27% impact underwriting profitability?"],
]

custom_css = """
.gradio-container {
    max-width: 1050px !important;
    margin: auto !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.header-box {
    text-align: center;
    padding: 24px 12px;
    background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
    border-radius: 12px;
    margin-bottom: 20px;
    color: white;
    border: 1px solid rgba(255,255,255,0.1);
}
.header-box h1 {
    margin: 0 0 8px 0;
    font-size: 26px;
    font-weight: 700;
}
.header-box p {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
}
.badge {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(99, 102, 241, 0.2);
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-radius: 20px;
    font-size: 12px;
    color: #a5b4fc;
    margin-top: 10px;
}
"""

with gr.Blocks(css=custom_css, title="DIL-V1 Insurance Intelligence Studio") as demo:
    gr.HTML("""
    <div class="header-box">
        <h1>🛡️ DIL-V1 Insurance Intelligence Studio</h1>
        <p>Domain-Specialized Language Model for Actuarial Calculations, Claims Assessment & Regulatory Compliance</p>
        <div class="badge">Base: Qwen/Qwen2.5-3B-Instruct • Adapter: Va1bhavdev/dil-v1-insurance-model</div>
    </div>
    """)

    with gr.Row():
        with gr.Column(scale=4):
            chatbot = gr.Chatbot(height=520, show_label=False, bubble_full_width=False)
            with gr.Row():
                msg = gr.Textbox(
                    placeholder="Enter your insurance, claims, actuarial, or regulatory query...",
                    show_label=False,
                    scale=9,
                    container=False,
                )
                submit_btn = gr.Button("Send", variant="primary", scale=1)
                clear_btn = gr.Button("Clear", scale=1)

            gr.Examples(
                examples=EXAMPLES,
                inputs=msg,
                label="💡 Insurance Domain Queries",
            )

        with gr.Column(scale=1):
            with gr.Accordion("⚙️ Model Parameters", open=True):
                temperature = gr.Slider(
                    minimum=0.0,
                    maximum=1.0,
                    value=0.7,
                    step=0.05,
                    label="Temperature",
                    info="Lower = deterministic; Higher = creative",
                )
                max_tokens = gr.Slider(
                    minimum=64,
                    maximum=2048,
                    value=512,
                    step=64,
                    label="Max New Tokens",
                )
                system_prompt_input = gr.Textbox(
                    value=DEFAULT_SYSTEM_PROMPT,
                    label="System Prompt",
                    lines=8,
                )

    def user_turn(user_msg, chat_history):
        if not user_msg.strip():
            return "", chat_history
        return "", chat_history + [[user_msg, None]]

    def bot_turn(chat_history, sys_prompt, temp, max_toks):
        if not chat_history:
            return chat_history
        user_msg = chat_history[-1][0]
        history_prior = chat_history[:-1]

        chat_history[-1][1] = ""
        for chunk in generate_response(user_msg, history_prior, sys_prompt, temp, max_toks):
            chat_history[-1][1] = chunk
            yield chat_history

    msg.submit(
        user_turn, [msg, chatbot], [msg, chatbot], queue=False
    ).then(
        bot_turn, [chatbot, system_prompt_input, temperature, max_tokens], chatbot
    )

    submit_btn.click(
        user_turn, [msg, chatbot], [msg, chatbot], queue=False
    ).then(
        bot_turn, [chatbot, system_prompt_input, temperature, max_tokens], chatbot
    )

    clear_btn.click(lambda: None, None, chatbot, queue=False)

if __name__ == "__main__":
    demo.queue().launch()
