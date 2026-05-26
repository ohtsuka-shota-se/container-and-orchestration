# 3-2. Compose の操作と環境変数

## 🎯 このユニットのゴール

- Compose の主要コマンドを使いこなせる
- `.env` ファイルで環境変数を外部化できる
- `compose.override.yaml` で開発/本番を切り替えられる
- `docker compose watch` でファイル変更を自動反映できる

---

## シナリオ

> Compose で環境が起動できた。次は「日常的に使う操作」と「パスワードをファイルに直書きしたくない問題」を解決しよう。

---

## 1. 日常的に使う Compose コマンド

```bash
# 全サービスを起動（バックグラウンド）
docker compose up -d

# 特定サービスだけ起動
docker compose up -d web

# 全サービスを停止・コンテナ削除（ボリュームは残る）
docker compose down

# ボリュームも含めて全削除
docker compose down -v

# 全サービスのログ
docker compose logs

# リアルタイムで流す
docker compose logs -f

# 特定サービスのログだけ
docker compose logs -f web

# 末尾 100 行だけ
docker compose logs --tail 100 web

# 全サービスの状態確認
docker compose ps

# 詳細情報（ポート・ヘルスチェックの状態など）
docker compose ps --all

# サービス内でコマンド実行
docker compose exec web bash
docker compose exec db mysql -u root -psecret myapp

# サービスを再起動（設定変更時など）
docker compose restart web

# イメージを再ビルド（Dockerfile を変更した場合）
docker compose build
docker compose up -d --build   # ビルドして起動を同時に

# スケールアウト（同一サービスを複数起動）
docker compose up -d --scale web=3

# 特定サービスだけ一時停止・再開
docker compose pause web
docker compose unpause web

# 設定ファイルの検証（構文チェック）
docker compose config

# 設定ファイルの展開結果を確認（変数展開後）
docker compose config --no-interpolate
```

> **LPIC との接続：**  
> `docker compose` のコマンド体系は systemctl に対応している。
>
> ```
> systemctl start  myapp  ≈  docker compose up -d
> systemctl stop   myapp  ≈  docker compose down
> systemctl status myapp  ≈  docker compose ps
> journalctl -u   myapp  ≈  docker compose logs -f
> systemctl restart myapp ≈  docker compose restart
> systemctl reload myapp  ≈  docker compose exec web kill -HUP 1
> ```
>
> 「アプリ全体を 1 サービスとして管理する systemctl」として捉えると、  
> コマンドの対応が直感的にわかる。

---

## 2. 環境変数の外部化

### パスワードを compose.yaml に直書きしてはいけない

```yaml
# ❌ NG: Git にコミットするとパスワードが漏れる
services:
  db:
    environment:
      MYSQL_ROOT_PASSWORD: mysecretpassword  # これを Git に上げてはいけない
```

### `.env` ファイルで外部化する

```bash
# .env ファイルを作成
cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=mysecretpassword
MYSQL_DATABASE=myapp
MYSQL_USER=appuser
MYSQL_PASSWORD=apppass
APP_PORT=5000
EOF

# .gitignore に追加（必須）
echo ".env" >> .gitignore
```

```yaml
# compose.yaml: ${変数名} で参照
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}

  web:
    build: .
    ports:
      - "${APP_PORT}:5000"
```

```bash
# 変数が正しく展開されるか確認（実際には起動しない）
docker compose config
```

### `.env.example` を Git 管理する

```bash
# 変数名だけ書いたサンプルファイルを Git で共有
cat > .env.example << 'EOF'
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=myapp
MYSQL_USER=
MYSQL_PASSWORD=
APP_PORT=5000
EOF

# チームメンバーはこれをコピーして値を埋める
cp .env.example .env
```

### 複数の .env ファイルを使う

```yaml
# compose.yaml
services:
  web:
    env_file:
      - .env           # 共通
      - .env.local     # ローカル個別設定（.gitignore に追加）
    environment:
      # env_file より environment が優先される
      DEBUG: "true"
```

### 環境変数の優先順位

優先度が高い順：

```
1. docker compose up -e KEY=VALUE   # コマンドライン引数
2. compose.yaml の environment:     # ファイル内の直接指定
3. compose.yaml の env_file:        # .env ファイル参照
4. シェルの環境変数（export KEY=VALUE）
5. .env ファイル（自動読み込み）
```

---

## 3. override ファイルで開発/本番を切り替える

### 📖 用語：compose.override.yaml

> `compose.yaml` と **自動的にマージ** される追加設定ファイル。  
> `docker compose up` で自動的に読み込まれる。  
> 開発専用の設定（ホットリロード・デバッグポート）を分離するのに使う。

```
compose.yaml          ← 共通設定（Git 管理）
compose.override.yaml ← 開発用の追加設定（Git 管理してもよい）
compose.prod.yaml     ← 本番用の追加設定（必要に応じて）
```

