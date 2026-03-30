"""
MiroFish OASIS Sidecar — Port 5000
Receives simulation requests from Buzz API (port 3000)
Uses Ollama qwen3:8b for agent LLM calls
Uses Claude Opus (via Pro Max) for persona generation and reports
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'engine': 'mirofish-oasis', 'version': '0.1.0'})

@app.route('/simulate', methods=['POST'])
def simulate():
    data = request.json
    # Phase B: wire OASIS simulation here
    return jsonify({'status': 'skeleton', 'message': 'OASIS sidecar ready for Phase B build'})

@app.route('/generate-personas', methods=['POST'])
def generate_personas():
    data = request.json
    # Phase C: wire persona generator here
    return jsonify({'status': 'skeleton', 'message': 'Persona generator ready for Phase C build'})

@app.route('/report', methods=['POST'])
def generate_report():
    data = request.json
    # Phase C: wire ReACT report agent here
    return jsonify({'status': 'skeleton', 'message': 'Report agent ready for Phase C build'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
