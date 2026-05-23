# 2-4. シナリオ演習

## 🎯 このユニットのゴール

- Flask アプリを Dockerfile でイメージ化し、Docker Hub に公開する
- マルチステージビルドで本番用の軽量イメージを作る

---

## シナリオ：Flask アプリをチームに配布する

> 開発した Flask API を Docker Hub に公開して、チームメンバーが `docker pull` 一発で動かせるようにする。  
> ビルド → タグ付け → push → チームが pull して起動 という一連の流れを体験しよう。

---

## Step 1：アプリの作成

```bash
mkdir -p ~/docker-practice/todo-api
cd ~/docker-practice/todo-api

cat > app.py << 'EOF'
from flask import Flask, request, jsonify

app = Flask(__name__)

# インメモリの簡易 ToDo リスト
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
EOF

cat > requirements.txt << 'EOF'
flask==3.0.0
EOF

cat > .dockerignore << 'EOF'
__pycache__
*.pyc
.git
.env
venv/
tests/
EOF
```

---

## Step 2：マルチステージ Dockerfile を書く

```bash
cat > Dockerfile << 'EOF'
# ─── ステージ 1: 依存関係のインストール ───────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/deps -r requirements.txt

# ─── ステージ 2: 本番用実行環境 ───────────────────────────────
FROM python:3.12-slim AS prod
WORKDIR /app

# ビルドステージの依存だけコピー
COPY --from=builder /deps /usr/local/lib/python3.12/site-packages

# アプリ本体
COPY app.py .

# セキュリティ: root で動かさない
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 5000
CMD ["python", "app.py"]
EOF
```

---

## Step 3：ビルドと動作確認

```bash
# ビルド
docker build --target prod -t todo-api:v1.0.0 .

# サイズ確認
docker images todo-api

# 起動
docker run -d --name todo-api -p 5000:5000 todo-api:v1.0.0

# API を叩いてみる
curl http://localhost:5000/todos
# [{"done":true,"id":1,"title":"Dockerを学ぶ"}, ...]

curl -X POST http://localhost:5000/todos \
  -H "Content-Type: application/json" \
  -d '{"title": "Swarm を学ぶ"}'

curl http://localhost:5000/todos
# 新しい ToDo が追加されている

# コンテナを停止・削除
docker stop todo-api && docker rm todo-api
```

---

## Step 4：Docker Hub に push する

```bash
# タグ付け（your-username を自分のアカウントに変える）
docker tag todo-api:v1.0.0 your-username/todo-api:v1.0.0
docker tag todo-api:v1.0.0 your-username/todo-api:latest

# ログイン
docker login

# push
docker push your-username/todo-api:v1.0.0
docker push your-username/todo-api:latest
```

---

## Step 5：チームメンバーとして pull して動かす

```bash
# ローカルのイメージを削除（pull を試すため）
docker rmi your-username/todo-api:v1.0.0

# Docker Hub から取得して起動（1コマンドで完結）
docker run -d --name todo-api -p 5000:5000 your-username/todo-api:v1.0.0

curl http://localhost:5000/todos
# 動いた！
```

---

## 🏆 発展課題

### 課題 1：ビルドキャッシュの効果を測る

```bash
# 1 回目（キャッシュなし）
time docker build --no-cache -t todo-api:bench .

# app.py だけ変更
echo "# dummy" >> app.py

# 2 回目（requirements.txt は変えていないのでキャッシュされるはず）
time docker build -t todo-api:bench2 .

# 実行時間を比較してみよう
```

### 課題 2：`docker history` でレイヤーを観察する

```bash
docker history todo-api:v1.0.0
# 各レイヤーのサイズと命令を確認
# どの命令がどれだけ容量を使っているかを把握する
```

### 課題 3：非 root ユーザーの効果を確認する

```bash
# コンテナ内のユーザーを確認
docker run --rm todo-api:v1.0.0 whoami
# appuser が表示される（root ではない）

# root で動かすバージョンと比べてみる
docker run --rm nginx whoami
# root が表示される
```

---

## ✅ 演習完了チェックリスト

- [ ] Dockerfile を 1 から書いてイメージをビルドできた
- [ ] マルチステージビルドでシングルステージより小さいイメージを作れた
- [ ] Docker Hub に push して `docker pull` で取得できた
- [ ] API にリクエストを送って正常なレスポンスを確認できた
- [ ] `docker history` でレイヤー構造を確認できた

---

## Phase 2 完了！

お疲れさまでした。Phase 2 では以下を習得しました：

- Dockerfile の主要命令（FROM / WORKDIR / COPY / RUN / EXPOSE / CMD / ENTRYPOINT / ENV）
- レイヤーキャッシュの仕組みと活用方法
- マルチステージビルドによるイメージ最小化
- Docker Hub とプライベートレジストリへの push/pull

---

## 次のフェーズ

[Phase 3：Docker Compose](../phase3/README.md)