```yaml
# compose.yaml（共通）
services:
  web:
    build: .
    environment:
      FLASK_ENV: production

  db:
    image: mysql:8.0
    env_file: .env
    volumes:
      - db-data:/var/lib/mysql

volumes:
  db-data:
```

```yaml
# compose.override.yaml（開発用：自動マージされる）
services:
  web:
    build:
      target: dev           # 開発用ステージを使う
    volumes:
      - .:/app              # ソースコードをマウント（ホットリロード）
    environment:
      FLASK_ENV: development
      FLASK_DEBUG: "1"
    ports:
      - "5001:5001"         # デバッガーポート

  db:
    ports:
      - "3306:3306"         # 開発時だけホストから直接接続できるようにする
```

```yaml
# compose.prod.yaml（本番用）
services:
  web:
    image: your-registry/myapp:v1.0.0   # ビルド済みイメージを使う
    restart: always
    environment:
      FLASK_ENV: production
    deploy:
      resources:
        limits:
          memory: 512m
```

```bash
# 開発環境（compose.yaml + compose.override.yaml が自動マージ）
docker compose up -d

# 本番環境（compose.yaml + compose.prod.yaml を明示指定）
docker compose -f compose.yaml -f compose.prod.yaml up -d

# 設定のマージ結果を確認
docker compose config
docker compose -f compose.yaml -f compose.prod.yaml config
```

---

## 4. docker compose watch（ファイル変更の自動反映）

### 📖 用語：docker compose watch

> ファイルシステムの変更を監視して、自動的にコンテナを更新する機能（Compose v2.20 以降）。  
> 従来のバインドマウントによるホットリロードの代替・補完として使える。

```yaml
# compose.yaml
services:
  web:
    build: .
    ports:
      - "5000:5000"
    develop:
      watch:
        # app.py が変わったら sync（コンテナへのファイルコピー）
        - action: sync
          path: ./app.py
          target: /app/app.py

        # requirements.txt が変わったら rebuild
        - action: rebuild
          path: ./requirements.txt

        # テンプレートが変わったら sync
        - action: sync
          path: ./templates
          target: /app/templates

        # .env が変わったらコンテナを再起動
        - action: sync+restart
          path: ./.env
          target: /app/.env
```

```bash
# watch モードで起動（変更を監視し続ける）
docker compose watch
# ファイルを変更すると自動的にコンテナへ反映される

# バックグラウンドで起動しつつ watch も有効にする
docker compose up --watch
```

| action | 動作 | 用途 |
|---|---|---|
| `sync` | ファイルをコンテナにコピー | スクリプト・テンプレート |
| `rebuild` | イメージを再ビルドして再起動 | 依存関係の変更 |
| `sync+restart` | sync 後にコンテナを再起動 | 設定ファイルの変更 |

---

## 5. ヘルスチェック

```yaml
services:
  db:
    image: mysql:8.0
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s      # チェック間隔
      timeout: 5s        # タイムアウト
      retries: 5         # リトライ回数
      start_period: 30s  # 起動後の猶予時間

  web:
    depends_on:
      db:
        condition: service_healthy   # db が healthy になるまで待つ
```

```bash
# ヘルスチェックの状態確認
docker compose ps
# STATUS に (healthy) / (unhealthy) / (starting) が表示される

# 詳細（最後のチェック結果など）
docker inspect <コンテナID> | grep -A 20 "Health"
```

---

## 6. run コマンド（一時的なタスク実行）

```bash
# サービスのコンテナを一時的に起動してコマンドを実行（終了後削除）
docker compose run --rm web python manage.py migrate

# ポートマッピングなし、依存サービスなしで起動
docker compose run --no-deps --rm web bash

# 環境変数を追加して実行
docker compose run --rm -e DEBUG=true web pytest
```

> **`exec` vs `run` の使い分け：**
>
> | コマンド | 用途 |
> |---|---|
> | `exec` | すでに起動しているコンテナにコマンドを実行する |
> | `run` | 新しいコンテナを起動してコマンドを実行し、終了後削除する |
>
> DB マイグレーション・テスト実行など「一発タスク」には `run --rm` が向いている。

---

## ✅ 振り返りチェックリスト

- [ ] `up / down / logs / exec / ps / restart / build` を説明なしに使える
- [ ] `.env` ファイルで環境変数を外部化できる
- [ ] `.gitignore` に `.env` を追加することの重要性を説明できる
- [ ] `compose.override.yaml` の自動マージの仕組みを説明できる
- [ ] ヘルスチェックと `depends_on condition` を組み合わせられる
- [ ] `docker compose watch` でファイル変更を自動反映できる
- [ ] `run --rm` と `exec` の使い分けを説明できる

---

## 次のユニット

[3-3. ネットワークとボリューム](./3-3_networks-volumes.md)
