# 5-4. ConfigMap / Secret / PersistentVolume

## 🎯 このユニットのゴール

- ConfigMap と Secret で設定・機密情報を外部化できる
- PersistentVolume / PersistentVolumeClaim の関係を説明できる
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
  # ファイル全体を値として持てる
  nginx.conf: |
    server {
      listen 80;
      location / {
        proxy_pass http://web:5000;
      }
    }
```

```bash
kubectl apply -f configmap.yaml
kubectl get configmap app-config
kubectl describe configmap app-config
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
        path: default.conf
```

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
# コマンドで Secret を作成
kubectl create secret generic db-secret \
  --from-literal=MYSQL_ROOT_PASSWORD=rootpass \
  --from-literal=MYSQL_PASSWORD=apppass

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
```

```yaml
# Deployment で Secret を使う
spec:
  containers:
  - name: app
    envFrom:
    - secretRef:
        name: db-secret
```

> **⚠️ セキュリティ注意：**  
> K8s の Secret は base64 エンコードされているだけで、暗号化ではない。  
> 本番環境では etcd の暗号化 or 外部シークレット管理（Vault / AWS Secrets Manager）を使う。

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

### マニフェストの例

```yaml
# pv.yaml（ローカル開発用）
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
    - ReadWriteOnce       # 1 つの Node からの読み書き
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
```

### StorageClass（自動プロビジョニング）

本番環境では毎回 PV を手作りしない。StorageClass を使えば PVC 作成時に自動で PV が作られる：

```yaml
# pvc.yaml（StorageClass を使う場合）
spec:
  storageClassName: standard   # minikube のデフォルト StorageClass
  resources:
    requests:
      storage: 5Gi
# PV を別途作らなくても自動的に作成される
```

```bash
kubectl get storageclass
# NAME                 PROVISIONER
# standard (default)   k8s.io/minikube-hostpath
```

---

## ✅ 振り返りチェックリスト

- [ ] ConfigMap と Secret の使い分けを説明できる
- [ ] envFrom / env / volumeMount の 3 つの読み込み方を説明できる
- [ ] Secret が base64 エンコードであって暗号化ではないことを説明できる
- [ ] PV と PVC の役割分担を LVM との対比で説明できる
- [ ] `kubectl get pvc` で STATUS が Bound になったことを確認できる

---

## 次のユニット

[5-5. シナリオ演習](./5-5_scenario.md)
