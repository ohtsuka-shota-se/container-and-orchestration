# 2-1. Dockerfile の書き方

## 🎯 このユニットのゴール

- Dockerfile の主要命令を書ける
- レイヤーキャッシュの仕組みを理解し、ビルドを速くできる
- `.dockerignore` の役割を説明できる
- `ARG / HEALTHCHECK / USER / LABEL` を使ったセキュアな Dockerfile を書ける

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
gunicorn==21.2.0
EOF
```

---

## 3. Dockerfile を書く

```bash
cat > Dockerfile << 'EOF'
# ベースイメージを指定
FROM python:3.12-slim

# イメージのメタデータ
LABEL maintainer="your-team@example.com"
LABEL version="1.0"
LABEL description="Flask ToDo API"

# 作業ディレクトリを設定
WORKDIR /app

# 依存ファイルだけ先にコピー（キャッシュ活用のため）
COPY requirements.txt .

# ライブラリをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリ本体をコピー
COPY . .

# 非rootユーザーを作成して切り替え
RUN useradd -m -u 1001 appuser
USER appuser

# 外部に公開するポートを宣言（ドキュメント的な意味合い）
EXPOSE 5000

# ヘルスチェックの設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

# コンテナ起動時に実行するコマンド
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
EOF
```

---

## 4. 主要命令の解説

### 📖 `FROM` — ベースイメージの指定

```dockerfile
FROM python:3.12-slim
```

> すべての Dockerfile は `FROM` から始まる。ゼロから作ることもできるが（`FROM scratch`）、通常は公式イメージをベースにする。

| タグ | 特徴 | サイズ目安 |
|---|---|---|
| `python:3.12` | フル版（開発ツール充実） | ~1GB |
| `python:3.12-slim` | 不要なパッケージを省いた軽量版 | ~130MB |
| `python:3.12-alpine` | Alpine Linux ベースの最小版 | ~50MB |
| `python:3.12-bookworm` | Debian bookworm ベース（glibc 互換） | ~370MB |

> **Alpine の注意点：** musl libc を使うため、glibc に依存するライブラリが動かない場合がある。  
> 数値計算系（numpy, pandas）や一部の C 拡張ライブラリでビルドエラーになることがある。

### 📖 `LABEL` — メタデータの付与

```dockerfile
LABEL maintainer="team@example.com"
LABEL version="1.0.0"
LABEL description="Flask API server"
```

> イメージにメタデータを付与する命令。`docker inspect` で確認できる。  
> CI/CD でビルド情報（ブランチ名・コミットハッシュ）を埋め込むのによく使われる。

```bash
docker inspect flask-app:v1 | grep -A10 "Labels"
```

### 📖 `WORKDIR` — 作業ディレクトリ

```dockerfile
WORKDIR /app
```

> 以降の `COPY` / `RUN` / `CMD` の起点となるディレクトリ。`mkdir && cd` に相当する。  
> 指定したディレクトリが存在しない場合は自動で作成される。

### 📖 `COPY` と `ADD` — ファイルのコピー

```dockerfile
COPY requirements.txt .   # ホストのファイル → コンテナの WORKDIR
COPY . .                  # カレントディレクトリ全体をコピー
```

> `COPY <ホスト側> <コンテナ側>` の形式。  
> `ADD` は URL 取得と tar 自動展開の機能を持つが、それが不要なら常に `COPY` を使う。

```dockerfile
# ADD の特別な用途（URLからのダウンロード）
ADD https://example.com/app.tar.gz /tmp/
# → /tmp/ に tar が展開される（COPY ではできない）
```

### 📖 `RUN` — ビルド時にコマンドを実行

```dockerfile
RUN pip install --no-cache-dir -r requirements.txt
```

> イメージのビルド時に実行されるコマンド。実行結果が新しいレイヤーとして保存される。  
> `&&` でつないで 1 つの `RUN` にまとめるとレイヤー数を減らせる。

```dockerfile
# NG: レイヤーが増える + キャッシュが残る
RUN apt update
RUN apt install -y curl
RUN apt clean

# OK: 1 レイヤーにまとめてキャッシュも掃除
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
```

### 📖 `ARG` — ビルド時の引数

```dockerfile
# Dockerfile 内で変数を宣言（デフォルト値あり）
ARG PYTHON_VERSION=3.12
ARG APP_VERSION=dev

FROM python:${PYTHON_VERSION}-slim

LABEL version="${APP_VERSION}"
```

```bash
# ビルド時に引数を渡す
docker build --build-arg PYTHON_VERSION=3.11 --build-arg APP_VERSION=1.0.0 -t myapp .

# デフォルト値を使う場合
docker build -t myapp .
```

> **`ARG` と `ENV` の違い：**
>
> | | ARG | ENV |
> |---|---|---|
> | 有効な期間 | ビルド時のみ | ビルド時 + 実行時 |
> | `docker run` で上書き | できない | `-e` で上書き可 |
> | 主な用途 | ビルドバリエーション | アプリの設定値 |

### 📖 `ENV` — 環境変数の設定

```dockerfile
ENV FLASK_ENV=production
ENV PORT=5000
# 複数まとめて書ける
ENV APP_NAME=myapp \
    LOG_LEVEL=INFO
