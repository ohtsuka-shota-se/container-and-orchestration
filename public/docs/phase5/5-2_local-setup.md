# 5-2. ローカル環境構築と kubectl

## 🎯 このユニットのゴール

- minikube または kind でローカル K8s を起動できる
- kubectl の基本操作（get / describe / apply / delete / logs）を使いこなせる
- Namespace の概念を理解できる
- kubectl のエイリアスと補完設定でタイピングを効率化できる

---

## シナリオ

> 本番の K8s クラスタを触る前に、ローカルで安全に練習しよう。  
> minikube はシングルノードの K8s を手軽に起動できる定番ツール。

---

## 1. ローカル K8s の選択肢

| ツール | 特徴 | 向いている用途 |
|---|---|---|
| minikube | VM または Docker 上で K8s を起動。GUI ダッシュボード付き | 入門・学習 |
| kind | Docker コンテナ内で K8s を起動（軽量） | CI/CD・テスト・マルチノード検証 |
| k3s | 軽量な本番グレード K8s | エッジ・IoT・本番小規模 |
| Docker Desktop | GUI から有効化できる | Mac/Windows の入門 |

---

## 2. minikube のインストールと起動

```bash
# インストール（Linux x86_64）
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# kubectl のインストール
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# minikube 起動（Docker ドライバーを使う場合）
minikube start --driver=docker

# CPUやメモリを指定して起動
minikube start --driver=docker --cpus=2 --memory=4096

# 起動確認
minikube status
kubectl cluster-info
# Kubernetes control plane is running at https://127.0.0.1:xxxxx
```

### minikube の便利コマンド

```bash
# ダッシュボードを起動（Web UI）
minikube dashboard

# アドオンの確認と有効化
minikube addons list
minikube addons enable ingress        # Ingress Controller
minikube addons enable metrics-server # HPA 用メトリクス
minikube addons enable registry       # ローカルレジストリ

# ノードのシェルに入る
minikube ssh

# minikube を停止・削除
minikube stop
minikube delete
```

---

## 3. kind によるマルチノード構成（CI/CD 向け）

```bash
# kind のインストール
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.22.0/kind-linux-amd64
sudo install kind /usr/local/bin/kind

# シングルノードクラスタの作成
kind create cluster

# マルチノードクラスタの作成（Control Plane 1 台 + Worker 2 台）
cat > kind-config.yaml << 'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
EOF

kind create cluster --name multi-node --config kind-config.yaml

# 作成されたクラスタの確認
kind get clusters
kubectl get nodes
```

---

## 4. kubectl の基本操作

> **LPIC との接続：**  
> `kubectl` は K8s の `systemctl` + `journalctl` + `ls` を合わせたようなツール。
>
> ```
> systemctl status  <service>   ≈  kubectl get / describe pod
> journalctl -u     <service>   ≈  kubectl logs <pod>
> systemctl start   <service>   ≈  kubectl apply -f
> systemctl stop    <service>   ≈  kubectl delete
> ls /etc/systemd/system/       ≈  kubectl get all
> ```

### get — リソースの一覧表示

```bash
# Pod の一覧
kubectl get pods
kubectl get pods -o wide           # Node などの詳細も表示
kubectl get pods -w                # リアルタイムで変化を監視（watch 的）
kubectl get pods --show-labels     # ラベルを表示

# 全リソースの一覧
kubectl get all
kubectl get all -A                 # 全 Namespace のリソース

# 特定のラベルで絞り込む
kubectl get pods -l app=nginx
kubectl get pods -l 'env in (prod, staging)'

# YAML 形式で出力（現在の状態をそのまま見られる）
kubectl get pod my-pod -o yaml

# JSON 形式で出力（jq と組み合わせると便利）
kubectl get pod my-pod -o json | jq '.status.podIP'

# 複数のリソースを同時に取得
kubectl get pods,services,deployments
```

### describe — リソースの詳細表示

```bash
kubectl describe pod my-pod
# Name / Namespace / Node / Labels / Status / Events などが表示
# "Events:" セクションがトラブルシューティングの起点になる

# よく見るべき箇所
kubectl describe pod my-pod | grep -A 20 "Events:"
# Normal  Scheduled → Pulled → Created → Started の順に表示されれば正常
# Warning の行があれば問題が起きている
```

### apply — マニフェストを適用

```bash
# ファイルを適用（リソースがなければ作成・あれば更新）
kubectl apply -f deployment.yaml

# ディレクトリ内の全マニフェストを適用
kubectl apply -f ./manifests/

# URL から直接適用
kubectl apply -f https://example.com/manifest.yaml

# 差分を確認してから適用（dry-run）
kubectl diff -f deployment.yaml
kubectl apply -f deployment.yaml --dry-run=client
kubectl apply -f deployment.yaml --dry-run=server   # サーバー側検証
```

### delete — リソースの削除

```bash
kubectl delete pod my-pod
kubectl delete -f deployment.yaml   # マニフェストを使って削除
kubectl delete deployment my-app    # Deployment ごと削除

# 強制削除（Terminating が終わらない時）
kubectl delete pod my-pod --force --grace-period=0

# Namespace ごと削除（中のリソースも全部消える）
kubectl delete namespace dev
```

### logs — ログの確認

