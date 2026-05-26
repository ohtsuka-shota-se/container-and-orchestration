# 5-4. ConfigMap / Secret / PersistentVolume

## 🎯 このユニットのゴール

- ConfigMap と Secret で設定・機密情報を外部化できる
- PersistentVolume / PersistentVolumeClaim の関係を説明できる
- StorageClass による動的プロビジョニングを使える
- MySQL などステートフルなアプリを K8s で動かせる

---

## シナリオ

> Flask アプリのデータベース URL やパスワードをマニフェストに直書きしたくない。  
> K8s の設定管理機能を使って、イメージと設定を分離しよう。

---

## 1. ConfigMap — 設定情報の外部化

### 📖 用語：ConfigMap

> 環境変数・設定ファイルなどの**非機密な**設定情報を K8s に保存するリソース。  
> Pod から環境変数またはファイルとして読み込める。

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_HOST: "mysql-service"
  DATABASE_PORT: "3306"
  DATABASE_NAME: "myapp"
  LOG_LEVEL: "INFO"
  # ファイル全体を値として持てる
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://web:5000;
      }
    }
  app.properties: |
    spring.datasource.url=jdbc:mysql://mysql-service:3306/myapp
    logging.level.root=INFO
```

```bash
kubectl apply -f configmap.yaml
kubectl get configmap app-config
kubectl describe configmap app-config

# ConfigMap を編集
kubectl edit configmap app-config

# コマンドで作成
kubectl create configmap my-config \
  --from-literal=KEY1=VALUE1 \
  --from-literal=KEY2=VALUE2

# ファイルから作成
kubectl create configmap nginx-conf \
  --from-file=nginx.conf=/etc/nginx/nginx.conf
```

### Pod で ConfigMap を使う

```yaml
# deployment.yaml
spec:
  containers:
  - name: app
    image: flask-app:v1

    # 方法①: 環境変数として個別に読み込む
    env:
    - name: DATABASE_HOST
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: DATABASE_HOST

    # 方法②: ConfigMap の全キーを環境変数として読み込む
    envFrom:
    - configMapRef:
        name: app-config

    # 方法③: ファイルとしてマウント
    volumeMounts:
    - name: config-volume
      mountPath: /etc/nginx/conf.d
  volumes:
  - name: config-volume
    configMap:
      name: app-config
      items:
      - key: nginx.conf
        path: default.conf   # マウント先のファイル名
```

> **ConfigMap の自動更新：**  
> ボリュームとしてマウントした ConfigMap は、更新すると数分以内にコンテナ内のファイルに反映される。  
> ただし環境変数として読んだ場合は Pod の再起動が必要。

> **LPIC との接続：**  
> ConfigMap のマウントは `/etc` 以下の設定ファイルと同じ役割。
>
> ```
> Linux:   /etc/nginx/nginx.conf を編集 → nginx reload
> K8s:     ConfigMap を更新 → Pod を再起動 → 新しい設定が反映
>
> （ConfigMap をボリュームとしてマウントした場合は再起動なしで更新される場合も）
> ```

---

## 2. Secret — 機密情報の管理

### 📖 用語：Secret

> パスワード・API キー・証明書など**機密性の高い**データを保存するリソース。  
> etcd に base64 エンコードで保存される（暗号化ではないことに注意）。

```bash
# コマンドで Secret を作成（推奨：YAML に値が残らない）
kubectl create secret generic db-secret \
  --from-literal=MYSQL_ROOT_PASSWORD=rootpass \
  --from-literal=MYSQL_PASSWORD=apppass

# ファイルから Secret を作成
kubectl create secret generic tls-secret \
  --from-file=tls.crt=/path/to/cert.pem \
  --from-file=tls.key=/path/to/key.pem

# 確認
kubectl get secret db-secret
kubectl describe secret db-secret
# Data 欄の値は表示されない（マスクされる）

# base64 デコードして中身を確認（必要に応じて）
kubectl get secret db-secret -o jsonpath='{.data.MYSQL_ROOT_PASSWORD}' | base64 -d
```

```yaml
# secret.yaml で管理する場合（base64 エンコードが必要）
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  MYSQL_ROOT_PASSWORD: cm9vdHBhc3M=   # echo -n "rootpass" | base64
  MYSQL_PASSWORD: YXBwcGFzcw==
# または stringData を使うと base64 不要
stringData:
  MYSQL_ROOT_PASSWORD: "rootpass"     # 自動的に base64 エンコードされる
```

```yaml
# Deployment で Secret を使う
spec:
  containers:
  - name: app
    envFrom:
    - secretRef:
        name: db-secret
    # または個別に読み込む
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: MYSQL_PASSWORD
```

### Secret の種類

| type | 用途 |
|---|---|
| `Opaque`（デフォルト） | 任意のデータ（パスワードなど） |
| `kubernetes.io/tls` | TLS 証明書 |
| `kubernetes.io/dockerconfigjson` | プライベートレジストリの認証情報 |
| `kubernetes.io/service-account-token` | Service Account のトークン |

> **⚠️ セキュリティ注意：**  
> K8s の Secret は base64 エンコードされているだけで、暗号化ではない。  
> 本番環境では以下を検討する：
> - etcd の暗号化（Encryption at Rest）
> - 外部シークレット管理（Vault / AWS Secrets Manager / GCP Secret Manager）
> - External Secrets Operator（外部のシークレットマネージャーと K8s を同期）

---

## 3. PersistentVolume と PersistentVolumeClaim

### コンテナのデータが消える問題（再確認）

Pod が削除・再起動されるとコンテナ内のデータは消える。  
MySQL のデータを永続化するには **PersistentVolume** が必要。

### 📖 用語：PersistentVolume（PV）

> 実際のストレージ（ホストのディレクトリ・クラウドディスクなど）を K8s リソースとして抽象化したもの。  
> クラスタ管理者が用意する。

### 📖 用語：PersistentVolumeClaim（PVC）

> アプリ（Pod）側から「このくらいのストレージをください」と**要求**するリソース。  
> PV と PVC は自動的にマッチングされる。

```
PV（管理者が用意）: "10GB のディスクがここにある"
        ↕ バインド（自動マッチング）
