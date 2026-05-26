# 1-4. シナリオ演習

## 🎯 このユニットのゴール

- これまで学んだコマンドを組み合わせて実際の作業を完遂する
- トラブルに当たったとき自力でデバッグできる
- 複数コンテナをネットワークで連携させる基本パターンを実践する

---

## シナリオ A：Nginx で静的サイトを公開する

### 背景

> 社内向けのお知らせページをサクッと作って公開したい。  
> Docker を使って **ローカルで Nginx を立て、ブラウザからアクセスできる** ところまでやってみよう。

### Step 1：作業ディレクトリとHTMLの準備

```bash
mkdir -p ~/docker-practice/nginx-site
cd ~/docker-practice/nginx-site

cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>社内お知らせ</title>
</head>
<body>
  <h1>🐳 Docker で公開中</h1>
  <p>Phase 1 の演習サイトです。</p>
</body>
</html>
EOF
```

### Step 2：Nginx コンテナを起動

```bash
docker run -d \
  --name notice-web \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html:ro \
  nginx:latest
```

> **オプション解説**
> - `--name notice-web` : コンテナに名前をつける
> - `-p 8080:80` : ホストの 8080 → コンテナの 80
> - `-v $(pwd):/usr/share/nginx/html:ro` : カレントディレクトリをマウント（`:ro` は読み取り専用）

### Step 3：動作確認

```bash
# コマンドラインから確認
curl http://localhost:8080

# ブラウザで確認 → http://localhost:8080

# コンテナのログを確認（アクセスログが流れる）
docker logs notice-web
docker logs -f notice-web   # リアルタイム
```

### Step 4：HTML を更新してみる

```bash
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>社内お知らせ</title>
</head>
<body>
  <h1>🐳 更新しました！</h1>
  <p>ホスト側のファイルを変更すると即反映されます。</p>
</body>
</html>
EOF

# ブラウザをリロード → 即反映されているはず
curl http://localhost:8080
```

### Step 5：コンテナの内側を調べる

```bash
# コンテナの中に入って確認
docker exec -it notice-web bash

# コンテナ内で以下を確認
ps aux              # nginx のプロセスだけ
ls /usr/share/nginx/html/   # マウントしたファイルが見える
cat /etc/nginx/nginx.conf   # nginx の設定
hostname            # ランダムなホスト名（コンテナ ID と同じ）
exit
```

### Step 6：後片付け

```bash
docker stop notice-web
docker rm notice-web
```

### ❓ 詰まりやすいポイント

| 症状 | 原因 | 対処 |
|---|---|---|
| `port is already allocated` | 8080 ポートが他で使われている | `-p 8081:80` など別ポートを使う |
| `curl` で 403 Forbidden | index.html が存在しない or パーミッション問題 | `ls -la` でファイル確認 |
| コンテナがすぐ終了する | `-d` をつけ忘れ or エラー | `docker logs <ID>` でエラー確認 |
| マウントしたファイルが見えない | パスが相対パスになっている | `$(pwd)` を使って絶対パスにする |

---

## シナリオ B：MySQL コンテナを立てて接続する

### 背景

> アプリ開発のためにローカルで MySQL を動かしたい。  
> Docker なら `apt install mysql-server` なしに一発で立てられる。

### Step 1：MySQL コンテナを起動

```bash
docker run -d \
  --name local-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=sampledb \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0
```

### Step 2：起動確認（コンテナが Ready になるまで待つ）

```bash
# ログを見て "ready for connections" が出るまで待つ
docker logs -f local-mysql

# Ctrl+C でログを抜ける

# コンテナの状態確認
docker ps
```

### Step 3：MySQL に接続する

#### 方法①：コンテナ内の mysql クライアントを使う

```bash
docker exec -it local-mysql mysql -u appuser -papppass sampledb
```

```sql
-- 接続できたら操作してみる
SHOW DATABASES;
CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));
INSERT INTO users (name) VALUES ('Alice'), ('Bob');
SELECT * FROM users;
EXIT;
```

#### 方法②：ホストの mysql クライアントから接続（インストール済みの場合）

```bash
mysql -h 127.0.0.1 -P 3306 -u appuser -papppass sampledb
```

#### 方法③：MySQL Workbench や DBeaver などの GUI ツール

```
Host: 127.0.0.1
Port: 3306
User: appuser
Password: apppass
Database: sampledb
```

### Step 4：データの永続化を確認する

```bash
# コンテナを削除
docker rm -f local-mysql

# ボリュームは残っている
docker volume ls
# mysql-data が残っているはず

# 同じボリュームで再起動
docker run -d \
  --name local-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=sampledb \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  -p 3306:3306 \
  -v mysql-data:/var/lib/mysql \
  mysql:8.0

# 再接続してデータが残っているか確認
docker exec -it local-mysql mysql -u appuser -papppass sampledb -e "SELECT * FROM users;"
# Alice と Bob のレコードが残っている ✅
```

### Step 5：後片付け

```bash
docker rm -f local-mysql

# ボリュームも消す場合
docker volume rm mysql-data
```

### ❓ 詰まりやすいポイント

