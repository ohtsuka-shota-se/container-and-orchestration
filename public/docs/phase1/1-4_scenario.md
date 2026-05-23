# 1-4. シナリオ演習

## 🎯 このユニットのゴール

- これまで学んだコマンドを組み合わせて実際の作業を完遂する
- トラブルに当たったとき自力でデバッグできる

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

# コンテナのログを確認
docker logs notice-web
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

### Step 5：後片付け

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

## 🏆 発展課題

余力がある人は以下も試してみよう。

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
ip addr                   # 独立したネットワーク
ls /                      # ファイルシステムも独立
```

---

## ✅ 演習完了チェックリスト

- [ ] Nginx コンテナを起動してブラウザからアクセスできた
- [ ] ホスト側の HTML を変更してコンテナに即反映されることを確認した
- [ ] MySQL コンテナを起動して SQL を実行できた
- [ ] コンテナ削除後もボリュームにデータが残ることを確認した
- [ ] トラブルが起きたとき `docker logs` でデバッグできた

---

## Phase 1 完了！

お疲れさまでした。Phase 1 では以下を習得しました：

- コンテナと VM の違い / namespace と cgroup の役割
- Docker Engine のアーキテクチャ
- イメージ・コンテナ・レジストリ・レイヤーの概念
- `run / stop / start / rm / exec / logs` の基本操作
- ポートマッピングとボリュームマウント

---

## 次のフェーズ

[Phase 2：イメージ作成・管理](../phase2/README.md)
