# 2-1. Dockerfile の書き方

## 🎯 このユニットのゴール

- Dockerfile の主要命令を書ける
- レイヤーキャッシュの仕組みを理解し、ビルドを速くできる
- `.dockerignore` の役割を説明できる

---

## シナリオ

> チームメンバーに「私のマシンで動く Flask アプリ」を渡したい。  
> `pip install` の手順書を渡すのではなく、**環境ごとイメージにして渡す**方法を身につけよう。

---

## 1. Dockerfile とは

`docker run nginx` のときの `nginx` イメージは誰かが作ったもの。  
自分のアプリのイメージを作るための設計書が **Dockerfile** だ。

```
Dockerfile（設計書）
    ↓ docker build
イメージ（成果物）
    ↓ docker run
コンテナ（実行環境）
```

> **LPIC との接続：** シェルスクリプトに近い感覚で書ける。  
> 実際に `RUN` 命令の中身はシェルコマンドそのものだ。
>
> ```bash
> # シェルスクリプトで環境構築するなら…
> apt update
> apt install -y python3 pip
> pip install flask
>
> # Dockerfile ではこうなる
> RUN apt update && apt install -y python3 pip
> RUN pip install flask
> ```
>
> 「サーバーのセットアップ手順をそのまま Dockerfile に書く」という感覚で始めると入りやすい。

---

## 2. サンプルアプリの準備

```bash
mkdir -p ~/docker-practice/flask-app
cd ~/docker-practice/flask-app

# アプリ本体
cat > app.py << 'EOF'
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    return "<h1>Hello from Docker! 🐳</h1>"

@app.route("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
EOF

# 依存ライブラリ
cat > requirements.txt << 'EOF'
flask==3.0.0
EOF
```

---

## 3. Dockerfile を書く

```bash
cat > Dockerfile << 'EOF'
# ベースイメージを指定
FROM python:3.12-slim

# 作業ディレクトリを設定
WORKDIR /app

# 依存ファイルだけ先にコピー（キャッシュ活用のため）
COPY requirements.txt .

# ライブラリをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体をコピー
COPY . .

# 外部に公開するポートを宣言（ドキュメント的な意味合い）
EXPOSE 5000

# コンテナ起動時に実行するコマンド
CMD ["python", "app.py"]
EOF
```

---

## 4. 主要命令の解説

### 📖 `FROM` — ベースイメージの指定

```dockerfile
FROM python:3.12-slim
```

> すべての Dockerfile は `FROM` から始まる。ゼロから作ることもできるが（`FROM scratch`）、通常は公式イメージをベースにする。

| タグ | 特徴 |
|---|---|
| `python:3.12` | フル版（大きいが開発ツール充実） |
| `python:3.12-slim` | 不要なパッケージを省いた軽量版 |
| `python:3.12-alpine` | Alpine Linux ベースの最小版（注意点あり） |

### 📖 `WORKDIR` — 作業ディレクトリ

```dockerfile
WORKDIR /app
```

> 以降の `COPY` / `RUN` / `CMD` の起点となるディレクトリ。`mkdir && cd` に相当する。  
> 指定したディレクトリが存在しない場合は自動で作成される。

### 📖 `COPY` — ファイルのコピー

```dockerfile
COPY requirements.txt .   # ホストのファイル → コンテナの WORKDIR
COPY . .                  # カレントディレクトリ全体をコピー
```

> `COPY <ホスト側> <コンテナ側>` の形式。  
> `ADD` と似ているが、URL 取得や tar 展開が不要なら `COPY` を使うのが推奨。

### 📖 `RUN` — ビルド時にコマンドを実行

```dockerfile
RUN pip install --no-cache-dir -r requirements.txt
```

> イメージのビルド時に実行されるコマンド。実行結果が新しいレイヤーとして保存される。  
> `&&` でつないで 1 つの `RUN` にまとめるとレイヤー数を減らせる。

```dockerfile
# NG: レイヤーが増える
RUN apt update
RUN apt install -y curl
RUN apt clean

# OK: 1 レイヤーにまとめる
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
```

### 📖 `EXPOSE` — ポートの宣言

```dockerfile
EXPOSE 5000
```

> コンテナが使用するポートをドキュメントとして宣言する命令。  
> **実際にポートを開放するわけではない**（`docker run -p` が必要）。

### 📖 `CMD` — コンテナ起動時のデフォルトコマンド

```dockerfile
CMD ["python", "app.py"]
```

