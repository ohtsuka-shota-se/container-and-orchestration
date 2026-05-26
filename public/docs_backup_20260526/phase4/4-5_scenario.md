# 4-5. シナリオ演習

## 🎯 このユニットのゴール

- Web アプリを 3 ノード Swarm にデプロイし、ノード障害からの自動復旧を確認する
- ローリングアップデートとロールバックを実際に体験する

---

## シナリオ：3 ノード Swarm での本番デプロイ

> Nginx を使った Web サービスを Swarm クラスタにデプロイしよう。  
> ノードをわざと落として「自動復旧する」ことを確認し、  
> ローリングアップデートで無停止リリースも体験する。

---

## Step 1：Swarm クラスタの確認

```bash
# node1（Manager）で実行
docker node ls
# node1  Ready  Active  Leader
# node2  Ready  Active  Reachable
# node3  Ready  Active
```

---

## Step 2：compose.yaml の作成

```bash
# node1 で作業
mkdir -p ~/swarm-demo
cd ~/swarm-demo

cat > compose.yaml << 'EOF'
services:
  web:
    image: nginx:1.24-alpine
    ports:
      - "8080:80"
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 5s
        failure_action: rollback
      restart_policy:
        condition: on-failure
      labels:
        - "app=web-demo"
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/"]
      interval: 10s
      timeout: 3s
      retries: 3
EOF
```

---

## Step 3：Stack をデプロイ

```bash
docker stack deploy -c compose.yaml webdemo

# デプロイ確認（少し待つ）
watch docker stack ps webdemo
# 全タスクが Running になるまで待つ

docker stack services webdemo
# REPLICAS: 3/3 になったら完了

# アクセス確認
curl http://localhost:8080
```

---

## Step 4：ノード障害と自動復旧

```bash
# 現在どのノードにタスクがあるか確認
docker stack ps webdemo
# NAME       NODE    CURRENT STATE
# web.1      node1   Running
# web.2      node2   Running
# web.3      node3   Running

# node3 を Drain（ダウンをシミュレート）
docker node update --availability drain node3

# 少し待ってからタスクを確認
docker stack ps webdemo
# web.3 が node3 から node1 か node2 に移動しているはず
# NAME         NODE    CURRENT STATE
# web.1        node1   Running
# web.2        node2   Running
# web.3        node1   Running   ← 自動的に移動！
# web.3 \_ ... node3   Shutdown  ← 旧タスクは Shutdown に

# この間もサービスは継続している
curl http://localhost:8080   # 止まっていない！

# node3 を Active に戻す
docker node update --availability active node3
```

---

## Step 5：ローリングアップデート

```bash
# nginx のバージョンを 1.25 に更新
docker service update \
  --image nginx:1.25-alpine \
  webdemo_web

# 更新の進行を監視（別ターミナルで）
watch docker service ps webdemo_web

# 更新中もアクセスは継続できるか確認
while true; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080; sleep 1; done
# 200 が続いていれば無停止アップデート成功

# 更新完了後に確認
docker service ps webdemo_web
# IMAGE 列が 1.25-alpine になっているはず
```

---

## Step 6：ロールバック

```bash
# 1.24 に戻す
docker service rollback webdemo_web

# 確認
docker service ps webdemo_web
# IMAGE 列が 1.24-alpine に戻っているはず
```

---

## Step 7：後片付け

```bash
docker stack rm webdemo
docker node update --availability active node3
```

---

## 🏆 発展課題

### 課題 1：わざと失敗するアップデートを試す

```bash
# 存在しないイメージを指定して失敗させる
docker service update \
  --image nginx:99.99-notexist \
  webdemo_web

# failure_action: rollback の設定があれば自動でロールバックされる
docker service ps webdemo_web
# 自動的に前のバージョンに戻っているはず
```

### 課題 2：配置制約（placement constraints）を試す

```bash
# node3 に db ラベルをつける
docker node update --label-add db=true node3

# db タスクが node3 にしか配置されないサービス
docker service create \
  --name db-test \
  --constraint "node.labels.db==true" \
  --replicas 1 \
  mysql:8.0

# node3 にしか配置されないことを確認
docker service ps db-test
```

---

## ✅ 演習完了チェックリスト

- [ ] Stack をデプロイして 3 レプリカが全ノードに分散した
- [ ] ノードを Drain にしてタスクが自動移動することを確認した
- [ ] サービスを止めずにローリングアップデートできた
- [ ] ロールバックで前のバージョンに戻せた
- [ ] その間も `curl` でのアクセスが継続していた

---

## Phase 4 完了！

お疲れさまでした。Phase 4 では以下を習得しました：

- オーケストレーションの概念（desired state / 自動復旧）
- Swarm クラスタの構築（Manager / Worker / クォーラム）
- Service の作成・スケーリング・ローリングアップデート
- Stack による複数サービスの一括デプロイ
- Secret による機密情報の安全な管理

---

## 次のフェーズ

[Phase 5：Kubernetes 入門](../phase5/README.md)
