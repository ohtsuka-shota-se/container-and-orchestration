# 5-5. シナリオ演習

## 🎯 このユニットのゴール

- Flask API を K8s にデプロイして外部から疎通できる
- ローリングアップデートとロールバックを実行できる
- Namespace で環境（dev / staging）を分離できる

---

## シナリオ：Flask API を K8s にデプロイする

> Phase 2 で作った Flask の ToDo API を K8s にデプロイしよう。  
> ConfigMap / Secret / Deployment / Service を組み合わせて、  
> 「マニフェストだけあれば誰でも同じ環境を再現できる」構成を作る。

---

## Step 1：ディレクトリとマニフェストの構成

```bash
mkdir -p ~/docker-practice/k8s-todo
cd ~/docker-practice/k8s-todo

# マニフェストを管理するディレクトリ
mkdir -p manifests/{base,dev,staging}
```

---

## Step 2：ConfigMap を作成

```bash
cat > manifests/base/configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: todo-config
data:
  APP_ENV: "production"
  LOG_LEVEL: "INFO"
EOF
```

---

## Step 3：Secret を作成

```bash
# Secret はコマンドで作るのが安全（YAML に書くと base64 が Git に残る）
kubectl create namespace dev
kubectl create namespace staging

kubectl create secret generic todo-secret \
  --from-literal=SECRET_KEY=dev-secret-key-change-me \
  -n dev

kubectl create secret generic todo-secret \
  --from-literal=SECRET_KEY=staging-secret-key \
  -n staging
```

---

## Step 4：Deployment を作成

```bash
cat > manifests/base/deployment.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: todo-api
  labels:
    app: todo-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: todo-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: todo-api
    spec:
      containers:
      - name: todo-api
        image: your-username/todo-api:v1.0.0
        ports:
        - containerPort: 5000
        envFrom:
        - configMapRef:
            name: todo-config
        - secretRef:
            name: todo-secret
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /todos
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /todos
            port: 5000
          initialDelaySeconds: 20
          periodSeconds: 15
EOF
```

---

## Step 5：Service を作成

```bash
cat > manifests/base/service.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: todo-api-service
spec:
  selector:
    app: todo-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: ClusterIP
EOF

# 開発用は NodePort で外部公開
cat > manifests/dev/service-nodeport.yaml << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: todo-api-service
spec:
  selector:
    app: todo-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
    nodePort: 30500
  type: NodePort
EOF
```

---

## Step 6：dev 環境にデプロイ

```bash
# base マニフェストを dev Namespace に適用
kubectl apply -f manifests/base/ -n dev

# dev 用の NodePort Service を上書き適用
kubectl apply -f manifests/dev/service-nodeport.yaml -n dev

# デプロイ確認
kubectl get all -n dev
# Pod が Running になるまで待つ
kubectl rollout status deployment/todo-api -n dev

# アクセス確認（minikube の場合）
minikube service todo-api-service -n dev --url
# または
kubectl port-forward -n dev svc/todo-api-service 8080:80
curl http://localhost:8080/todos
```

---

## Step 7：ローリングアップデート

```bash
# イメージを v1.1.0 に更新したとする
kubectl set image deployment/todo-api \
  todo-api=your-username/todo-api:v1.1.0 \
  -n dev

# 進行確認
kubectl rollout status deployment/todo-api -n dev

# 更新中もリクエストが通るか確認
while true; do
  curl -s http://localhost:8080/todos | python3 -m json.tool | head -3
  sleep 1
done

# 更新履歴
kubectl rollout history deployment/todo-api -n dev
```

---

## Step 8：ロールバック

```bash
# 何か問題があったとして、ロールバック
kubectl rollout undo deployment/todo-api -n dev

# 確認
kubectl rollout history deployment/todo-api -n dev
kubectl get pods -n dev   # Pod が新しいものに置き換わっている
```

---

## Step 9：dev と staging の分離を確認

```bash
# staging にも同じマニフェストをデプロイ
kubectl apply -f manifests/base/ -n staging

# dev と staging は別々のリソースが動く
kubectl get pods -n dev
kubectl get pods -n staging

# staging の Pod に入っても dev のリソースは見えない
kubectl exec -it <staging-pod> -n staging -- env | grep SECRET_KEY
# staging の Secret の値が表示される（dev の値ではない）
```

---

## Step 10：後片付け

```bash
kubectl delete namespace dev
kubectl delete namespace staging
```

---

## 🏆 発展課題

### 課題 1：HPA（Horizontal Pod Autoscaler）を設定する

```bash
# metrics-server を有効化（minikube）
minikube addons enable metrics-server

# HPA を作成（CPU 50% を超えたら最大 5 台までスケールアウト）
kubectl autoscale deployment todo-api \
  --cpu-percent=50 \
  --min=2 \
  --max=5 \
  -n dev

kubectl get hpa -n dev

# 負荷をかけて動作確認
kubectl run -i --tty load-gen --image=busybox -n dev -- /bin/sh
# コンテナ内で
while true; do wget -q -O- http://todo-api-service/todos; done
```

### 課題 2：Ingress でパスベースルーティングを試す

```bash
# Ingress Controller を有効化
minikube addons enable ingress

cat > manifests/dev/ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: todo-ingress
spec:
  rules:
  - host: todo.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: todo-api-service
            port:
              number: 80
EOF

kubectl apply -f manifests/dev/ingress.yaml -n dev
```

---

## ✅ 演習完了チェックリスト

- [ ] ConfigMap / Secret / Deployment / Service の 4 つを組み合わせてデプロイできた
- [ ] `kubectl rollout status` でデプロイの完了を確認できた
- [ ] ローリングアップデート中もサービスが継続していた
- [ ] ロールバックで前のバージョンに戻せた
- [ ] dev と staging で Secret の値が独立していることを確認できた

---

## Phase 5 完了！

お疲れさまでした。Phase 5 では以下を習得しました：

- K8s のアーキテクチャ（Control Plane / Worker Node）
- Pod / Deployment / Service の関係と YAML マニフェスト
- ConfigMap / Secret による設定の外部化
- PersistentVolume / PVC によるストレージ永続化
- Namespace による環境分離
- ローリングアップデートとロールバック

---

## カリキュラム全体完了！

全 5 フェーズを通じて学んだこと：

| フェーズ | 習得内容 |
|---|---|
| Phase 1 | コンテナの基礎・namespace/cgroup・docker コマンド |
| Phase 2 | Dockerfile・マルチステージビルド・レジストリ |
| Phase 3 | Compose による複数コンテナ管理・ネットワーク |
| Phase 4 | Swarm クラスタ・desired state・ローリングアップデート |
| Phase 5 | K8s アーキテクチャ・宣言的設定・本番グレードの運用 |

次のステップ：
- CKA（Certified Kubernetes Administrator）試験
- Helm によるパッケージ管理
- GitOps（ArgoCD / Flux）
- サービスメッシュ（Istio / Linkerd）