> コンテナを起動したときに実行されるコマンド。`docker run` 時に上書き可能。  
> **JSON 配列形式**（exec 形式）を推奨。シェル形式（`CMD python app.py`）はシグナルが正しく伝わらない場合がある。

### `CMD` vs `ENTRYPOINT`

| | CMD | ENTRYPOINT |
|---|---|---|
| 目的 | デフォルトコマンド | 必ず実行するコマンド |
| `docker run` での上書き | 上書きされる | 上書きされない（引数は渡せる） |
| よくある使い方 | アプリの起動コマンド | 「このコンテナは必ずこれを実行する」 |

```dockerfile
# ENTRYPOINT の例（常に python で実行、スクリプト名だけ切り替えたいとき）
ENTRYPOINT ["python"]
CMD ["app.py"]
# → docker run myimage          → python app.py
# → docker run myimage test.py  → python test.py
```

### 📖 `ENV` — 環境変数の設定

```dockerfile
ENV FLASK_ENV=production
ENV PORT=5000
```

> ビルド時・実行時の両方で有効な環境変数を設定する。  
> `docker run -e` で実行時に上書き可能。

---

## 5. ビルドして動かす

```bash
# イメージをビルド（-t でイメージ名:タグを指定）
docker build -t flask-app:v1 .

# ビルドされたイメージを確認
docker images | grep flask-app

# コンテナを起動
docker run -d --name myapp -p 5000:5000 flask-app:v1

# 動作確認
curl http://localhost:5000
curl http://localhost:5000/health
```

---

## 6. レイヤーキャッシュの仕組みと活用

### 📖 用語：レイヤーキャッシュ（Layer Cache）

> `docker build` は各命令を上から順に実行し、変更がない行はキャッシュを再利用する。  
> **一度変更があると、それ以降の行はすべてキャッシュが無効化される。**

```
FROM python:3.12-slim     ← キャッシュ済み ✅
WORKDIR /app              ← キャッシュ済み ✅
COPY requirements.txt .   ← requirements.txt が変わっていなければキャッシュ ✅
RUN pip install ...       ← 上が変わっていなければキャッシュ ✅（重要！）
COPY . .                  ← app.py を変更した → キャッシュ無効 ❌
CMD ["python", "app.py"]  ← キャッシュ無効 ❌
```

### キャッシュを活かす書き順の鉄則

```dockerfile
# ❌ 悪い例：app.py を変えるたびに pip install が走る
COPY . .
RUN pip install -r requirements.txt

# ✅ 良い例：requirements.txt が変わらない限り pip install はキャッシュされる
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
```

> **「変わりにくいもの → 変わりやすいもの」の順に書く** がキャッシュ活用の鉄則。

### 実際にキャッシュを体験する

```bash
# 1回目のビルド（全部実行される）
docker build -t flask-app:v1 .

# app.py だけ変更
echo "# コメント追加" >> app.py

# 2回目のビルド
docker build -t flask-app:v2 .
# "COPY requirements.txt" まではキャッシュ（---> Using cache と表示される）
# "COPY . ." 以降だけ再実行される → 高速！
```

---

## 7. `.dockerignore` でビルドを軽くする

### 📖 用語：ビルドコンテキスト（Build Context）

> `docker build .` の `.` がビルドコンテキスト。  
> このディレクトリ全体が Docker Daemon に送信される。  
> **不要なファイルが多いと転送が遅くなり、キャッシュも無効化されやすくなる。**

```bash
# ビルドコンテキストのサイズを確認するには
docker build --no-cache . 2>&1 | head -5
# Sending build context to Docker daemon  1.234MB  ← ここ
```

`.gitignore` と同じ書き方で除外できる：

```bash
cat > .dockerignore << 'EOF'
__pycache__
*.pyc
*.pyo
.git
.env
.venv
venv/
*.log
tests/
README.md
EOF
```

---

## ✅ 振り返りチェックリスト

- [ ] `FROM / WORKDIR / COPY / RUN / EXPOSE / CMD` を順番に説明できる
- [ ] `CMD` と `ENTRYPOINT` の違いを説明できる
- [ ] キャッシュが無効化されるタイミングを説明できる
- [ ] `COPY requirements.txt` を先に書く理由を説明できる
- [ ] `.dockerignore` が何を解決するか説明できる

---

## 次のユニット

[2-2. マルチステージビルド](./2-2_multistage.md)
