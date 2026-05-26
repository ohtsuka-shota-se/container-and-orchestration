# 4-3. Service とスケーリング

## 🎯 このユニットのゴール

- Service を作成してレプリカを管理できる
- ローリングアップデートとロールバックを実行できる
- Global モードとレプリカモードを使い分けられる
- 配置制約とリソース予約でタスクの配置先を制御できる

---

## シナリオ

> Swarm クラスタができた。次は実際にアプリをデプロイして、  
> スケールアウト・無停止アップデートを体験しよう。

---

## 1. Service とは

### 📖 用語：Service（サービス）

> Swarm における「どのイメージを・何台・どんな設定で動かすか」の宣言的な定義。  
> `docker service create` で作成し、Swarm が desired state を維持し続ける。

```
docker service create --replicas 3 nginx
         ↓
Swarm のスケジューラが各ノードにタスクを配置

node1: nginx タスク (task.1)
node2: nginx タスク (task.2)
node3: nginx タスク (task.3)

↓ node2 が落ちたら？
node1 または node3 に新しいタスクを自動起動 → 常に 3 台維持
```

---

## 2. Service の基本操作

```bash
# サービスを作成（3 レプリカ）
docker service create \
  --name web \
  --replicas 3 \
  --publish published=8080,target=80 \
  nginx:alpine

# サービス一覧
docker service ls
# ID        NAME   MODE         REPLICAS   IMAGE          PORTS
# xyz123    web    replicated   3/3        nginx:alpine   *:8080->80/tcp

# タスク（コンテナ）の状態確認
docker service ps web
# ID        NAME     IMAGE          NODE    DESIRED STATE  CURRENT STATE
# abc       web.1    nginx:alpine   node1   Running        Running
# def       web.2    nginx:alpine   node2   Running        Running
# ghi       web.3    nginx:alpine   node3   Running        Running

# サービスの詳細
docker service inspect web --pretty

# ログ（全タスク分）
docker service logs -f web

# 特定ノードのタスクのログ
docker service logs -f web --raw   # タイムスタンプ付き

# サービスを削除
docker service rm web
```

---

## 3. スケーリング

```bash
# レプリカ数を 5 に増やす（スケールアウト）
docker service scale web=5

# または
docker service update --replicas 5 web

# 確認
docker service ps web
# 5 つのタスクが分散配置されているはず

# 2 に減らす（スケールイン）
docker service scale web=2

# 複数サービスを同時にスケール
docker service scale web=3 api=2 worker=5
```

---

## 4. ローリングアップデート

### 📖 用語：ローリングアップデート（Rolling Update）

> 複数のレプリカを一度に全部止めるのではなく、**少しずつ順番に**新バージョンに入れ替える方式。  
> サービスを止めずにバージョンアップできる。

```
Before:
  タスク1: nginx:1.24  ←  Running
  タスク2: nginx:1.24  ←  Running
  タスク3: nginx:1.24  ←  Running

ローリングアップデート開始:
  Step1: タスク1を nginx:1.25 に入れ替え（タスク2,3はまだ 1.24）
  Step2: タスク2を nginx:1.25 に入れ替え（タスク3はまだ 1.24）
  Step3: タスク3を nginx:1.25 に入れ替え

After:
  タスク1: nginx:1.25  ←  Running
  タスク2: nginx:1.25  ←  Running
  タスク3: nginx:1.25  ←  Running
```

```bash
# アップデートポリシーを指定してサービス作成
docker service create \
  --name web \
  --replicas 3 \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-failure-action rollback \
  --update-monitor 30s \
  --publish published=8080,target=80 \
  nginx:1.24-alpine

# オプション解説:
# --update-parallelism 1  : 一度に何台ずつ更新するか
# --update-delay 10s      : 更新間の待機時間
# --update-failure-action : 失敗時の動作（rollback / pause / continue）
# --update-monitor 30s    : 更新後にこの時間監視して失敗判定

# イメージを更新（ローリングアップデート実行）
docker service update \
  --image nginx:1.25-alpine \
  web

# アップデートの進行状況を見る
watch docker service ps web
# 古いタスクと新しいタスクが混在している様子が見える

# 更新を一時停止
docker service update --rollback-failure-action pause web
```

### ロールバック

```bash
# 直前のバージョンに戻す
docker service rollback web

# 確認
docker service ps web   # 1.24 に戻っているはず

# ロールバック自体の設定も指定できる
docker service create \
  --name web \
  --replicas 3 \
  --rollback-parallelism 2 \   # ロールバックも 2 台ずつ
  --rollback-delay 5s \
  nginx:1.24-alpine
```

