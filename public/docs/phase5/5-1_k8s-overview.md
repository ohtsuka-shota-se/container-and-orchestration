# 5-1. K8s の全体像とアーキテクチャ

## 🎯 このユニットのゴール

- K8s のアーキテクチャ（Control Plane / Node）を説明できる
- Swarm との違いを整理できる
- 宣言的設定（マニフェスト）の考え方を理解できる

---

## シナリオ

> Swarm でオーケストレーションの「感覚」は掴めた。  
> K8s は登場人物が多くて最初は混乱しやすい。  
> Swarm との対比を使いながら、全体像を整理しよう。

---

## 1. K8s とは

**Kubernetes（K8s）** は Google が社内システムで使っていたコンテナ管理の知見を OSS として公開したもの。現在は CNCF（Cloud Native Computing Foundation）が管理する。

```
K8s = Ko（K）nai（8文字）s = Kubernetes の略称
```

### Swarm との対比

| 観点 | Docker Swarm | Kubernetes |
|---|---|---|
| 設定の単位 | Service / Stack | Pod / Deployment / Service など |
| 設定方法 | `docker service create` コマンド or yaml | YAML マニフェスト（kubectl apply） |
| 最小実行単位 | タスク（コンテナ 1 つ） | Pod（1 つ以上のコンテナ） |
| ネットワーク | VIP + Routing Mesh | ClusterIP / NodePort / LoadBalancer |
| 設定管理 | Secret のみ | ConfigMap + Secret |
| ストレージ | ボリューム | PersistentVolume / PersistentVolumeClaim |

---

## 2. K8s のアーキテクチャ

```
┌────────────────────────────────────────────────────────────┐
│                     Control Plane                          │
│                                                            │
│  ┌──────────────┐  ┌──────┐  ┌───────────┐  ┌─────────┐ │
│  │ kube-apiserver│  │ etcd │  │ scheduler │  │controller│ │
│  │（唯一の窓口）  │  │(DB)  │  │（配置決定）│  │ manager  │ │
│  └──────────────┘  └──────┘  └───────────┘  └─────────┘ │
└────────────────────────────────────────────────────────────┘
            │ API
┌───────────┼──────────────────────────────────────────┐
│           │          Worker Nodes                    │
│  ┌────────▼──────────┐  ┌─────────────────────┐     │
│  │     Node 1        │  │     Node 2           │     │
│  │  ┌─────────────┐  │  │  ┌───────────────┐  │     │
│  │  │   kubelet   │  │  │  │    kubelet    │  │     │
│  │  │ kube-proxy  │  │  │  │  kube-proxy   │  │     │
│  │  │             │  │  │  │               │  │     │
│  │  │  [Pod A]    │  │  │  │  [Pod B]      │  │     │
│  │  │  [Pod A]    │  │  │  │  [Pod C]      │  │     │
│  │  └─────────────┘  │  │  └───────────────┘  │     │
│  └───────────────────┘  └─────────────────────┘     │
└─────────────────────────────────────────────────────┘
```

---

## 3. Control Plane の各コンポーネント

### 📖 kube-apiserver

> K8s の **唯一の窓口**。すべての操作（kubectl / 他コンポーネント / 外部ツール）は apiserver を通じて行われる。  
> REST API を提供しており、`kubectl` コマンドはこの API を呼ぶ CLI ツールに過ぎない。

```bash
# kubectl は内部でこういうリクエストを投げている
# GET /api/v1/namespaces/default/pods
# POST /api/v1/namespaces/default/pods
```

### 📖 etcd

> K8s の **唯一のデータストア**。クラスタの全状態（どんなリソースが存在するか）がここに保存される。  
> Raft アルゴリズムで冗長化する（Swarm の Manager 合意形成と同じ）。

> **LPIC との接続：**  
> etcd は `/etc` ディレクトリの役割に近い。  
>
> ```
> Linux: /etc/ に設定ファイルが集まる → OS 全体の状態の源泉
> K8s:   etcd に全リソースの状態が集まる → クラスタ全体の状態の源泉
>
> etcd のバックアップ = K8s クラスタのバックアップ（これを守れ）
> ```

### 📖 kube-scheduler

> 新しく作られた Pod を **どのノードで動かすか**を決める。  
> ノードのリソース量・affiniy 設定・taint/toleration などを考慮して配置先を選ぶ。

### 📖 controller manager

> **desired state と現実の差分を埋め続ける**ループ処理。  
> 「Deployment が 3 レプリカを要求しているのに 2 つしかない → 1 つ追加」のような制御を行う。

```
Loop:
  1. etcd から desired state を読む（"Pod を 3 つ動かしたい"）
  2. 現実の状態を確認（"Pod が 2 つしかない"）
  3. 差分を埋める（"Pod を 1 つ追加"）
  4. 1 に戻る（永遠に繰り返す）
```

---

## 4. Worker Node の各コンポーネント

### 📖 kubelet

> Node 上で動くエージェント。apiserver から「このノードでこの Pod を起動せよ」という指示を受け取り、実際にコンテナを起動する。  
> 定期的に Pod の状態を apiserver に報告する。

### 📖 kube-proxy

> Node 上でのネットワーク転送ルール（iptables / ipvs）を管理する。  
> Service の ClusterIP への通信を実際の Pod IP に転送する役割。

---

## 5. 宣言的設定（マニフェスト）

### 命令的 vs 宣言的

```bash
# 命令的（Swarm の docker service create に近い）
kubectl run nginx --image=nginx --replicas=3

# 宣言的（K8s の推奨スタイル）
kubectl apply -f deployment.yaml   # "この状態にしてほしい" と伝えるだけ
```

```yaml
# deployment.yaml（マニフェスト）
apiVersion: apps/v1        # APIのバージョン
kind: Deployment           # リソースの種類
metadata:
  name: nginx              # リソースの名前
spec:
  replicas: 3              # ← "3 台動かしたい" という宣言
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
```

> **宣言的設定の強み：**  
> - `kubectl apply -f` を何度実行しても同じ結果になる（**冪等性**）
> - YAML をバージョン管理（Git）に乗せられる
> - 「今の状態」と「望む状態」の差分だけを適用してくれる

> **LPIC との接続：**  
> `/etc/network/interfaces` や `/etc/fstab` に近い発想。  
>
> ```
> /etc/fstab:
>   /dev/sdb1 /data ext4 defaults 0 0
>   → "起動時に /dev/sdb1 を /data にマウントせよ" という宣言
>   → 何度 mount -a を実行しても同じ結果
>
> K8s マニフェスト:
>   replicas: 3
>   → "nginx を 3 台動かせ" という宣言
>   → 何度 kubectl apply しても同じ結果（冪等）
> ```

---

## ✅ 振り返りチェックリスト

- [ ] Control Plane の 4 つのコンポーネントと役割を説明できる
- [ ] kubelet が「apiserver → コンテナ起動」の橋渡し役であることを説明できる
- [ ] etcd が「K8s の /etc」であることを説明できる
- [ ] 宣言的設定と命令的設定の違いを説明できる
- [ ] controller manager の「ループで差分を埋め続ける」動作を説明できる

---

## 次のユニット

[5-2. ローカル環境構築と kubectl](./5-2_local-setup.md)
