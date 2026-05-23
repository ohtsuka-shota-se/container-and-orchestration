# 3-1. Compose の概念と compose.yaml

## 🎯 このユニットのゴール

- 複数コンテナ管理の課題を説明できる
- `compose.yaml` の基本構造を書ける
- サービス・プロジェクト・依存関係の概念を説明できる

---

## シナリオ

> Flask アプリが MySQL も必要になってきた。  
> `docker run` を 2 回叩けば動くが、毎回オプションを覚えるのが辛い。  
> チームに渡すときも「この順番で起動して」という手順書が必要になっている。  
> **`docker compose up` 一発で全部立ち上がる**構成を作ろう。

---

## 1. 複数コンテナ管理の課題

Phase 1 で学んだ `docker run` では：

```bash
# MySQL を起動
docker run -d \
  --name db \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -v db-data:/var/lib/mysql \
  --network mynet \
  mysql:8.0

# Flask を起動（DB の後に起動する必要がある）
docker run -d \
  --name web \
  -p 5000:5000 \
  -e DATABASE_URL=mysql://root:secret@db/myapp \
  --network mynet \
  flask-app:latest
```

**問題点：**
- コマンドが長くて覚えられない
- 起動順序を手動で管理しなければならない
- 「全部止める」には `docker stop web db` と名前を全部覚える必要がある
- ネットワークも手動で作る必要がある

---

## 2. Docker Compose とは

### 📖 用語：Docker Compose

> 複数コンテナのアプリケーションを `compose.yaml` という 1 つのファイルで定義し、  
> `docker compose up / down` で一括管理する仕組み。

```
compose.yaml（設計図）
    ↓ docker compose up
複数のコンテナが正しい順序・ネットワーク設定で一括起動
    ↓ docker compose down
全コンテナ・ネットワークを一括削除
```

> **LPIC との接続：**  
> systemd のサービス定義と構造がよく似ている。
>
> ```ini
> # systemd の unit ファイル（/etc/systemd/system/myapp.service）
> [Unit]
> Description=My App
> After=mysql.service        # 依存関係
>
> [Service]
> ExecStart=/usr/bin/python app.py
> Environment=PORT=5000      # 環境変数
> Restart=always
> ```
>
> ```yaml
> # compose.yaml
> services:
>   web:
>     image: flask-app
>     depends_on:            # 依存関係
>       - db
>     environment:
>       PORT: 5000           # 環境変数
>     restart: always
> ```
>
> 「複数サービスをまとめて管理する systemd」のような感覚で捉えるとわかりやすい。

---

## 3. compose.yaml の基本構造

```yaml
# compose.yaml
services:        # ← コンテナ（サービス）の定義
  web:           # ← サービス名（自由につけてよい）
    image: nginx
    ports:
      - "8080:80"

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret

volumes:         # ← 名前付きボリュームの定義
  db-data:

networks:        # ← カスタムネットワークの定義（省略時は自動生成）
  mynet:
```

---

## 4. 主要フィールドの解説

### 📖 用語：サービス（Service）

> `services:` 以下に定義する各コンテナの論理的な単位。  
> サービス名がそのままコンテナの DNS ホスト名になる（後述）。

### `image` vs `build`

```yaml
services:
  # 既存イメージを使う場合
  db:
    image: mysql:8.0

  # Dockerfile からビルドする場合
  web:
    build: .               # Dockerfile のある場所（相対パス）
    # または詳細指定
    build:
      context: ./app
      dockerfile: Dockerfile.prod
      target: prod         # マルチステージビルドのターゲット
```

### `ports` — ポートマッピング

```yaml
ports:
  - "8080:80"       # ホスト:コンテナ（文字列推奨）
  - "127.0.0.1:8080:80"  # ループバックのみ
```

### `volumes` — ボリュームマウント

```yaml
volumes:
  - db-data:/var/lib/mysql    # 名前付きボリューム
  - ./app:/app                # バインドマウント（相対パス可）
  - ./nginx.conf:/etc/nginx/nginx.conf:ro  # 読み取り専用
```

### `environment` — 環境変数

```yaml
environment:
  MYSQL_ROOT_PASSWORD: secret     # 直接書く
  MYSQL_DATABASE: myapp
  # または
environment:
  - MYSQL_ROOT_PASSWORD=secret    # リスト形式
  - MYSQL_DATABASE=myapp
```

### `depends_on` — 起動順序の制御

```yaml
services:
  web:
    depends_on:
      - db           # db が起動してから web を起動する
```

### 📖 用語：depends_on の注意点

> `depends_on` はコンテナが **起動した** タイミングを待つだけで、  
> アプリが **Ready になった** タイミングは待たない。  
> MySQL は起動直後はまだ接続を受け付けていないことがある。

```yaml
# ヘルスチェックと組み合わせることで「Ready になるまで待つ」が実現できる
services:
  web:
    depends_on:
      db:
        condition: service_healthy   # ← healthy になるまで待つ

  db:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### `restart` — 再起動ポリシー

```yaml
restart: no             # 再起動しない（デフォルト）
restart: always         # 常に再起動（手動 stop を除く）
restart: on-failure     # エラー終了時のみ再起動
restart: unless-stopped # 手動 stop 以外は常に再起動
```

---

## 5. はじめての compose.yaml を動かす

```bash
mkdir -p ~/docker-practice/compose-hello
cd ~/docker-practice/compose-hello

cat > compose.yaml << 'EOF'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: secret
      MYSQL_DATABASE: myapp
    volumes:
      - db-data:/var/lib/mysql

volumes:
  db-data:
EOF

mkdir html
echo "<h1>Hello from Compose! 🐳</h1>" > html/index.html

# 起動
docker compose up -d

# 確認
docker compose ps
curl http://localhost:8080

# ログ
docker compose logs

# 全停止・削除
docker compose down
```

---

## 📖 用語：プロジェクト（Project）

> Compose が管理する単位。デフォルトは **compose.yaml のあるディレクトリ名**。  
> コンテナ名・ネットワーク名・ボリューム名にプレフィックスとして使われる。

```bash
# ディレクトリ名が compose-hello の場合
docker compose ps
# NAME                    IMAGE         ...
# compose-hello-web-1     nginx:alpine
# compose-hello-db-1      mysql:8.0
```

---

## ✅ 振り返りチェックリスト

- [ ] `docker run` の問題点と Compose が解決することを説明できる
- [ ] `services / volumes / networks` の役割を説明できる
- [ ] `image` と `build` の使い分けを説明できる
- [ ] `depends_on` の制限（Ready を待たない）を説明できる
- [ ] `docker compose up -d` と `docker compose down` を使える

---

## 次のユニット

[3-2. Compose の操作と環境変数](./3-2_compose-operations.md)