PVC（アプリが要求）: "5GB 以上のストレージが欲しい"
        ↓ マウント
Pod のコンテナ
```

> **LPIC との接続：**  
> PV/PVC の関係は LVM と似た抽象化の考え方。
>
> ```
> LVM:
>   物理ボリューム (PV) → ボリュームグループ (VG) → 論理ボリューム (LV)
>   ← 管理者が用意 →               ← アプリが使う →
>
> K8s:
>   PersistentVolume (PV)   ←→   PersistentVolumeClaim (PVC)
>   ← 管理者が用意 →              ← アプリが使う →
>
> どちらも「物理的な詳細を隠蔽して、使う側が気にしなくていい」設計
> ```

### アクセスモード

| モード | 略称 | 説明 |
|---|---|---|
| ReadWriteOnce | RWO | 1 ノードから読み書き（最も一般的） |
| ReadOnlyMany | ROX | 複数ノードから読み取り専用 |
| ReadWriteMany | RWX | 複数ノードから読み書き（NFS, EFS など） |
| ReadWriteOncePod | RWOP | 1 Pod からのみ（K8s 1.22 以降） |

### マニフェストの例（手動 PV）

```yaml
# pv.yaml（ローカル開発用）
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv
  labels:
    type: local
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce
  reclaimPolicy: Retain   # PVC 削除後も PV を保持（Delete / Recycle も選択可）
  hostPath:
    path: /data/mysql     # minikube の Node 上のパス
```

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi        # 5GB 以上の PV を要求
  # storageClassName を指定しない場合、デフォルト StorageClass を使う
```

```yaml
# deployment.yaml で PVC をマウント
spec:
  containers:
  - name: mysql
    image: mysql:8.0
    volumeMounts:
    - name: mysql-storage
      mountPath: /var/lib/mysql
  volumes:
  - name: mysql-storage
    persistentVolumeClaim:
      claimName: mysql-pvc    # PVC の名前
```

```bash
kubectl apply -f pv.yaml
kubectl apply -f pvc.yaml
kubectl get pv
kubectl get pvc
# STATUS が Bound になれば PV と PVC がマッチした

# PVC の詳細（どの PV にバインドされているか）
kubectl describe pvc mysql-pvc
```

---

## 4. StorageClass（動的プロビジョニング）

### 📖 用語：StorageClass

> PVC 作成時に自動的に PV を作成（プロビジョニング）するための設定。  
> 本番環境ではクラスタ管理者が PV を手作りせず、StorageClass を使う。

```bash
# 利用可能な StorageClass を確認
kubectl get storageclass
# NAME                 PROVISIONER                    RECLAIMRECLAIM POLICY
# standard (default)   k8s.io/minikube-hostpath       Delete
# gold                 kubernetes.io/aws-ebs          Retain

# StorageClass の詳細
kubectl describe storageclass standard
```

```yaml
# StorageClass の例（AWS EBS）
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer   # Pod がスケジュールされるまで PV 作成を待つ
```

```yaml
# StorageClass を指定した PVC（PV を手作りしなくてよい）
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  storageClassName: fast-ssd   # または "standard"（minikube のデフォルト）
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
# PV を別途作らなくても自動的に作成される
```

---

## 5. MySQL を K8s で動かす（実践例）

```bash
mkdir -p ~/docker-practice/k8s-mysql
cd ~/docker-practice/k8s-mysql
```

```yaml
# mysql-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: mysql-secret
stringData:
  MYSQL_ROOT_PASSWORD: "rootpass"
  MYSQL_DATABASE: "myapp"
  MYSQL_USER: "appuser"
  MYSQL_PASSWORD: "apppass"
```

```yaml
# mysql-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  storageClassName: standard
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

```yaml
# mysql-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1   # MySQL は通常シングル（StatefulSet が本来推奨）
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
        envFrom:
        - secretRef:
            name: mysql-secret
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: mysql-storage
          mountPath: /var/lib/mysql
        readinessProbe:
          exec:
            command: ["mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$(MYSQL_ROOT_PASSWORD)"]
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: mysql-storage
        persistentVolumeClaim:
          claimName: mysql-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-service
spec:
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
  type: ClusterIP
```

```bash
kubectl apply -f mysql-secret.yaml
kubectl apply -f mysql-pvc.yaml
kubectl apply -f mysql-deployment.yaml

kubectl get pods
kubectl get pvc
# STATUS: Bound になったら OK

# MySQL に接続確認
kubectl exec -it <mysql-pod-name> -- mysql -u appuser -papppass myapp
```

---

## ✅ 振り返りチェックリスト

- [ ] ConfigMap と Secret の使い分けを説明できる
- [ ] envFrom / env / volumeMount の 3 つの読み込み方を説明できる
- [ ] Secret が base64 エンコードであって暗号化ではないことを説明できる
- [ ] PV と PVC の役割分担を LVM との対比で説明できる
- [ ] `kubectl get pvc` で STATUS が Bound になったことを確認できる
- [ ] StorageClass が動的プロビジョニングを実現することを説明できる
- [ ] RWO / ROX / RWX のアクセスモードの違いを説明できる
- [ ] `reclaimPolicy: Retain` と `Delete` の違いを説明できる

---

## 次のユニット

[5-5. シナリオ演習](./5-5_scenario.md)
