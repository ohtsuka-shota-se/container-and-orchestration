# 5-3. Pod / Deployment / Service

## 🎯 このユニットのゴール

- Pod / Deployment / Service の関係を図で説明できる
- YAML マニフェストを自分で書いて apply できる
- ローリングアップデートとロールバックを実行できる
- liveness / readiness Probe の使い分けを説明できる
- DaemonSet / StatefulSet の用途を説明できる

---

## シナリオ

> K8s の 3 大リソースを実際に動かして、相互の関係を体で覚えよう。  
> 「Pod だけ」「Deployment あり」「Service あり」と段階的に積み上げていく。

---

## 1. Pod

### 📖 用語：Pod

> K8s の **最小実行単位**。1 つ以上のコンテナをまとめたもの。  
> 同じ Pod のコンテナは同じ Node 上で動き、ネットワーク・ストレージを共有する。

> **Swarm との対比：**  
> Swarm の「タスク = コンテナ 1 つ」に対し、K8s の「Pod = コンテナ 1 つ以上」。  
> Pod に複数コンテナを入れるのはサイドカーパターンなど特殊なケースで、基本は 1 Pod 1 コンテナ。

### Pod のマニフェスト

```yaml
# pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    env: dev
spec:
  containers:
  - name: nginx
    image: nginx:1.25-alpine
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"       # 100m = 0.1 コア（1000m = 1コア）
      limits:
        memory: "128Mi"
        cpu: "500m"
    env:
    - name: MY_POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name   # Pod 名を環境変数として渡せる
    volumeMounts:
    - name: cache
      mountPath: /tmp/cache
  volumes:
  - name: cache
    emptyDir: {}   # Pod の中だけで共有する一時ストレージ
```

```bash
kubectl apply -f pod.yaml
kubectl get pods
kubectl describe pod nginx-pod

# Pod に直接アクセス（port-forward）
kubectl port-forward pod/nginx-pod 8080:80
curl http://localhost:8080

kubectl delete -f pod.yaml
```

### Pod を直接作る問題点

Pod を直接作ると、それが落ちても **自動で再起動されない**。  
「Pod が落ちたら新しい Pod を起動する」管理が必要 → これが Deployment の役割。

---

## 2. Deployment

### 📖 用語：Deployment

> Pod の **テンプレートとレプリカ数** を管理するリソース。  
> Pod が落ちたら自動で新しい Pod を起動し、指定したレプリカ数を維持する。  
> ローリングアップデートとロールバックの機能を持つ。

```
Deployment（3 レプリカ）
    ↓ 自動的に
ReplicaSet（Deployment が内部で作る・直接操作しない）
    ↓ 管理
Pod × 3
```

> **Swarm との対比：**
> ```
> Swarm Service (replicas: 3)  ≈  K8s Deployment (replicas: 3)
> Swarm タスク                ≈  K8s Pod
> ```

### Deployment のマニフェスト

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx          # このラベルを持つ Pod を管理する
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # 更新中に超過してよい Pod 数（または割合 "25%"）
      maxUnavailable: 0   # 更新中に不足してよい Pod 数（0 = 無停止）
  template:               # ここから下が Pod のテンプレート
    metadata:
      labels:
        app: nginx        # selector の matchLabels と一致させる（必須）
    spec:
      containers:
      - name: nginx
        image: nginx:1.24-alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        readinessProbe:          # Ready 判定のプローブ
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
          failureThreshold: 3
        livenessProbe:           # 生存確認のプローブ
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
          failureThreshold: 3
```

```bash
kubectl apply -f deployment.yaml
kubectl get deployments
kubectl get pods    # nginx-deployment-xxxxxx-xxxxx という名前の Pod が 3 つ

# Deployment の詳細
kubectl describe deployment nginx-deployment

# ReplicaSet も自動的に作られる
kubectl get replicasets
```

### ローリングアップデートとロールバック

```bash
# イメージを更新（コマンドでも可）
kubectl set image deployment/nginx-deployment nginx=nginx:1.25-alpine

