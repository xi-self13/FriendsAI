from flask import Flask, request, Response
import ollama

app = Flask(__name__)

@app.route('/api/models', methods=['GET'])
def get_models():
    return ollama.list()

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message')
    model = data.get('model', 'llama2') # Default to llama2 if no model is provided

    if not message:
        return Response("Missing 'message' in request body", status=400)

    def generate():
        stream = ollama.chat(
            model=model,
            messages=[{'role': 'user', 'content': message}],
            stream=True,
        )
        for chunk in stream:
            yield f"data: {chunk['message']['content']}\n\n"

    return Response(generate(), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True, port=5001)
