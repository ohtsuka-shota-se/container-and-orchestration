# ハンズオン補足: Zabbix でコンテナ監視を体験する

Docker Compose を使って Zabbix Server / Agent 環境を構築し、コンテナ監視を体験するハンズオンです。  
対象：LPIC Level 1 程度の方（Phase 3 の Docker Compose を終えた方）

---

## 構成図

```
[ zabbix-net (Docker ネットワーク) ]
  ├── zabbix-postgres   (PostgreSQL 15)
  ├── zabbix-server     (Zabbix Server 7.0)
  ├── zabbix-web        (Zabbix Web UI / Nginx)
  └── zabbix-agent      (Zabbix Agent2 ← 監視対象)
```

Server 側と Agent 側で compose ファイルを分けることで、**本番に近い構成**（別ホスト稼働）を再現します。

---

## ファイルの取得（git clone）

compose ファイルはリポジトリで管理しています。以下の手順で取得してください。

```bash
git clone https://github.com/ohtsuka-shota-se/container-and-orchestration.git
cd container-and-orchestration/hands-on/appendix/zabbix-study
```

すでにクローン済みの場合は `git pull` で最新化してください。

```bash
cd container-and-orchestration
git pull
cd hands-on/appendix/zabbix-study
```

---

## ファイル構成

```
hands-on/appendix/zabbix-study/
├── zabbix-server-compose.yaml   # PostgreSQL + Zabbix Server + Web UI
└── zabbix-agent-compose.yaml    # Zabbix Agent（監視対象）
```

> **なぜ compose ファイルを分けるの？**  
> - Server と Agent は本番では別ホストに存在する構成を再現できる  
> - それぞれ独立して再起動・更新できる  
> - Agent compose をコピーして複数台の監視対象を模擬できる

---

## zabbix-server-compose.yaml

```yaml
networks:
  zabbix-net:
    name: zabbix-net
    external: true

volumes:
  postgres-data:

services:
  postgres:
    image: postgres:15
    container_name: zabbix-postgres
    environment:
      POSTGRES_DB: zabbix
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_pass
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - zabbix-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zabbix"]
      interval: 10s
      timeout: 5s
      retries: 5

  zabbix-server:
    image: zabbix/zabbix-server-pgsql:ubuntu-7.0-latest
    container_name: zabbix-server
    environment:
      DB_SERVER_HOST: postgres
      POSTGRES_DB: zabbix
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_pass
    ports:
      - "10051:10051"
    networks:
      - zabbix-net
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  zabbix-web:
    image: zabbix/zabbix-web-nginx-pgsql:ubuntu-7.0-latest
    container_name: zabbix-web
    environment:
      DB_SERVER_HOST: postgres
      POSTGRES_DB: zabbix
      POSTGRES_USER: zabbix
      POSTGRES_PASSWORD: zabbix_pass
      ZBX_SERVER_HOST: zabbix-server
      PHP_TZ: Asia/Tokyo
    ports:
      - "8080:8080"   # 競合する場合は 8081 等に変更
    networks:
      - zabbix-net
    depends_on:
      - zabbix-server
    restart: unless-stopped
```

---

## zabbix-agent-compose.yaml

```yaml
networks:
  zabbix-net:
    name: zabbix-net
    external: true

services:
  zabbix-agent:
    image: zabbix/zabbix-agent2:ubuntu-7.0-latest
    container_name: zabbix-agent
    environment:
      ZBX_HOSTNAME: zabbix-agent
      ZBX_SERVER_HOST: zabbix-server
      ZBX_SERVER_PORT: 10051
      ZBX_METADATA: "docker-study"
    ports:
      - "10050:10050"
    networks:
      - zabbix-net
    privileged: true
    pid: "host"
    restart: unless-stopped
```

---

## 起動手順

```bash
# ① ネットワーク作成
docker network create zabbix-net

# ② Server 起動
docker compose -f zabbix-server-compose.yaml up -d

# ③ Agent 起動
docker compose -f zabbix-agent-compose.yaml up -d
```

> **なぜネットワークを compose ではなく手動で作るの？**  
> `services:` が空の compose ファイルは `no service selected` エラーになるため、  
> ネットワーク単体の作成は `docker network create` コマンドで行います。

Web UI: `http://localhost:8080`  
初期ログイン: `Admin` / `zabbix`

---

## Web UI での Agent 登録手順

1. **設定 → ホスト → ホストの作成**
2. ホスト名: `zabbix-agent`（`ZBX_HOSTNAME` と完全一致させること）
3. テンプレート: `Linux by Zabbix agent` を追加  
   ※ これがないとホストが灰色のまま（監視データが取得されない）
4. インターフェース: **Agent**
   - 接続方法: **DNS**（IPアドレスではなく DNS を選択）
   - DNS 名: `zabbix-agent`
   - ポート: `10050`
5. **追加** → 1〜2 分待つとホストが緑色になる

---

## ハマりポイントと解決策

### 1. `no service selected` エラー

```
no service selected
```

| 項目 | 内容 |
|------|------|
| 原因 | `services:` が空の compose ファイルは起動できない |
| 解決 | ネットワーク作成は `docker network create zabbix-net` を使う |

---

### 2. ポート競合 `port is already allocated`

```
Error response from daemon: driver failed programming external connectivity: port is already allocated
```

| 項目 | 内容 |
|------|------|
| 原因 | 8080 が Portainer 等の他コンテナに使われている |
| 解決 | `docker ps -a` で確認し、競合コンテナを削除するか `8081` 等に変更 |

```bash
# ポート使用状況を確認
docker ps -a
```

---

### 3. ホストの可用性が灰色のまま

| 項目 | 内容 |
|------|------|
| 原因 | テンプレートが紐づいていない |
| 解決 | ホスト設定のテンプレートタブに `Linux by Zabbix agent` を追加 |

---

### 4. インターフェース設定でエラー

| 項目 | 内容 |
|------|------|
| 原因 | IPアドレスフィールドに DNS 名は入力できない |
| 解決 | 接続方法を「DNS」に切り替えて DNS 名フィールドに `zabbix-agent` を入力 |

---

## 学習ポイント

### `external: true` とは

```yaml
networks:
  zabbix-net:
    name: zabbix-net
    external: true   # ← これ
```

「このネットワークは compose が作るのではなく、すでに存在するものに接続する」という宣言です。  
`docker network create` で作ったネットワークを複数の compose ファイルが共有できます。

---

### Docker の内部 DNS の仕組み

同じ Docker ネットワーク内のコンテナは、**コンテナ名で名前解決**できます。

```
zabbix-net 内
  zabbix-server → "zabbix-agent" という名前で Agent に到達できる
  zabbix-web    → "postgres" という名前で DB に到達できる
```

Docker がネットワークスコープの DNS サーバーを内蔵しているため、IP アドレスを意識する必要がありません。  
`zabbix-net` の外にいるコンテナからは解決できない点に注意。

---

### 疎通確認コマンド

```bash
# Server から Agent へ疎通確認（バージョンが返ればOK）
docker exec zabbix-server zabbix_get -s zabbix-agent -p 10050 -k agent.version
```

---

## 停止手順

```bash
docker compose -f zabbix-agent-compose.yaml down
docker compose -f zabbix-server-compose.yaml down
docker network rm zabbix-net
```