```

> ビルド時・実行時の両方で有効な環境変数を設定する。  
> `docker run -e` で実行時に上書き可能。

### 📖 `EXPOSE` — ポートの宣言

```dockerfile
EXPOSE 5000
```

> コンテナが使用するポートをドキュメントとして宣言する命令。  
> **実際にポートを開放するわけではない**（`docker run -p` が必要）。  
> `docker inspect` や IDE でポートを自動検出する際に使われる。

### 📖 `USER` — 実行ユーザーの切り替え

```dockerfile
# ユーザーを作成して切り替え
RUN useradd -m -u 1001 appuser
USER appuser
```

> 以降の `RUN` / `CMD` / `ENTRYPOINT` を指定ユーザーで実行する。  
> **root で動かさない**のはコンテナセキュリティの基本。

```bash
# 確認
docker run --rm flask-app:v1 whoami
# appuser（root ではない）

# root で動いている場合の問題
docker run --rm nginx whoami
# root ← root で動いているコンテナが脆弱性を突かれると危険
```

### 📖 `HEALTHCHECK` — ヘルスチェック

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1
```

| オプション | 意味 |
|---|---|
| `--interval` | チェックの間隔 |
| `--timeout` | タイムアウト時間 |
| `--start-period` | 起動後の猶予時間（この間は失敗しても無視） |
| `--retries` | 失敗判定までのリトライ回数 |

```bash
# ヘルスチェックの状態確認
docker ps
# STATUS 列に (healthy) / (unhealthy) / (health: starting) が表示される

docker inspect --format='{{.State.Health.Status}}' <コンテナID>
```

### 📖 `CMD` — コンテナ起動時のデフォルトコマンド

```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
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
# → docker run --entrypoint sh myimage  → sh（ENTRYPOINT を上書き）
```

---

## 5. ビルドして動かす

```bash
# イメージをビルド（-t でイメージ名:タグを指定）
docker build -t flask-app:v1 .

# ビルドの詳細を表示
docker build --progress=plain -t flask-app:v1 .

# ビルドされたイメージを確認
docker images | grep flask-app

# コンテナを起動
docker run -d --name myapp -p 5000:5000 flask-app:v1

# 動作確認
curl http://localhost:5000
curl http://localhost:5000/health

# ヘルスチェックの状態確認
docker ps   # (healthy) と表示されるまで少し待つ
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
CMD [...]                 ← キャッシュ無効 ❌
```

### キャッシュを活かす書き順の鉄則

```dockerfile
# ❌ 悪い例：app.py を変えるたびに pip install が走る（遅い）
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
time docker build -t flask-app:v1 .

# app.py だけ変更
echo "# コメント追加" >> app.py

# 2回目のビルド（pip install はキャッシュされる）
time docker build -t flask-app:v2 .
# "COPY requirements.txt" まではキャッシュ（---> Using cache と表示される）
# "COPY . ." 以降だけ再実行される → 大幅に速い！

# キャッシュを使わずビルド
docker build --no-cache -t flask-app:fresh .
```

---

## 7. `.dockerignore` でビルドを軽くする

### 📖 用語：ビルドコンテキスト（Build Context）

> `docker build .` の `.` がビルドコンテキスト。  
> このディレクトリ全体が Docker Daemon に送信される。  
> **不要なファイルが多いと転送が遅くなり、キャッシュも無効化されやすくなる。**

`.gitignore` と同じ書き方で除外できる：

```bash
cat > .dockerignore << 'EOF'
# Pythonのキャッシュ
__pycache__
*.pyc
*.pyo
*.pyd

# 仮想環境
.venv
venv/
env/

# バージョン管理
.git
.gitignore

# 機密情報
.env
*.env
secrets/

# テスト・開発用ファイル
tests/
*.test.py
coverage.xml
.coverage

# ドキュメント
*.md
docs/

# CI/CD
.github/
.gitlab-ci.yml
Jenkinsfile
EOF
```

```bash
# ビルドコンテキストのサイズを確認
docker build . 2>&1 | head -3
# Sending build context to Docker daemon  15.36kB  ← ここが小さいと良い
```

---

## 8. Dockerfile のベストプラクティスまとめ

```dockerfile
# ✅ ベストプラクティスを盛り込んだ Dockerfile

# 1. バージョンを固定してビルドの再現性を確保
FROM python:3.12.3-slim

# 2. メタデータを付与
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="1.0.0"

# 3. セキュリティパッチを当てる
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

# 4. 作業ディレクトリを設定
WORKDIR /app

# 5. 変わりにくいものから順にコピー
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. アプリをコピー
COPY app.py .

# 7. 非 root ユーザーで実行
RUN useradd -m -u 1001 -s /bin/bash appuser && \
    chown -R appuser:appuser /app
USER appuser

# 8. ポートを宣言
EXPOSE 5000

# 9. ヘルスチェックを設定
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# 10. exec 形式で CMD を指定（シグナルが正しく届く）
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

---

## ✅ 振り返りチェックリスト

- [ ] `FROM / WORKDIR / COPY / RUN / EXPOSE / CMD` を順番に説明できる
- [ ] `CMD` と `ENTRYPOINT` の違いを説明できる
- [ ] `ARG` と `ENV` の違い（ビルド時 vs 実行時）を説明できる
- [ ] `LABEL` でイメージにメタデータを付与できる
- [ ] `USER` で非 root ユーザーを設定できる
- [ ] `HEALTHCHECK` でコンテナの正常性を確認できる
- [ ] キャッシュが無効化されるタイミングを説明できる
- [ ] `COPY requirements.txt` を先に書く理由を説明できる
- [ ] `.dockerignore` が何を解決するか説明できる

---

## 次のユニット

[2-2. マルチステージビルド](./2-2_multistage.md)