```bash
kubectl logs my-pod
kubectl logs -f my-pod             # リアルタイム
kubectl logs my-pod -c my-container  # Pod 内に複数コンテナある場合
kubectl logs --previous my-pod     # クラッシュ前のログ（とても重要！）
kubectl logs -l app=nginx          # ラベルで複数 Pod のログをまとめて取得
kubectl logs my-pod --tail=100     # 末尾 100 行
kubectl logs my-pod --since=1h     # 過去 1 時間のログ
```

### exec — コンテナに入る

```bash
kubectl exec -it my-pod -- bash
kubectl exec -it my-pod -- sh     # bash がない場合

# 特定コンテナを指定
kubectl exec -it my-pod -c my-container -- bash

# コマンドを直接実行
kubectl exec my-pod -- cat /etc/config
kubectl exec my-pod -- env | grep SECRET
```

### port-forward — ローカルからアクセス

```bash
# Pod に直接アクセス
kubectl port-forward pod/my-pod 8080:80

# Service にアクセス（Pod の IP が変わっても追従）
kubectl port-forward service/my-service 8080:80

# バックグラウンドで実行
kubectl port-forward service/my-service 8080:80 &
curl http://localhost:8080
```

---

## 5. kubectl explain でドキュメントを引く

```bash
# リソースの構造を確認
kubectl explain pod
kubectl explain pod.spec
kubectl explain pod.spec.containers
kubectl explain pod.spec.containers.resources

# --recursive で全フィールドを一覧
kubectl explain deployment --recursive | head -50
```

---

## 6. Namespace

### 📖 用語：Namespace（名前空間）

> K8s クラスタを論理的に分割する仕組み。同じクラスタ内で環境（開発・ステージング・本番）を分離できる。

```bash
# Namespace の一覧
kubectl get namespaces
# NAME              STATUS   AGE
# default           Active   1d   ← デフォルト
# kube-system       Active   1d   ← K8s 自身のコンポーネント
# kube-public       Active   1d   ← 認証なしで読める公開領域
# kube-node-lease   Active   1d   ← ノードのヘルスチェック用

# Namespace を作成
kubectl create namespace dev
kubectl create namespace staging

# YAML で Namespace を作成
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    env: prod
EOF

# 特定の Namespace のリソースを操作
kubectl get pods -n kube-system    # kube-system の Pod
kubectl apply -f app.yaml -n dev   # dev Namespace に適用

# デフォルト Namespace を変更（毎回 -n を書かなくて済む）
kubectl config set-context --current --namespace=dev

# 現在の Namespace を確認
kubectl config view --minify | grep namespace
```

---

## 7. コンテキスト（複数クラスタの管理）

```bash
# 利用可能なコンテキスト（クラスタ設定）を一覧
kubectl config get-contexts

# 現在のコンテキスト確認
kubectl config current-context

# コンテキストを切り替える（例: 開発 → 本番）
kubectl config use-context production-cluster

# kubeconfig ファイルの構造（~/.kube/config）
cat ~/.kube/config
# clusters: 接続先クラスタの情報（APIサーバーのURL、証明書）
# users: 認証情報（証明書またはトークン）
# contexts: cluster + user の組み合わせ
```

> **ミス防止のヒント：** 本番クラスタのコンテキストに切り替えた状態で作業するのは危険。  
> プロンプトにコンテキスト名を表示するツール（`kube-ps1`）の導入を推奨。

```bash
# kube-ps1 の設定例（~/.bashrc）
source /path/to/kube-ps1.sh
PS1='$(kube_ps1)'$PS1
# → [⎈ production-cluster:default] $ のようにプロンプトに表示される
```

---

## 8. kubectl のエイリアスと補完設定

### コマンド補完の設定

```bash
# bash の場合（~/.bashrc に追加）
source <(kubectl completion bash)
alias k=kubectl
complete -o default -F __start_kubectl k

# zsh の場合（~/.zshrc に追加）
source <(kubectl completion zsh)
alias k=kubectl
```

### よく使うエイリアス

```bash
# ~/.bashrc または ~/.zshrc に追加

# 短縮エイリアス
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kga='kubectl get all'
alias kdp='kubectl describe pod'
alias kl='kubectl logs'
alias klf='kubectl logs -f'
alias kaf='kubectl apply -f'
alias kdf='kubectl delete -f'
alias kns='kubectl config set-context --current --namespace'   # Namespace 切り替え

# 使用例
kgp -n dev
kl -f my-pod --previous
kaf ./manifests/
kns production
```

---

## ✅ 振り返りチェックリスト

- [ ] minikube を起動して `kubectl cluster-info` でアクセスできた
- [ ] `kubectl get / describe / apply / delete / logs / exec` を使いこなせる
- [ ] `describe` の Events セクションがトラブルシューティングの起点になることを知っている
- [ ] Namespace でリソースを分離できる
- [ ] kubectl と systemctl のコマンド対応を説明できる
- [ ] `kubectl explain` でリソースのフィールドを調べられる
- [ ] `kubectl port-forward` でクラスタ内のサービスにローカルアクセスできる
- [ ] エイリアスと補完を設定してタイピングを効率化できる

---

## 次のユニット

[5-3. Pod / Deployment / Service](./5-3_core-resources.md)
