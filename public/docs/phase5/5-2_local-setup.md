# 5-2. ローカル環境構築と kubectl

## 🎯 このユニットのゴール

- minikube または kind でローカル K8s を起動できる
- kubectl の基本操作（get / describe / apply / delete / logs）を使いこなせる
- Namespace の概念を理解できる

---

## シナリオ

> 本番の K8s クラスタを触る前に、ローカルで安全に練習しよう。  
> minikube はシングルノードの K8s を手軽に起動できる定番ツール。

---

## 1. ローカル K8s の選択肢

| ツール | 特徴 | 向いている用途 |
|---|---|---|
| minikube | VM または Docker 上で K8s を起動。GUI ダッシュボード付き | 入門・学習 |
| kind | Docker コンテナ内で K8s を起動（軽量） | CI/CD・テスト |
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

# 起動確認
minikube status
kubectl cluster-info
```

---

## 3. kubectl の基本操作

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
kubectl get pods -o wide       # Node などの詳細も表示
kubectl get pods -w            # リアルタイムで変化を監視（watch 的）

# 全リソースの一覧
kubectl get all

# 特定のラベルで絞り込む
kubectl get pods -l app=nginx

# YAML 形式で出力（現在の状態をそのまま見られる）
kubectl get pod my-pod -o yaml
```

### describe — リソースの詳細表示

```bash
kubectl describe pod my-pod
# Name / Namespace / Node / Labels / Status / Events などが表示
# "Events:" セクションがトラブルシューティングの起点になる
```

### apply — マニフェストを適用

```bash
# ファイルを適用（リソースがなければ作成・あれば更新）
kubectl apply -f deployment.yaml

# ディレクトリ内の全マニフェストを適用
kubectl apply -f ./manifests/

# 差分を確認してから適用
kubectl diff -f deployment.yaml
kubectl apply -f deployment.yaml
```

### delete — リソースの削除

```bash
kubectl delete pod my-pod
kubectl delete -f deployment.yaml   # マニフェストを使って削除
kubectl delete deployment my-app    # Deployment ごと削除
```

### logs — ログの確認

```bash
kubectl logs my-pod
kubectl logs -f my-pod             # リアルタイム
kubectl logs my-pod -c my-container  # Pod 内に複数コンテナある場合
kubectl logs --previous my-pod     # クラッシュ前のログ
```

### exec — コンテナに入る

```bash
kubectl exec -it my-pod -- bash
kubectl exec -it my-pod -- sh     # bash がない場合

# 特定コンテナを指定
kubectl exec -it my-pod -c my-container -- bash
```

---

## 4. Namespace

### 📖 用語：Namespace（名前空間）

> K8s クラスタを論理的に分割する仕組み。同じクラスタ内で環境（開発・ステージング・本番）を分離できる。

```bash
# Namespace の一覧
kubectl get namespaces
# NAME              STATUS   AGE
# default           Active   1d   ← デフォルト
# kube-system       Active   1d   ← K8s 自身のコンポーネント
# kube-public       Active   1d
# kube-node-lease   Active   1d

# Namespace を作成
kubectl create namespace dev
kubectl create namespace staging

# 特定の Namespace のリソースを操作
kubectl get pods -n kube-system    # kube-system の Pod
kubectl apply -f app.yaml -n dev   # dev Namespace に適用

# デフォルト Namespace を変更（毎回 -n を書かなくて済む）
kubectl config set-context --current --namespace=dev
```

---

## 5. コンテキスト（複数クラスタの管理）

```bash
# 利用可能なコンテキスト（クラスタ設定）を一覧
kubectl config get-contexts

# 現在のコンテキスト確認
kubectl config current-context

# コンテキストを切り替える（例: 開発 → 本番）
kubectl config use-context production-cluster
```

> **ミス防止のヒント：** 本番クラスタのコンテキストに切り替えた状態で作業するのは危険。  
> プロンプトにコンテキスト名を表示するツール（`kube-ps1`）の導入を推奨。

---

## ✅ 振り返りチェックリスト

- [ ] minikube を起動して `kubectl cluster-info` でアクセスできた
- [ ] `kubectl get / describe / apply / delete / logs / exec` を使いこなせる
- [ ] `describe` の Events セクションがトラブルシューティングの起点になることを知っている
- [ ] Namespace でリソースを分離できる
- [ ] kubectl と systemctl のコマンド対応を説明できる

---

## 次のユニット

[5-3. Pod / Deployment / Service](./5-3_core-resources.md)
