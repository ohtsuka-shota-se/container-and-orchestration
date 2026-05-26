# 3-4. シナリオ演習

## 🎯 このユニットのゴール

- Web + DB + Redis の 3 サービス構成を compose.yaml で書ける
- 開発用と本番用を override で切り替えられる

---

## シナリオ：WordPress 環境を 1 コマンドで立ち上げる

> チームの開発環境として WordPress + MySQL + phpMyAdmin を  
> `docker compose up -d` 1 コマンドで誰でも再現できるようにしよう。

---

## Step 1：ディレクトリと .env の準備

```bash
mkdir -p ~/docker-practice/wordpress
cd ~/docker-practice/wordpress

cat > .env << 'EOF'
MYSQL_ROOT_PASSWORD=rootpass
MYSQL_DATABASE=wordpress
MYSQL_USER=wpuser
MYSQL_PASSWORD=wppass
WORDPRESS_PORT=8080
PMA_PORT=8081
EOF

echo ".env" > .gitignore

cat > .env.example << 'EOF'
MYSQL_ROOT_PASSWORD=
MYSQL_DATABASE=wordpress
MYSQL_USER=
MYSQL_PASSWORD=
WORDPRESS_PORT=8080
PMA_PORT=8081
EOF
```

---

## Step 2：compose.yaml を作成

```bash
cat > compose.yaml << 'EOF'
services:

  db:
    image: mysql:8.0
    env_file: .env
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost",
             "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped

  wordpress:
    image: wordpress:latest
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "${WORDPRESS_PORT}:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_USER: ${MYSQL_USER}
      WORDPRESS_DB_PASSWORD: ${MYSQL_PASSWORD}
      WORDPRESS_DB_NAME: ${MYSQL_DATABASE}
    volumes:
      - wp-content:/var/www/html/wp-content
    restart: unless-stopped

  phpmyadmin:
    image: phpmyadmin:latest
    depends_on:
      - db
    ports:
      - "${PMA_PORT}:80"
    environment:
      PMA_HOST: db
      PMA_USER: root
      PMA_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    restart: unless-stopped

volumes:
  db-data:
  wp-content:
EOF
```

---

## Step 3：起動と確認

```bash
docker compose up -d

# 起動状態を確認（db が healthy になるまで少し待つ）
docker compose ps

# ログで起動を確認
docker compose logs -f db
# Ctrl+C でログを抜ける

# ブラウザで確認
# WordPress: http://localhost:8080
# phpMyAdmin: http://localhost:8081
```

---

## Step 4：サービス間通信を確認する

```bash
# wordpress コンテナから db に接続できるか確認
docker compose exec wordpress bash -c "apt update -qq && apt install -y -qq dnsutils curl"

# サービス名で名前解決できるか
docker compose exec wordpress nslookup db
# Address: 172.xx.0.x  ← db の IP が返る

# DB に直接接続できるか
docker compose exec wordpress bash -c \
  "mysql -h db -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} -e 'SHOW TABLES;'"
```

---

## Step 5：開発用 override を作る

```bash
cat > compose.override.yaml << 'EOF'
# 開発環境でのみ有効な追加設定
services:
  db:
    ports:
      - "3306:3306"   # 開発時はホストから直接 DB に接続できるようにする

  wordpress:
    environment:
      WORDPRESS_DEBUG: "1"   # デバッグログを有効化
EOF
```

```bash
# 開発環境（override が自動マージされる）
docker compose up -d

# db の 3306 がホストに公開されているはず
docker compose ps
# PORTS: 0.0.0.0:3306->3306/tcp

# 本番環境（override を使わない）
docker compose -f compose.yaml up -d
# db の 3306 は外部公開されない
```

---

## Step 6：後片付け

```bash
# コンテナとネットワークを削除（ボリュームは保持）
docker compose down

# ボリュームも含めて全削除
docker compose down -v
```

---

## 🏆 発展課題

### 課題 1：Redis キャッシュを追加する

```yaml
# compose.yaml に追記
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes   # 永続化モード

volumes:
  redis-data:
```

```bash
# Redis が起動したか確認
docker compose exec redis redis-cli ping
# PONG

# WordPress コンテナから Redis に接続できるか確認
docker compose exec wordpress bash -c "echo 'PING' | nc redis 6379"
```

### 課題 2：ネットワークを分離する

```yaml
services:
  wordpress:
    networks:
      - front
      - back

  db:
    networks:
      - back

  phpmyadmin:
    networks:
      - back

networks:
  front:
  back:
```

```bash
# phpmyadmin は back ネットワークのみなので front からは到達できないはず
docker compose exec wordpress ping phpmyadmin  # 到達できる（同じ back）
```

---

## ✅ 演習完了チェックリスト

- [ ] compose.yaml に 3 サービス構成を書けた
- [ ] healthcheck + depends_on で起動順序を制御できた
- [ ] .env ファイルで機密情報を外部化できた
- [ ] サービス名で名前解決できることを確認できた
- [ ] compose.override.yaml で開発用設定を追加できた

---

## Phase 3 完了！

お疲れさまでした。Phase 3 では以下を習得しました：

- compose.yaml の構造（services / volumes / networks）
- up / down / logs / exec / ps などの日常コマンド
- .env と override による環境の切り替え
- サービスディスカバリ（サービス名での名前解決）
- ヘルスチェックによる依存関係の制御

---

## 次のフェーズ

[Phase 4：Docker Swarm](../phase4/README.md)
