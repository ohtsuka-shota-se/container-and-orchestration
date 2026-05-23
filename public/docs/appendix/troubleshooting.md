# トラブルシューティングガイド

ハンズオン中によく発生するエラーと対処法をまとめています。

---

## 診断の基本フロー

```
エラーが起きた
    ↓
docker ps -a        # コンテナの状態を確認
    ↓
docker logs <ID>    # コンテナのログを確認
    ↓
docker inspect <ID> # 詳細情報を確認
    ↓
docker exec -it <ID> bash  # コンテナ内部に入って調査
```

---

## エラー別対処法

### `Cannot connect to the Docker daemon`

```
Error response from daemon: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.
Is the docker daemon running?
```

**原因：** Docker Daemon が起動していない

```bash
# Daemon を起動
sudo systemctl start docker

# 自動起動設定
sudo systemctl enable docker

# 状態確認
sudo systemctl status docker
```

---

### `permission denied while trying to connect to the Docker daemon`

**原因：** 現在のユーザーが `docker` グループに入っていない

```bash
# docker グループに追加
sudo usermod -aG docker $USER

# 一度ログアウトして再ログイン（必須）
exit
# 再ログイン後
docker ps   # 動作確認
```

> グループ反映には再ログインが必要。`newgrp docker` で一時的に反映させることもできる。

---

### `port is already allocated`

```
Error response from daemon: driver failed programming external connectivity:
Bind for 0.0.0.0:8080 failed: port is already allocated
```

**原因：** ホストの指定ポートが他のプロセスまたはコンテナで使用中

```bash
# どのプロセスが使っているか確認
sudo ss -tlnp | grep 8080
sudo lsof -i :8080

# 別のポートを使う
docker run -d -p 8081:80 nginx

# または使用中のコンテナを停止
docker ps   # ポートを使っているコンテナを探す
docker stop <コンテナID>
```

---

### コンテナがすぐに終了する

```bash
docker ps -a
# STATUS が "Exited (1)" や "Exited (2)" になっている
```

**原因：** コンテナ内のプロセスがエラー終了した

```bash
# ログでエラーを確認
docker logs <コンテナID>

# よくある原因
# - 必須の環境変数が渡されていない（MySQLのパスワードなど）
# - マウントしたファイルのパスが間違っている
# - コマンドの構文エラー
```

---

### `No such file or directory` でコンテナが起動しない

**原因：** バインドマウントのパスが間違っている

```bash
# マウント元のパスを確認
ls -la /path/to/host/dir

# 絶対パスで指定しているか確認
# NG: -v ./mydir:/app
# OK: -v $(pwd)/mydir:/app
# OK: -v /home/user/mydir:/app
```

---

### `403 Forbidden`（Nginx）

**原因：** マウントしたディレクトリに `index.html` がない、またはパーミッションが不正

```bash
# ファイルの存在確認
ls -la ~/mysite/

# パーミッション確認（ファイルは 644、ディレクトリは 755 が基本）
chmod 644 ~/mysite/index.html
chmod 755 ~/mysite/

# コンテナ内から確認
docker exec -it <nginx-ID> ls -la /usr/share/nginx/html/
```

---

### `Access denied for user` （MySQL）

**原因：** 接続時のユーザー名・パスワードが間違い、または起動時の環境変数と異なる

```bash
# 起動時に渡した環境変数を確認
docker inspect <コンテナID> | grep -A 20 "Env"

# root で接続を試みる
docker exec -it <コンテナID> mysql -u root -p
```

> **注意：** 既存のボリュームがある場合、環境変数を変えても初期化されない。  
> ボリュームを削除してコンテナを再作成する必要がある。

```bash
docker rm -f <コンテナID>
docker volume rm <ボリューム名>
# 再作成
docker run -d ...
```

---

### `image not found` / `pull access denied`

**原因：** イメージ名のタイポ、または存在しないタグ

```bash
# Docker Hub で正しいイメージ名・タグを確認
# https://hub.docker.com

# タグ一覧を確認（例）
docker pull nginx:         # タブ補完で確認（ターミナル依存）

# よくあるタイポ
# mysq1（数字の1） → mysql（小文字のL）
# ngnix → nginx
```

---

### コンテナは動いているがブラウザからアクセスできない

```bash
# ポートマッピングの確認
docker ps
# PORTS 列を確認: 0.0.0.0:8080->80/tcp

# curl で確認（ブラウザ前に必ず確認）
curl http://localhost:8080

# ファイアウォールの確認（リモートサーバーの場合）
sudo ufw status
sudo iptables -L -n
```

---

## デバッグに役立つコマンド集

```bash
# コンテナ内でプロセス確認
docker exec <ID> ps aux

# コンテナ内でネットワーク確認
docker exec <ID> ip addr
docker exec <ID> netstat -tlnp   # net-tools が必要な場合も

# コンテナのリソース使用状況
docker stats <ID>

# Docker のシステム全体情報
docker info
docker system df

# イベントログ（リアルタイム）
docker events
```

---

## よくある「なぜ？」

### Q. コンテナを削除したらデータが消えた

A. コンテナのファイルシステムはコンテナに紐付いているため、削除すると消える。  
永続化したいデータは **名前付きボリューム** または **バインドマウント** を使う。

### Q. docker stop と docker kill の違いは？

A. `stop` は SIGTERM を送り、コンテナにグレースフルシャットダウンの機会を与える（デフォルト 10 秒後に SIGKILL）。  
`kill` はすぐに SIGKILL を送り強制終了する。通常は `stop` を使う。

### Q. コンテナを再起動すると IP アドレスが変わることがある？

A. デフォルトでは変わる場合がある。Compose や Swarm では **サービス名で名前解決** するので IP を意識しなくてよい。
