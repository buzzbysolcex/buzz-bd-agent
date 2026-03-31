"""
MiroFish Dual-Brain LLM Router
90% Opus 4.6 Pro Max (genius, $0) / 10% Ollama qwen3:8b (fast bulk)

Pro Max = unlimited. We're paying $200/month for genius. USE IT.
Ollama only for degen early-round FOMO. Everything else → Opus.
"""

import subprocess
import json
import requests


class LLMRouter:
    """Routes 90% to Opus, 10% to Ollama. Default: Opus."""

    # Tasks that ALWAYS use Opus (no exceptions)
    OPUS_TASKS = {
        'persona_generation',
        'institutional_reasoning',
        'whale_decision',
        'market_analysis',
        'community_analysis',
        'adversarial_debate',
        'cross_round_synthesis',
        'report_generation',
        'final_consensus',
        'belief_update',
        'sentiment_analysis',
        'agent_action',  # Default action type → Opus
    }

    # Only degen in rounds 1-4 uses Ollama. That's it.
    OLLAMA_CLUSTER = 'degen'
    OLLAMA_MAX_ROUND = 4  # Rounds 1-4 only

    def __init__(self, ollama_url="http://localhost:11434", ollama_model="qwen3:8b"):
        self.ollama_url = ollama_url
        self.ollama_model = ollama_model

    def should_use_opus(self, task='agent_action', cluster=None, round_num=0):
        """90% Opus routing:
        Ollama ONLY when: cluster == degen AND round < 5
        EVERYTHING else → Opus (including default)
        """
        if cluster == self.OLLAMA_CLUSTER and round_num < self.OLLAMA_MAX_ROUND:
            # Only case where Ollama is used
            if task not in {'persona_generation', 'adversarial_debate',
                           'report_generation', 'final_consensus'}:
                return False
        return True  # Default: ALWAYS Opus

    def call(self, prompt, task='agent_action', cluster=None, round_num=0, system_prompt=None):
        """Route to Opus (90%) or Ollama (10%)"""
        if self.should_use_opus(task, cluster, round_num):
            return self.call_opus(prompt, system_prompt)
        else:
            return self.call_ollama(prompt, system_prompt)

    def call_opus(self, prompt, system_prompt=None):
        """Call Claude Opus 4.6 via claude -p (Pro Max unlimited, $0)"""
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\nUser: {prompt}"

        try:
            result = subprocess.run(
                ['claude', '-p', full_prompt, '--output-format', 'text'],
                capture_output=True,
                text=True,
                timeout=60,
                cwd='/home/claude-code/buzz-workspace'
            )
            if result.returncode == 0:
                return {
                    'response': result.stdout.strip(),
                    'model': 'opus-4.6',
                    'tier': 'genius'
                }
            else:
                print(f"Opus failed (code {result.returncode}), falling back to Ollama")
                return self.call_ollama(prompt, system_prompt)
        except subprocess.TimeoutExpired:
            print("Opus timed out (60s), falling back to Ollama")
            return self.call_ollama(prompt, system_prompt)

    def call_ollama(self, prompt, system_prompt=None):
        """Call Ollama qwen3:8b (local, fast) — only for degen early rounds"""
        payload = {
            'model': self.ollama_model,
            'prompt': prompt,
            'stream': False
        }
        if system_prompt:
            payload['system'] = system_prompt

        try:
            resp = requests.post(
                f"{self.ollama_url}/api/generate",
                json=payload,
                timeout=30
            )
            data = resp.json()
            return {
                'response': data.get('response', '').strip(),
                'model': self.ollama_model,
                'tier': 'bulk'
            }
        except Exception as e:
            print(f"Ollama failed: {e}, escalating to Opus")
            return self.call_opus(prompt, system_prompt)
