# 2-2. マルチステージビルド

## 🎯 このユニットのゴール

- マルチステージビルドの必要性を説明できる
- 開発用と本番用でイメージを分けられる
- イメージサイズを大幅に削減できる

---

## シナリオ

> Flask アプリのイメージを作ったが、サイズを確認したら 200MB 超えていた。  
> 本番に配布するイメージはもっと小さくしたい。  
> **ビルドに必要なものと、実行に必要なものを分ける**方法を学ぼう。

---

## 1. なぜイメージが大きくなるのか

```bash
# Go アプリを例に考える（コンパイルが必要な言語の場合）
docker pull golang:1.22
docker images golang:1.22
# golang:1.22   ...   800MB 超！

# でも実際に実行に必要なのはコンパイル済みのバイナリだけ
# ビルドツール・ソースコード・コンパイラは本番イメージに不要
```

Python でも同様の問題がある：

```bash
# ビルドに使ったツール（gcc など）が本番イメージに残ってしまう
docker build -t flask-app:fat .
docker images flask-app:fat
# flask-app:fat   ...   280MB
```

**問題点：**
- イメージが大きい → push/pull に時間がかかる
- 不要なツールが入っている → 攻撃面が広がる（セキュリティリスク）
- `gcc` や `make` が入った本番コンテナは意図せず悪用されうる

---

## 2. マルチステージビルドの仕組み

### 📖 用語：マルチステージビルド（Multi-stage Build）

> 1 つの Dockerfile に複数の `FROM` を書き、前のステージの **成果物だけ** を最終イメージにコピーする仕組み。  
> ビルド環境と実行環境を明確に分けられる。

```dockerfile
# ステージ 1（builder）: ビルドに必要なものを全部入れる
FROM golang:1.22 AS builder
WORKDIR /src
COPY . .
RUN go build -o myapp .

# ステージ 2（final）: 実行に必要なものだけ
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /src/myapp .   # ← バイナリだけコピー
CMD ["./myapp"]
# golang:1.22 の 800MB は最終イメージに入らない！
```

---

## 3. Python アプリでのマルチステージビルド

```bash
cd ~/docker-practice/flask-app
```

### シングルステージ（Before）

```dockerfile
# Dockerfile.single
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]
```

```bash
docker build -f Dockerfile.single -t flask-app:single .
docker images flask-app:single
# 約 150〜180MB
```

### マルチステージ（After）

```dockerfile
# Dockerfile
# ─── ステージ 1: 依存関係のインストール ───────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# wheelファイルとしてライブラリをビルド（バイナリキャッシュ）
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ─── ステージ 2: 実行環境 ──────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# ビルドステージで作った wheel だけコピーしてインストール
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
    && rm -rf /wheels

# アプリ本体をコピー
COPY app.py .

# root で動かさない（セキュリティ）
RUN useradd -m appuser
USER appuser

EXPOSE 5000
CMD ["python", "app.py"]
```

```bash
docker build -t flask-app:multi .
docker images | grep flask-app

# flask-app   single   ...   175MB
# flask-app   multi    ...   130MB  ← 小さくなった
```

> **なぜ小さくなるのか：**  
> `builder` ステージの pip キャッシュ・ビルドツールが最終イメージに含まれないから。

---

## 4. distroless イメージでさらに小さく

### 📖 用語：distroless

> OS のパッケージマネージャ（apt など）やシェル（bash）を含まない最小イメージ。  
> Google が提供。アプリの実行に必要なライブラリだけが入っている。

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --target=/deps -r requirements.txt

FROM gcr.io/distroless/python3-debian12
WORKDIR /app
COPY --from=builder /deps /deps
COPY app.py .
ENV PYTHONPATH=/deps
CMD ["app.py"]
```

| イメージ | サイズ | シェル | パッケージマネージャ |
|---|---|---|---|
| `python:3.12` | ~1GB | ✅ | ✅ |
| `python:3.12-slim` | ~150MB | ✅ | ✅ |
| `python:3.12-alpine` | ~50MB | ✅（ash） | ✅（apk） |
| `distroless/python3` | ~55MB | ❌ | ❌ |

> **distroless の注意点：** シェルがないので `docker exec -it bash` できない。  
> デバッグ時は `docker run --entrypoint sh` も使えないため、`debug` タグ付きを使う。
>
> ```bash
> # debug タグには busybox シェルが入っている
> docker run --entrypoint sh gcr.io/distroless/python3-debian12:debug
> ```

---

## 5. ターゲット指定ビルド（開発 / 本番の切り替え）

開発環境にはデバッグツールを入れたい、本番には入れたくない、という使い分けもできる：

```dockerfile
# ─── 共通ベース ────────────────────────────────────────────────
FROM python:3.12-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── 開発用 ───────────────────────────────────────────────────
FROM base AS dev
RUN pip install pytest flask-debugtoolbar ipython
COPY . .
CMD ["flask", "run", "--debug", "--host=0.0.0.0"]

# ─── 本番用 ───────────────────────────────────────────────────
FROM base AS prod
COPY app.py .
RUN useradd -m appuser && chown -R appuser /app
USER appuser
CMD ["python", "app.py"]
```

```bash
# 開発用イメージをビルド
docker build --target dev -t flask-app:dev .

# 本番用イメージをビルド
docker build --target prod -t flask-app:prod .

docker images | grep flask-app
# flask-app   dev    ...   230MB  ← デバッグツール込み
# flask-app   prod   ...   130MB  ← 最小限
```

---

## ✅ 振り返りチェックリスト

- [ ] マルチステージビルドが必要な理由（サイズ・セキュリティ）を説明できる
- [ ] `COPY --from=<ステージ名>` の書き方を使える
- [ ] `--target` でステージを指定してビルドできる
- [ ] distroless のメリット・デメリットを説明できる
- [ ] 開発用と本番用を 1 つの Dockerfile で管理できる

---

## 次のユニット

[2-3. レジストリへの push/pull](./2-3_registry.md)
