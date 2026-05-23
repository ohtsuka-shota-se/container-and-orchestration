# 3-3. ネットワークとボリューム

## 🎯 このユニットのゴール

- Compose が自動生成するネットワークの仕組みを説明できる
- サービス名で名前解決できる理由を理解できる
- 複数の Compose プロジェクト間でネットワーク・ボリュームを共有できる

---

## シナリオ

> Web サービスが DB に接続するとき、IP アドレスを直書きすると再起動のたびに変わってしまう。  
> Compose のネットワーク機能を使って「サービス名で繋がる」仕組みを理解しよう。

---

## 1. Compose が自動生成するネットワーク

`docker compose up` を実行すると、Compose は自動でブリッジネットワークを作成する。

```bash
docker compose up -d
docker network ls
# NAME                    DRIVER   SCOPE
# compose-hello_default   bridge   local   ← 自動生成
```

### 📖 用語：ブリッジネットワーク（Bridge Network）

> Docker が作成する仮想スイッチ。同じネットワークに接続されたコンテナ同士は通信できる。  
> Compose は全サービスを自動的に同じネットワークに接続する。

```
compose.yaml の全サービス
┌──────────────────────────────────────────┐
│           myproject_default ネットワーク  │
│                                          │
│   web コンテナ       db コンテナ         │
│   IP: 172.18.0.2    IP: 172.18.0.3      │
└──────────────────────────────────────────┘
```

---

## 2. サービス名での名前解決

### 📖 用語：サービスディスカバリ（Service Discovery）

> コンテナが「相手の IP アドレスを知らなくてもサービス名で通信できる」仕組み。  
> Compose ネットワーク内では **サービス名が DNS ホスト名** として自動登録される。

```yaml
services:
  web:
    build: .
    environment:
      # IP アドレスではなく "db" というサービス名で指定できる
      DATABASE_URL: mysql://root:secret@db/myapp
      #                                  ↑ compose.yaml のサービス名

  db:
    image: mysql:8.0
```

```bash
# web コンテナの中から db に ping できる
docker compose exec web ping db
# PING db (172.18.0.3): 56 data bytes
# コンテナの IP は起動のたびに変わるが、名前で解決されるので問題ない

# 名前解決の確認
docker compose exec web nslookup db
# Server: 127.0.0.11   ← Docker の組み込み DNS
# Address: 127.0.0.11#53
# Name: db
# Address: 172.18.0.3
```

> **LPIC との接続：**  
> `/etc/hosts` や `/etc/resolv.conf` の仕組みをそのまま応用している。
>
> ```bash
> # コンテナ内の /etc/resolv.conf を確認
> docker compose exec web cat /etc/resolv.conf
> # nameserver 127.0.0.11   ← Docker が提供する DNS サーバー
> # search myproject_default  ← Compose ネットワーク名
>
> # このDNSが "db" という名前を IP に解決してくれる
> # Linux でいう /etc/hosts に自動でエントリが追加されるイメージ
> ```

---

## 3. ネットワークの分離

すべてのサービスを同じネットワークに入れたくない場合は、ネットワークを分けられる：

```yaml
# 例: フロント / バック / DB を分離する3層構成
services:
  frontend:
    image: nginx
    networks:
      - front-net       # フロント層のみ

  backend:
    build: .
    networks:
      - front-net       # フロントからアクセスできる
      - back-net        # DB にもアクセスできる

  db:
    image: mysql:8.0
    networks:
      - back-net        # バックエンドからのみアクセス可能

networks:
  front-net:
  back-net:
```

```
インターネット
      ↓
  frontend (front-net のみ)
      ↓ front-net
  backend (front-net + back-net)
      ↓ back-net
    db (back-net のみ)
```

> **セキュリティ上の意味：** db コンテナは front-net に繋がっていないので、  
> frontend から直接 DB に接続することができない。

---

## 4. Compose のボリューム管理

### 名前付きボリュームの宣言

```yaml
services:
  db:
    image: mysql:8.0
    volumes:
      - db-data:/var/lib/mysql

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

# トップレベルで宣言が必要
volumes:
  db-data:
  redis-data:
```

```bash
# ボリュームの確認（プロジェクト名がプレフィックスになる）
docker volume ls
# DRIVER   VOLUME NAME
# local    myproject_db-data
# local    myproject_redis-data

# コンテナを停止しても保持される
docker compose down
docker volume ls   # まだある

# ボリュームごと削除
docker compose down -v
docker volume ls   # なくなった
```

### 外部ボリューム（別プロジェクトと共有）

```yaml
volumes:
  shared-data:
    external: true   # Compose の外で作られたボリュームを参照
    name: mycompany_shared_volume
```

---

## 5. 複数 Compose プロジェクト間の接続

別々の `compose.yaml` で管理するサービス同士を繋げたいケース：

```bash
# 例: frontend プロジェクトと backend プロジェクトが別ディレクトリにある
~/projects/
├── frontend/compose.yaml
└── backend/compose.yaml
```

```yaml
# backend/compose.yaml
networks:
  backend-net:
    name: shared_backend_net   # 固定の名前をつける

services:
  api:
    networks:
      - backend-net
```

```yaml
# frontend/compose.yaml
networks:
  backend-net:
    external: true             # 外部ネットワークとして参照
    name: shared_backend_net

services:
  web:
    networks:
      - backend-net
```

---

## ✅ 振り返りチェックリスト

- [ ] Compose が自動でネットワークを作ることを説明できる
- [ ] サービス名で名前解決できる仕組み（Docker DNS）を説明できる
- [ ] ネットワークを分けてサービスを隔離する方法を書ける
- [ ] `docker compose down` と `docker compose down -v` の違いを説明できる
- [ ] `external: true` の使い方を説明できる

---

## 次のユニット

[3-4. シナリオ演習](./3-4_scenario.md)