# 進行状況を確認
kubectl rollout status deployment/nginx-deployment
# Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 3 new replicas have been updated...
# deployment "nginx-deployment" successfully rolled out

# 更新履歴を確認（--record は deprecated、annotations を使う）
kubectl rollout history deployment/nginx-deployment
# REVISION  CHANGE-CAUSE
# 1         <none>
# 2         <none>

# 直前のバージョンにロールバック
kubectl rollout undo deployment/nginx-deployment

# 特定のリビジョンに戻す
kubectl rollout undo deployment/nginx-deployment --to-revision=1

# デプロイを一時停止・再開
kubectl rollout pause deployment/nginx-deployment
kubectl rollout resume deployment/nginx-deployment
```

> **LPIC との接続：**  
> `kubectl rollout` は `dpkg` のパッケージ管理と感覚が近い。
>
> ```
> dpkg --list <package>           ≈  kubectl rollout history deployment/xxx
> apt install <package>=1.24      ≈  kubectl set image ... nginx=nginx:1.24
> apt install <package>=1.23      ≈  kubectl rollout undo deployment/xxx
> ```

---

## 3. Probe（プローブ）詳解

### 📖 用語：Readiness Probe

> Pod が「リクエストを受け付ける準備ができているか」を確認する。  
> 失敗すると Service のエンドポイントから外される（リクエストが来なくなる）。

### 📖 用語：Liveness Probe

> Pod が「生きているか（デッドロック状態ではないか）」を確認する。  
> 失敗するとコンテナが再起動される。

### 📖 用語：Startup Probe

> 起動に時間がかかるアプリ用。起動完了後に liveness/readiness probe に切り替わる。

```yaml
containers:
- name: app
  image: my-slow-app:v1

  # 起動が遅いアプリの場合（startup probe で保護）
  startupProbe:
    httpGet:
      path: /health
      port: 8080
    failureThreshold: 30    # 30 回失敗するまで待つ（30 × 10s = 5分）
    periodSeconds: 10

  # 準備できたかどうかの確認（失敗 → Service から外れる）
  readinessProbe:
    httpGet:
      path: /ready
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 3

  # 生存確認（失敗 → コンテナ再起動）
  livenessProbe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 15
    periodSeconds: 20
    failureThreshold: 3

  # exec 形式のプローブ（シェルコマンドで確認）
  livenessProbe:
    exec:
      command:
      - cat
      - /tmp/healthy
    periodSeconds: 5

  # TCP ソケット形式（HTTP 以外のサービス用）
  readinessProbe:
    tcpSocket:
      port: 3306
    initialDelaySeconds: 10
    periodSeconds: 5
```

| Probe | 失敗時の動作 | 使いどころ |
|---|---|---|
| Readiness | Service のエンドポイントから外す | 起動中・高負荷時 |
| Liveness | コンテナを再起動 | デッドロック・フリーズ検出 |
| Startup | liveness/readiness を無効化 | 起動に時間がかかるアプリ |

---

## 4. Service

### 📖 用語：Service

> Pod へのアクセスを安定させる **仮想エンドポイント**。  
> Pod は再起動のたびに IP が変わるが、Service の IP（ClusterIP）は変わらない。  
> ラベルで Pod を選択して、自動的にロードバランシングする。

```
クライアント
    ↓ 固定 IP (ClusterIP: 10.96.0.1)
  Service
    ↓ ラベル selector でルーティング
  Pod(10.244.0.1) / Pod(10.244.0.2) / Pod(10.244.0.3)
```

> **Swarm との対比：**  
> Swarm の VIP と役割がほぼ同じ。

### Service の種類

| 種類 | 説明 | 用途 |
|---|---|---|
| ClusterIP（デフォルト） | クラスタ内からのみアクセス可能 | サービス間通信 |
| NodePort | 全 Node の特定ポートを外部に公開 | 開発・検証用 |
| LoadBalancer | クラウドの LB を自動作成して外部公開 | 本番の外部公開 |
| ExternalName | DNS の CNAME を返す | 外部サービスへのエイリアス |

### Service のマニフェスト

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx          # このラベルを持つ Pod に転送
  ports:
  - protocol: TCP
    port: 80            # Service のポート
    targetPort: 80      # Pod のポート
    name: http
  type: ClusterIP       # デフォルト
```

