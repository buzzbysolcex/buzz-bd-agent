"""
MiroFish Real Sim — Dual-Brain OASIS Sidecar (Port 5000)
90% Opus 4.6 Pro Max / 10% Ollama qwen3:8b
Receives simulation requests from Buzz API (port 3000)
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from llm_router import LLMRouter
import json

app = Flask(__name__)
CORS(app)
router = LLMRouter()


def assign_cluster(index, total):
    """Distribute agents across 5 clusters evenly"""
    clusters = ['degen', 'whale', 'institutional', 'community', 'market_dynamics']
    return clusters[index % len(clusters)]


def build_agent_prompt(agent, token_data, social_feed, round_num):
    """Build context-rich prompt for agent action"""
    recent_posts = social_feed[-10:] if social_feed else []
    return (
        f"You are {agent['persona'][:200]}.\n"
        f"Round {round_num}. Your current belief: {agent['belief']:.2f} (0=bearish, 1=bullish).\n"
        f"Token data: {json.dumps(token_data)[:300]}\n"
        f"Recent social feed: {json.dumps(recent_posts)[:500]}\n\n"
        f"Based on your persona and the data, respond with ONLY valid JSON:\n"
        f'{{"action": "buy"|"sell"|"hold", "belief": 0.0-1.0, '
        f'"reasoning": "one sentence", "post": "optional social post"}}'
    )


def parse_agent_action(response_text):
    """Parse agent response, handle malformed JSON gracefully"""
    try:
        clean = response_text.strip()
        if '```json' in clean:
            clean = clean.split('```json')[1].split('```')[0].strip()
        elif '```' in clean:
            clean = clean.split('```')[1].split('```')[0].strip()
        return json.loads(clean)
    except (json.JSONDecodeError, IndexError):
        return {'action': 'hold', 'belief': 0.5, 'reasoning': 'parse error', 'post': ''}


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'engine': 'mirofish-real-sim',
        'version': '1.0.0',
        'brain': '90% Opus 4.6 / 10% Ollama qwen3:8b'
    })


@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    token_data = data.get('token_data', {})
    agent_count = data.get('agents', 50)
    rounds = data.get('rounds', 20)

    # Phase 1: Generate personas (ALL Opus — genius personas)
    personas = []
    for i in range(agent_count):
        cluster = assign_cluster(i, agent_count)
        persona = router.call(
            prompt=(
                f"Generate a crypto trader persona for cluster '{cluster}'. "
                f"Include: name, age, risk tolerance (0-1), conviction style, "
                f"decision framework, behavioral quirks, and what makes them "
                f"unique as a market participant. Be specific and vivid. "
                f"Token context: {json.dumps(token_data)[:200]}"
            ),
            task='persona_generation',
            cluster=cluster
        )
        personas.append({
            'id': f"{cluster}_{i}",
            'cluster': cluster,
            'persona': persona['response'],
            'model_used': persona['model'],
            'belief': 0.5
        })

    # Phase 2: Run simulation rounds
    social_feed = []
    belief_history = []
    model_stats = {'opus': 0, 'ollama': 0}

    for round_num in range(1, rounds + 1):
        for agent in personas:
            prompt = build_agent_prompt(agent, token_data, social_feed, round_num)

            result = router.call(
                prompt=prompt,
                task='agent_action',
                cluster=agent['cluster'],
                round_num=round_num
            )

            # Track model usage
            if result['model'] == 'opus-4.6':
                model_stats['opus'] += 1
            else:
                model_stats['ollama'] += 1

            action = parse_agent_action(result['response'])

            # Update belief
            new_belief = action.get('belief', agent['belief'])
            agent['belief'] = max(0.0, min(1.0, new_belief))

            # Add to social feed
            if action.get('post'):
                social_feed.append({
                    'agent': agent['id'],
                    'cluster': agent['cluster'],
                    'post': action['post'],
                    'action': action.get('action', 'hold'),
                    'round': round_num,
                    'model': result['model']
                })

        # Record round beliefs
        cluster_beliefs = {}
        for c in ['degen', 'whale', 'institutional', 'community', 'market_dynamics']:
            agents_in_cluster = [a for a in personas if a['cluster'] == c]
            if agents_in_cluster:
                cluster_beliefs[c] = round(
                    sum(a['belief'] for a in agents_in_cluster) / len(agents_in_cluster), 3
                )

        belief_history.append({
            'round': round_num,
            'avg_belief': round(sum(a['belief'] for a in personas) / len(personas), 3),
            'clusters': cluster_beliefs
        })

    # Phase 3: Adversarial debate (Opus)
    bulls = sorted(personas, key=lambda a: a['belief'], reverse=True)[:3]
    bears = sorted(personas, key=lambda a: a['belief'])[:3]

    debate = router.call(
        prompt=(
            f"BULL CASE (top 3 agents, beliefs {[round(b['belief'],2) for b in bulls]}):\n"
            f"{[b['persona'][:100] for b in bulls]}\n\n"
            f"BEAR CASE (bottom 3 agents, beliefs {[round(b['belief'],2) for b in bears]}):\n"
            f"{[b['persona'][:100] for b in bears]}\n\n"
            f"Conduct a structured adversarial debate. Who has the stronger case and why? "
            f"Consider: fundamentals, risk factors, market dynamics, and timing."
        ),
        task='adversarial_debate'
    )

    # Phase 4: Final consensus (Opus)
    final_avg = sum(a['belief'] for a in personas) / len(personas)
    consensus = router.call(
        prompt=(
            f"MiroFish simulation complete. {agent_count} agents, {rounds} rounds.\n"
            f"Final average belief: {final_avg:.3f}\n"
            f"Belief trajectory: {json.dumps(belief_history[-5:])}\n"
            f"Debate summary: {debate['response'][:500]}\n\n"
            f"Provide: 1) Final verdict (BULLISH/BEARISH/NEUTRAL), "
            f"2) Confidence level (0-100%), 3) Key risk, 4) Key catalyst, "
            f"5) One-paragraph summary suitable for an AIBTC news signal."
        ),
        task='final_consensus'
    )

    total_calls = model_stats['opus'] + model_stats['ollama']
    opus_pct = round(model_stats['opus'] / total_calls * 100, 1) if total_calls > 0 else 0

    return jsonify({
        'engine': 'mirofish-real-sim',
        'token': token_data.get('name', 'unknown'),
        'agents': agent_count,
        'rounds': rounds,
        'belief_history': belief_history,
        'final_belief': round(final_avg, 3),
        'final_consensus': consensus['response'],
        'debate_summary': debate['response'][:500],
        'social_feed_sample': social_feed[-10:],
        'model_usage': {
            'opus_calls': model_stats['opus'],
            'ollama_calls': model_stats['ollama'],
            'opus_percentage': opus_pct,
            'target': '90% Opus / 10% Ollama'
        }
    })


@app.route('/generate-personas', methods=['POST'])
def generate_personas():
    data = request.json
    count = data.get('count', 10)
    token_data = data.get('token_data', {})
    personas = []
    for i in range(count):
        cluster = assign_cluster(i, count)
        result = router.call(
            prompt=f"Generate vivid crypto trader persona for '{cluster}' cluster. Token: {json.dumps(token_data)[:200]}",
            task='persona_generation'
        )
        personas.append({'id': f"{cluster}_{i}", 'cluster': cluster, 'persona': result['response']})
    return jsonify({'personas': personas, 'count': len(personas)})


@app.route('/report', methods=['POST'])
def generate_report():
    data = request.json
    result = router.call(
        prompt=f"Generate MiroFish simulation report from: {json.dumps(data)[:2000]}",
        task='report_generation'
    )
    return jsonify({'report': result['response'], 'model': result['model']})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
