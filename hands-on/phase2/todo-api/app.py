from flask import Flask, request, jsonify

app = Flask(__name__)

todos = [
    {"id": 1, "title": "Docker を学ぶ", "done": True},
    {"id": 2, "title": "Compose を学ぶ", "done": False},
]

@app.route("/todos", methods=["GET"])
def get_todos():
    return jsonify(todos)

@app.route("/todos", methods=["POST"])
def add_todo():
    data = request.get_json()
    new_todo = {
        "id": len(todos) + 1,
        "title": data.get("title", ""),
        "done": False,
    }
    todos.append(new_todo)
    return jsonify(new_todo), 201

@app.route("/todos/<int:todo_id>", methods=["PATCH"])
def update_todo(todo_id):
    todo = next((t for t in todos if t["id"] == todo_id), None)
    if not todo:
        return jsonify({"error": "not found"}), 404
    todo["done"] = request.get_json().get("done", todo["done"])
    return jsonify(todo)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