---

## 5. Global モード

### 📖 用語：Global モード

> 全ノードに必ず 1 つずつタスクを配置するモード。  
> ノードが増えたら自動で新ノードにもタスクが配置される。  
> **用途：** ログ収集エージェント・監視エージェントなど「全ノードで動かしたいもの」

```bash
# Global モードでサービス作成
docker service create \
  --name log-agent \
  --mode global \
  fluent/fluentd:v1.16

# 確認（全ノードに 1 つずつ配置される）
docker service ps log-agent
# log-agent.node1  node1  Running
# log-agent.node2  node2  Running
# log-agent.node3  node3  Running
```

| モード | 挙動 | 用途 |
|---|---|---|
| replicated（デフォルト） | 指定した数だけタスクを配置 | Web サーバー・API など |
| global | 全ノードに 1 つずつ配置 | 監視・ログ収集エージェントなど |

---

## 6. 配置制約（Placement Constraints）

```bash
# node.role: タスクを配置するノードのロール
docker service create \
  --name web \
  --constraint "node.role == worker" \   # Worker のみに配置
  --replicas 3 \
  nginx

# node.labels: カスタムラベルで配置先を制御
docker node update --label-add zone=us-east node1
docker node update --label-add zone=us-west node2

docker service create \
  --name web-us-east \
  --constraint "node.labels.zone == us-east" \
  --replicas 2 \
  nginx

# node.hostname: 特定ホストにのみ配置
docker service create \
  --constraint "node.hostname == node1" \
  --name db \
  mysql:8.0

# 複数の制約を AND で組み合わせ
docker service create \
  --constraint "node.role == worker" \
  --constraint "node.labels.env == prod" \
  --replicas 3 \
  nginx
```

### 配置の優先設定（Placement Preferences）

```bash
# ノード間でバランスよく配置（Spread）
docker service create \
  --name web \
  --placement-pref "spread=node.labels.zone" \   # zone ラベルでバランシング
  --replicas 4 \
  nginx

# zone=us-east: 2台, zone=us-west: 2台 に自動配分される
```

---

## 7. リソース制限と予約

```bash
# リソース制限を設定
docker service create \
  --name web \
  --reserve-cpu 0.1 \     # このタスクのために 0.1 コアを予約
  --reserve-memory 128m \ # このタスクのために 128MB を予約
  --limit-cpu 0.5 \       # 最大 0.5 コアまで使用可
  --limit-memory 256m \   # 最大 256MB まで使用可
  --replicas 3 \
  nginx

# 予約（reserve）とは？
# → スケジューラが「このノードには 0.1 コア空きがある」と判定するための保証
# → 実際にリソースを確保するわけではない（soft limit）

# 制限（limit）とは？
# → コンテナが実際に使えるリソースの上限（cgroup で強制）
```

---

## 8. VIP（サービスの負荷分散）

### 📖 用語：VIP（Virtual IP）

> Swarm のサービスに割り当てられる仮想 IP。  
> クライアントは VIP にアクセスするだけで、Swarm が背後の複数タスクに自動振り分けする。

```
クライアント → web サービスの VIP (10.0.0.10)
                        ↓ Swarm の内部ロードバランサー
              ┌─────────┼─────────┐
           task.1    task.2    task.3
         (10.0.1.1) (10.0.1.2) (10.0.1.3)
```

```bash
# サービスの VIP を確認
docker service inspect --format='{{.Endpoint.VirtualIPs}}' web

# コンテナの中からサービス名で名前解決（Compose と同じ仕組み）
docker exec -it <タスクのコンテナID> nslookup web
# Address: 10.0.0.10  ← VIP が返る
```

---

## ✅ 振り返りチェックリスト

- [ ] `docker service create / ls / ps / rm` を使いこなせる
- [ ] `docker service scale` でレプリカ数を変更できる
- [ ] ローリングアップデートの仕組みを図で説明できる
- [ ] `docker service rollback` でバージョンを戻せる
- [ ] Global モードと Replicated モードの違いを説明できる
- [ ] VIP がクライアントからどう見えるかを説明できる
- [ ] `--constraint` でタスクの配置先を制御できる
- [ ] `--reserve-cpu / --limit-cpu` の違いを説明できる

---

## 次のユニット

[4-4. Stack デプロイ](./4-4_stack.md)