```bash
kubectl apply -f service.yaml
kubectl get services
# NAME            TYPE        CLUSTER-IP     PORT(S)
# nginx-service   ClusterIP   10.96.0.100    80/TCP

# クラスタ内からアクセス確認（port-forward で代替）
kubectl port-forward service/nginx-service 8080:80
curl http://localhost:8080

# ラベルで紐付いているか確認
kubectl get endpoints nginx-service
# ENDPOINTS: 10.244.0.2:80,10.244.0.3:80,10.244.0.4:80  ← 3 Pod 分の IP

# Service の詳細（どの Pod にルーティングされるか）
kubectl describe service nginx-service
```

### NodePort でホストに公開する（開発用）

```yaml
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080     # 30000〜32767 の範囲で指定（省略すると自動割り当て）
```

```bash
# minikube の場合
minikube service nginx-service --url
# http://192.168.x.x:30080
```

---

## 5. DaemonSet

### 📖 用語：DaemonSet

> 全ノード（または特定のノード）に必ず 1 つずつ Pod を配置するリソース。  
> ノードが増えたら自動で新ノードにも Pod が配置される。

> **Swarm の Global モードに相当。**

```yaml
# daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
spec:
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: dockercontainerlog
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: dockercontainerlog
        hostPath:
          path: /var/lib/docker/containers
```

**DaemonSet の主な用途：**
- ログ収集エージェント（Fluentd, Promtail）
- 監視エージェント（Datadog Agent, Node Exporter）
- ネットワークプラグイン（Calico, Cilium）
- ストレージプロビジョナー

---

## 6. StatefulSet

### 📖 用語：StatefulSet

> ステートフルなアプリ（DB など）のための Deployment。  
> Pod に**安定した名前と永続ストレージ**を割り当てる。

| | Deployment | StatefulSet |
|---|---|---|
| Pod 名 | ランダム（nginx-xxx-yyy） | 順番（mysql-0, mysql-1...） |
| 起動順序 | 並行して起動 | 順番に起動（0 → 1 → 2） |
| 停止順序 | 並行して停止 | 逆順に停止（2 → 1 → 0） |
| ストレージ | Pod が消えると消える | Pod が消えても PVC は残る |
| DNS | Service 経由のみ | 各 Pod に固定 DNS あり |

```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: "mysql"   # Headless Service の名前
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:  # 各 Pod に独自の PVC を自動作成
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi
```

**StatefulSet の Pod の DNS:**

```
mysql-0.mysql.default.svc.cluster.local
mysql-1.mysql.default.svc.cluster.local
mysql-2.mysql.default.svc.cluster.local
```

---

## 7. Pod / Deployment / Service の全体像

```
Deployment（宣言: nginx を 3 台動かせ）
│
├── Pod 1 (label: app=nginx, IP: 10.244.0.2)
├── Pod 2 (label: app=nginx, IP: 10.244.0.3)
└── Pod 3 (label: app=nginx, IP: 10.244.0.4)
           ↑ label selector で紐付け
Service (nginx-service, ClusterIP: 10.96.0.100)
           ↑ ポート転送
クライアント → 10.96.0.100:80
```

---

## ✅ 振り返りチェックリスト

- [ ] Pod・Deployment・Service の 3 つを図で関係を説明できる
- [ ] Deployment のマニフェストを見てどこが Pod テンプレートか指摘できる
- [ ] selector と labels の対応関係を説明できる
- [ ] `kubectl rollout undo` でロールバックできる
- [ ] ClusterIP / NodePort / LoadBalancer の違いを説明できる
- [ ] Readiness Probe と Liveness Probe の失敗時の動作の違いを説明できる
- [ ] DaemonSet の用途（全ノードにエージェントを配置）を説明できる
- [ ] StatefulSet と Deployment の違い（安定した名前と PVC）を説明できる

---

## 次のユニット

[5-4. ConfigMap / Secret / PersistentVolume](./5-4_config-storage.md)