| 症状 | 原因 | 対処 |
|---|---|---|
| `Connection refused` | MySQL がまだ起動中 | `docker logs -f` でログ確認、少し待つ |
| `Access denied` | パスワードが間違い | `-e` で渡した値を再確認 |
| 既存ボリュームと環境変数が競合 | 一度作ったボリュームは初期化されない | `docker volume rm` してから再作成 |

---

## シナリオ C：2 つのコンテナをネットワークで連携させる

### 背景

> Nginx と PHP-FPM を別々のコンテナで動かし、コンテナ名で通信させてみよう。  
> Docker のカスタムネットワークを使った「コンテナ間通信」の基本パターンを学ぶ。

### Step 1：カスタムネットワークを作成

```bash
docker network create app-net

# 作成確認
docker network ls | grep app-net
```

### Step 2：バックエンドサービス（Python HTTP サーバー）を起動

```bash
# シンプルな Python HTTP サーバーをバックエンドとして使う
docker run -d \
  --name backend \
  --network app-net \
  python:3.12-slim \
  python -m http.server 8000
```

### Step 3：フロントエンド（curl を使う確認用コンテナ）を起動

```bash
# curl が使えるコンテナを起動して、backend への通信を試す
docker run -it --rm \
  --network app-net \
  curlimages/curl \
  curl http://backend:8000/

# backend というコンテナ名でアクセスできた！
# （IP アドレスを知らなくてもサービス名で通信できる）
```

### Step 4：名前解決の仕組みを確認

```bash
# ネットワークの詳細を確認
docker network inspect app-net

# 出力の "Containers" セクションに backend の IP が表示される
# {
#   "backend": {
#     "IPv4Address": "172.20.0.2/16"   ← この IP を知らなくても "backend" で通信できた
#   }
# }

# backend の中から DNS 解決を確認
docker exec backend sh -c "cat /etc/resolv.conf"
# nameserver 127.0.0.11   ← Docker の内蔵 DNS サーバー
```

### Step 5：別のネットワークからは通信できないことを確認

```bash
# 別ネットワークのコンテナを起動
docker run -d --name other-container nginx

# other-container から backend に通信しようとしても失敗する
docker exec other-container curl http://backend:8000/
# curl: (6) Could not resolve host: backend

# 理由: other-container は app-net に参加していない
```

### Step 6：後片付け

```bash
docker rm -f backend other-container
docker network rm app-net
```

### ❓ 詰まりやすいポイント

| 症状 | 原因 | 対処 |
|---|---|---|
| `Could not resolve host` | 同じネットワークに入っていない | `--network` オプションを確認 |
| `Connection refused` | バックエンドがまだ起動中 | `docker logs backend` で確認 |
| デフォルト bridge では通信できない | デフォルト bridge では DNS が効かない | カスタムネットワークを作成する |

---

## 🏆 発展課題

### 課題 1：Nginx のカスタム設定ファイルを使う

```bash
# デフォルト設定をコンテナからコピーして編集する
docker run --rm nginx cat /etc/nginx/conf.d/default.conf > ~/docker-practice/nginx.conf

# nginx.conf を編集してカスタム設定を作り、マウントして起動してみる
docker run -d \
  --name custom-nginx \
  -p 8080:80 \
  -v ~/docker-practice/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx
```

### 課題 2：コンテナの中を探索する

```bash
# ubuntu コンテナを起動してシェルに入る
docker run -it --rm ubuntu bash

# コンテナ内で以下を確認
ps aux                    # プロセスが少ない（隔離されている）
cat /etc/os-release       # ホストと違う OS
hostname                  # ランダムなホスト名
ip addr                   # 独立したネットワーク（172.x.x.x の IP）
ls /                      # ファイルシステムも独立
cat /proc/1/cmdline       # PID 1 は bash（通常はinitだが、コンテナ内では別）
```

### 課題 3：リソース制限を体感する

```bash
# メモリ 64MB に制限して stress テスト
docker run --rm --memory=64m polinux/stress stress --vm 1 --vm-bytes 128M
# OOM（Out of Memory）で kill されるはず

# 別ターミナルで状況を監視
docker stats
```

---

## ✅ 演習完了チェックリスト

- [ ] Nginx コンテナを起動してブラウザからアクセスできた
- [ ] ホスト側の HTML を変更してコンテナに即反映されることを確認した
- [ ] MySQL コンテナを起動して SQL を実行できた
- [ ] コンテナ削除後もボリュームにデータが残ることを確認した
- [ ] カスタムネットワークでコンテナ名を使って通信できた
- [ ] 別ネットワークからは通信できないことを確認した
- [ ] トラブルが起きたとき `docker logs` でデバッグできた

---

## Phase 1 完了！

お疲れさまでした。Phase 1 では以下を習得しました：

- コンテナと VM の違い / namespace と cgroup の役割
- Docker・containerd・Podman の違いと使い分け
- Docker Engine のアーキテクチャ（dockerd → containerd → runc）
- イメージ・コンテナ・レジストリ・レイヤーの概念
- Union FS（OverlayFS）によるレイヤー管理
- `run / stop / start / rm / exec / logs` の基本操作
- ポートマッピングとボリュームマウント
- カスタムネットワークによるコンテナ間通信

---

## 次のフェーズ

[Phase 2：イメージ作成・管理](../phase2/README.md)
