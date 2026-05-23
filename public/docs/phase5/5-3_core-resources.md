# 5-3. Pod / Deployment / Service

## 🎯 このユニットのゴール

- Pod / Deployment / Service の関係を図で説明できる
- YAML マニフェストを自分で書いて apply できる
- ローリングアップデートとロールバックを実行できる

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
spec:
  containers:
  - name: nginx
    image: nginx:1.25-alpine
    ports:
    - containerPort: 80
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"       # 100m = 0.1 コア
      limits:
        memory: "128Mi"
        cpu: "500m"
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
    ↓ 管理
ReplicaSet（Deployment が内部で作る）
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
      maxSurge: 1         # 更新中に超過してよい Pod 数
      maxUnavailable: 0   # 更新中に不足してよい Pod 数（0 = 無停止）
  template:               # ここから下が Pod のテンプレート
    metadata:
      labels:
        app: nginx        # selector の matchLabels と一致させる
    spec:
      containers:
      - name: nginx
        image: nginx:1.24-alpine
        ports:
        - containerPort: 80
        readinessProbe:          # Ready 判定のプローブ
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
```

```bash
kubectl apply -f deployment.yaml
kubectl get deployments
kubectl get pods    # nginx-deployment-xxxxxx-xxxxx という名前の Pod が 3 つ

# Deployment の詳細
kubectl describe deployment nginx-deployment
```

### ローリングアップデートとロールバック

```bash
# イメージを更新（コマンドでも可）
kubectl set image deployment/nginx-deployment nginx=nginx:1.25-alpine

# 進行状況を確認
kubectl rollout status deployment/nginx-deployment

# 更新履歴を確認
kubectl rollout history deployment/nginx-deployment

# 直前のバージョンにロールバック
kubectl rollout undo deployment/nginx-deployment

# 特定のリビジョンに戻す
kubectl rollout undo deployment/nginx-deployment --to-revision=2
```

> **LPIC との接続：**  
> `kubectl rollout` は `dpkg` のパッケージ管理と感覚が近い。
>
> ```
> dpkg --list <package>           ≈  kubectl rollout history deployment/xxx
> apt install <package>=1.24      ≈  kubectl set image ... nginx=nginx:1.24
> apt install <package>=1.23      ≈  kubectl rollout undo deployment/xxx
> ```
>
> 「バージョン履歴を持って、いつでも前のバージョンに戻せる」という点が共通している。

---

## 3. Service

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
```

### NodePort でホストに公開する（開発用）

```yaml
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 80
    nodePort: 30080     # 30000〜32767 の範囲で指定
```

```bash
# minikube の場合
minikube service nginx-service --url
# http://192.168.x.x:30080
```

---

## 4. Pod / Deployment / Service の全体像

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

---

## 次のユニット

[5-4. ConfigMap / Secret / PersistentVolume](./5-4_config-storage.md)
