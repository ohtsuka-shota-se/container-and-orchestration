# 1-2. インストールとはじめの一歩

## 🎯 このユニットのゴール

- Docker Engine をインストールできる
- `docker run hello-world` を実行し、裏側の流れを説明できる
- イメージ・コンテナ・レジストリ・レイヤーの関係を図で説明できる

---

## シナリオ

> さっそくローカルに Docker をインストールして、最初のコンテナを動かしてみよう。  
> 「動いた！」で終わらず、**裏で何が起きているか** を追うのがこのユニットのポイント。

---

## 1. Docker Engine のインストール

### Ubuntu の場合（推奨環境）

```bash
# 古いバージョンの削除
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# 必要なパッケージの取得
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Docker の公式 GPG キーを追加
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# リポジトリを追加
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# インストール
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### インストール確認

```bash
sudo docker version
# Client と Server 両方表示されれば OK

sudo systemctl status docker
# Active: active (running) であることを確認
```

### sudo なしで使えるようにする

```bash
# 現在のユーザーを docker グループに追加
sudo usermod -aG docker $USER

# 一度ログアウト＆ログインして反映
# 確認
docker version
```

> **⚠️ セキュリティメモ**  
> `docker` グループへの追加は実質的に root 権限と同等。  
> 本番サーバーでの扱いには注意が必要。

---

## 2. はじめてのコンテナ起動

```bash
docker run hello-world
```

### 出力例

```
Unable to find image 'hello-world:latest' locally
latest: Pulling from library/hello-world
c1ec31eb5944: Pull complete
Digest: sha256:xxxx...
Status: Downloaded newer image for hello-world:latest

Hello from Docker!
...
```

たった 1 行のコマンドで何が起きたのか、順を追って見ていこう。

---

## 3. `docker run` の裏側

```
①  docker run hello-world
       ↓
②  Docker CLI → dockerd へ「hello-world を実行して」と要求

③  dockerd: ローカルに hello-world イメージがあるか確認
       → ない場合: Docker Hub からダウンロード（pull）

④  イメージからコンテナを作成（create）

⑤  コンテナを起動（start）
       → Hello from Docker! を出力して終了

⑥  コンテナ停止（Exited 状態に）
```

```bash
# 現在のコンテナ一覧（停止中も含む）
docker ps -a

# CONTAINER ID   IMAGE         COMMAND    STATUS                    
# a1b2c3d4e5f6   hello-world   "/hello"   Exited (0) 5 seconds ago 
```

---

## 4. 主要用語の整理

### 📖 用語：イメージ（Image）

> コンテナの **設計図** となる読み取り専用のテンプレート。  
> アプリ・ライブラリ・設定ファイルをまとめたもの。

- `docker images` で一覧確認
- `docker pull <イメージ名>` でダウンロード
- `docker rmi <イメージ名>` で削除

### 📖 用語：コンテナ（Container）

> イメージを実体化して **実行中の状態** にしたもの。  
> イメージ（設計図）から何個でも作れる。

```
イメージ（hello-world）
    ├── コンテナ A（起動・停止・削除できる）
    ├── コンテナ B
    └── コンテナ C
```

### 📖 用語：レジストリ（Registry）

> イメージを保存・配布するサーバー。  
> デフォルトは **Docker Hub**（`hub.docker.com`）。  
> 企業では社内にプライベートレジストリを立てることも多い。

```
[Docker Hub]
    library/nginx:latest
    library/mysql:8.0
    library/python:3.12
    mycompany/myapp:v1.0  ← 自分でpushしたもの
```

### 📖 用語：レイヤー（Layer）

> イメージは複数の **差分レイヤー** を積み重ねた構造になっている。  
> 同じレイヤーは複数のイメージで共有されるためディスクを節約できる。

```bash
# イメージのレイヤー構造を確認
docker image inspect hello-world
docker history nginx
```

```
nginx イメージ（例）
│
├── Layer 4: nginx の設定ファイル追加
├── Layer 3: nginx バイナリインストール
├── Layer 2: apt パッケージリスト更新
└── Layer 1: Debian ベースイメージ  ← 他のイメージと共有
```

---

## 5. イメージ・コンテナ・レジストリの関係図

```
Docker Hub（レジストリ）
┌────────────────────────────┐
│  nginx:latest              │
│  mysql:8.0                 │
│  python:3.12               │
└────────────────────────────┘
         ↓ docker pull（暗黙的に）
ローカルのイメージストア
┌────────────────────────────┐
│  nginx:latest              │
│  hello-world:latest        │
└────────────────────────────┘
         ↓ docker run
実行中のコンテナ
┌──────────┐  ┌──────────┐
│  nginx-1 │  │  nginx-2 │
│(port:80) │  │(port:81) │
└──────────┘  └──────────┘
```

---

## 6. よく使う確認コマンド

```bash
# ローカルのイメージ一覧
docker images

# 実行中のコンテナ一覧
docker ps

# 停止中も含む全コンテナ
docker ps -a

# Dockerの全体的な情報（ストレージ使用量など）
docker info

# ディスク使用量
docker system df
```

---

## ✅ 振り返りチェックリスト

- [ ] `docker run` を実行したときの 6 ステップを説明できる
- [ ] イメージとコンテナの違いを「設計図と実体」で説明できる
- [ ] レジストリがイメージの置き場であることを説明できる
- [ ] レイヤー構造のメリット（共有によるディスク節約）を説明できる
- [ ] `docker ps -a` と `docker images` の出力を読める

---

## 次のユニット

[1-3. コンテナ操作の基本](./1-3_container-basics.md)
