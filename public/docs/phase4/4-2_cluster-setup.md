# 4-2. Swarm クラスタの構築

## 🎯 このユニットのゴール

- `docker swarm init / join` でクラスタを構築できる
- ノードの状態を確認・管理できる
- Play with Docker を使ってマルチノード環境を用意できる

---

## シナリオ

> 複数サーバーで Swarm クラスタを組もう。  
> ローカル PC が 1 台しかなくても、**Play with Docker** を使えばすぐ試せる。

---

## 1. 環境の準備

### 方法①：Play with Docker（推奨・ブラウザのみで OK）

1. `https://labs.play-with-docker.com/` にアクセス
2. Docker Hub アカウントでログイン
3. 「+ ADD NEW INSTANCE」で 3 台ノードを追加

```
node1 ← Manager（Leader）
node2 ← Manager（Follower）
node3 ← Worker
```

### 方法②：ローカルの VM（Vagrant / Multipass など）

```bash
# Multipass でマルチノード環境を作る例
multipass launch --name node1 --cpus 1 --mem 1G
multipass launch --name node2 --cpus 1 --mem 1G
multipass launch --name node3 --cpus 1 --mem 1G

# 各ノードに Docker をインストール
for node in node1 node2 node3; do
  multipass exec $node -- bash -c "curl -fsSL https://get.docker.com | sh"
done
```

---

## 2. Manager ノードの初期化

```bash
# node1 で実行
docker swarm init --advertise-addr <node1のIPアドレス>

# 出力例
# Swarm initialized: current node (xyz123) is now a manager.
#
# To add a worker to this swarm, run the following command:
#
#     docker swarm join --token SWMTKN-1-xxxxx <node1-IP>:2377
#
# To add a manager to this swarm, run 'docker swarm join-token manager'
# and follow the instructions.
```

> **`--advertise-addr` の意味：**  
> 他のノードがこのノードと通信するための IP アドレス。  
> NIC が複数ある場合は明示的に指定する必要がある。

---

## 3. Worker ノードの参加

```bash
# node2, node3 で実行（join トークンは init 時に表示されたものを使う）
docker swarm join \
  --token SWMTKN-1-xxxxx \
  <node1のIPアドレス>:2377

# Swarm ノードのポート
# 2377: クラスタ管理通信（Manager ↔ Worker）
# 7946: ノード間通信（TCP/UDP）
# 4789: Overlay ネットワーク（UDP）
```

---

## 4. Manager ノードを追加する（冗長化）

```bash
# node1（Manager）で Manager 用のトークンを取得
docker swarm join-token manager

# node2 で実行（Worker ではなく Manager として参加）
docker swarm join \
  --token SWMTKN-1-manager-token-xxxxx \
  <node1のIPアドレス>:2377
```

> **Manager と Worker のトークンは別物。**  
> 間違えると意図しないロールで参加してしまう。

---

## 5. クラスタの状態確認

```bash
# Manager ノードで実行
docker node ls

# ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS
# abc123 *                      node1      Ready     Active         Leader
# def456                        node2      Ready     Active         Reachable
# ghi789                        node3      Ready     Active         
#
# * は現在のノード
# MANAGER STATUS: Leader / Reachable / (空欄=Worker)
# AVAILABILITY: Active / Pause / Drain
```

### ノードの詳細確認

```bash
docker node inspect node1 --pretty
# Platform: linux/amd64
# Resources: CPUs: 2, Memory: 2GiB
# Status: Ready
# Availability: Active
# Manager Status: Reachable
```

---

## 6. ノードの管理

### ラベルをつける（サービスの配置制御に使う）

```bash
# node3 に "db=true" というラベルをつける
docker node update --label-add db=true node3

# 確認
docker node inspect node3 --pretty | grep -A5 Labels
```

### Availability の変更

```bash
# Drain: このノードへの新規タスク配置を停止し、既存タスクを他ノードへ移動（メンテナンス時）
docker node update --availability drain node3

# Active: 通常の受け付け状態に戻す
docker node update --availability active node3

# Pause: 新規タスクの配置を停止（既存タスクはそのまま）
docker node update --availability pause node3
```

> **LPIC との接続：**  
> ノードの Availability は Linux の cron における `at.deny` / `at.allow` と発想が似ている。
>
> ```
> drain  ≈ at.deny にホスト名を追加（これ以上ジョブを受け付けない）
> active ≈ at.deny から削除（通常通り）
> ```
>
> 「メンテナンス前に `drain` にして既存タスクを退避させ、作業が終わったら `active` に戻す」  
> という手順は、計画メンテナンス時の「サービスを graceful に移動させる」操作そのもの。

### ノードの離脱・削除

```bash
# Worker ノード自身で実行
docker swarm leave

# Manager で確認
docker node ls   # STATUS が Down になる

# Down のノードを削除
docker node rm node3
```

---

## ✅ 振り返りチェックリスト

- [ ] `docker swarm init` で Manager を初期化できる
- [ ] `docker swarm join` で Worker を参加させられる
- [ ] Manager と Worker のトークンが別物であることを説明できる
- [ ] `docker node ls` で全ノードの状態を確認できる
- [ ] `--availability drain` でメンテナンス時にタスクを退避させられる
- [ ] クォーラムのために Manager は奇数台にすることを説明できる

---

## 次のユニット

[4-3. Service とスケーリング](./4-3_services.md)
