# 4-4. Stack デプロイ

## 🎯 このユニットのゴール

- Compose ファイルを Swarm の Stack としてデプロイできる
- `deploy:` フィールドの設定を書ける
- Compose との差分（Swarm でのみ使える機能）を把握できる

---

## シナリオ

> `docker service create` は 1 サービスずつ管理が大変。  
> Phase 3 で学んだ Compose ファイルを Swarm にそのまま使う方法を学ぼう。

---

## 1. Stack とは

### 📖 用語：Stack（スタック）

> 1 つの compose.yaml から定義された、複数サービスのまとまり。  
> `docker stack deploy` でクラスタ全体にデプロイできる。

```
compose.yaml
    ↓ docker stack deploy
Swarm クラスタにデプロイ
  ├── web サービス (3 レプリカ → 3 ノードに分散)
  ├── db サービス (1 レプリカ)
  └── redis サービス (1 レプリカ)
```

---

## 2. Swarm 対応の compose.yaml

通常の compose.yaml に `deploy:` フィールドを追加するだけで Swarm 対応になる：

```yaml
# compose.yaml
services:
  web:
    image: your-registry/flask-app:v1.0.0   # build: は Swarm では使えない
    ports:
      - "5000:5000"
    deploy:
      replicas: 3                   # レプリカ数
      update_config:
        parallelism: 1              # 一度に更新するレプリカ数
        delay: 10s                  # 更新間隔
        failure_action: rollback    # 失敗時の動作
      restart_policy:
        condition: on-failure       # 失敗時のみ再起動
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: "0.5"               # CPU 制限
          memory: 256M              # メモリ制限
        reservations:
          cpus: "0.1"
          memory: 128M
      placement:
        constraints:
          - node.role == worker     # Worker ノードにのみ配置

  db:
    image: mysql:8.0
    env_file: .env
    volumes:
      - db-data:/var/lib/mysql
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.db == true  # db ラベルのあるノードに配置

volumes:
  db-data:
```

### Swarm で使えない Compose の機能

| Compose の機能 | Swarm での扱い |
|---|---|
| `build:` | 使えない（事前にビルドしてレジストリに push が必要） |
| `depends_on:` | 無視される（Swarm は自前の依存制御を持たない） |
| `links:` | 非推奨・無視 |
| `network_mode: host` | 使えない |

---

## 3. Stack のデプロイ操作

```bash
# Stack をデプロイ（スタック名: myapp）
docker stack deploy -c compose.yaml myapp

# Stack 一覧
docker stack ls
# NAME    SERVICES
# myapp   3

# Stack 内のサービス一覧
docker stack services myapp
# ID       NAME         MODE         REPLICAS   IMAGE
# abc      myapp_web    replicated   3/3        flask-app:v1.0.0
# def      myapp_db     replicated   1/1        mysql:8.0
# ghi      myapp_redis  replicated   1/1        redis:7

# Stack 内のタスク一覧
docker stack ps myapp

# ログ
docker service logs -f myapp_web

# Stack を削除（全サービス・ネットワークを削除）
docker stack rm myapp
```

---

## 4. Secret（機密情報の管理）

### 📖 用語：Secret

> Swarm が暗号化して管理する機密情報。  
> コンテナ内では `/run/secrets/<secret名>` として読み取れる。  
> 環境変数でパスワードを渡すより安全。

```bash
# Secret を作成
echo "mysecretpassword" | docker secret create mysql_root_password -
echo "apppassword" | docker secret create mysql_password -

# Secret 一覧
docker secret ls
```

```yaml
# compose.yaml で Secret を使う
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/mysql_root_password
    secrets:
      - mysql_root_password

secrets:
  mysql_root_password:
    external: true   # docker secret create で作成済みのものを使う
```

```bash
# コンテナ内で確認
docker exec -it <db-container-id> cat /run/secrets/mysql_root_password
# mysecretpassword
```

---

## ✅ 振り返りチェックリスト

- [ ] `deploy:` フィールドの主要設定（replicas / update_config / placement）を書ける
- [ ] Swarm で使えない Compose 機能（build / depends_on）を説明できる
- [ ] `docker stack deploy / ls / services / ps / rm` を使いこなせる
- [ ] Secret で機密情報を安全に渡せる

---

## 次のユニット

[4-5. シナリオ演習](./4-5_scenario.md)
