# 1-3. コンテナ操作の基本

## 🎯 このユニットのゴール

- コンテナのライフサイクルを操作できる
- ポートマッピングとボリュームマウントを使いこなせる
- フォアグラウンド / バックグラウンド起動の違いを理解する
- コンテナのネットワーク基礎（bridge / host / none）を説明できる
- リソース制限（CPU・メモリ）を設定できる

---

## シナリオ

> Docker の基礎はわかった。次は実際に使えるコンテナを動かしてみよう。  
> Nginx を使って「外からアクセスできる Web サーバー」を立ち上げる。  
> ここで学ぶコマンドと概念は、この先ずっと使い続ける基本中の基本。

---

## 1. コンテナのライフサイクル

コンテナには以下の状態がある：

```
              docker create
  (イメージ) ──────────────────→ Created
                                    │
                             docker start
                                    ↓
         docker run ────────→ Running
                                    │
                          docker stop / exit
                                    ↓
                               Stopped（Exited）
                                    │
                             docker restart
                                    ↓
                               Running （再開）
                                    │
                              docker rm
                                    ↓
                               （削除）
```

### 基本コマンド

```bash
# コンテナを作成して起動（run = create + start）
docker run nginx

# バックグラウンドで起動（-d: detach）
docker run -d nginx

# 実行中のコンテナ一覧
docker ps

# コンテナを停止（SIGTERM を送り、10秒後に SIGKILL）
docker stop <コンテナIDまたは名前>

# 即座に強制停止（SIGKILL）
docker kill <コンテナIDまたは名前>

# コンテナを起動（停止済みのものを再起動）
docker start <コンテナIDまたは名前>

# 停止→起動（再起動）
docker restart <コンテナIDまたは名前>

# コンテナを削除（停止済みのもの）
docker rm <コンテナIDまたは名前>

# 強制停止して削除
docker rm -f <コンテナIDまたは名前>

# 停止と同時に削除（--rm フラグ）
docker run --rm nginx
```

> **💡 コンテナ ID の省略**  
> コンテナ ID は先頭数文字（他と区別できる分だけ）で指定できる。  
> `a1b2c3d4e5f6` なら `a1b` だけでも OK なことが多い。

> **LPIC との接続：**  
> `docker stop` → SIGTERM → graceful shutdown → 10秒後 SIGKILL  
> `kill -15 <PID>` と `kill -9 <PID>` の関係と同じ。  
> アプリが SIGTERM を受け取ってクリーンアップできるよう、`docker kill` ではなく `docker stop` を使うのが原則。

---

## 2. フォアグラウンドとバックグラウンド

### フォアグラウンド（デフォルト）

```bash
docker run nginx
# ターミナルがコンテナに占有される
# Ctrl+C で SIGINT を送り停止
```

### バックグラウンド（`-d` オプション）

```bash
docker run -d nginx
# コンテナ ID だけ表示されてプロンプトが戻る
# a1b2c3d4e5f6abc...

# ログを確認
docker logs <コンテナID>
docker logs -f <コンテナID>   # リアルタイムでログを流す（tail -f と同じ感覚）
docker logs --tail 50 <コンテナID>  # 末尾 50 行だけ
docker logs --since 10m <コンテナID>  # 過去 10 分のログ
```

### インタラクティブモード（`-it`）

```bash
# コンテナの中に入ってシェルを使う
docker run -it ubuntu bash

# -i: 標準入力を開いたまま保持（Interactive）
# -t: 疑似 TTY を割り当て（ターミナルとして扱う）
```

```bash
# 実行中のコンテナに「入る」
docker exec -it <コンテナID> bash

# 1 つのコマンドだけ実行
docker exec <コンテナID> cat /etc/nginx/nginx.conf

# 環境変数を追加して実行
docker exec -e DEBUG=true <コンテナID> env | grep DEBUG
```

---

## 3. ポートマッピング

### 📖 用語：ポートバインド / ポートマッピング

> コンテナ内のポートを、ホスト（自分のマシン）のポートに紐付けること。  
> `-p <ホストポート>:<コンテナポート>` で指定する。

```
ブラウザ → localhost:8080
                ↓  ポートマッピング（-p 8080:80）
         コンテナ内の nginx（ポート 80 でリッスン）
```

```bash
# ホストの 8080 番をコンテナの 80 番に紐付け
docker run -d -p 8080:80 nginx

# アクセス確認
curl http://localhost:8080
# Welcome to nginx! が返ってくれば成功

# 複数のポートをマッピング
docker run -d -p 8080:80 -p 8443:443 nginx

# ループバックのみ（127.0.0.1 からしかアクセスできない）
docker run -d -p 127.0.0.1:8080:80 nginx

# ランダムなホストポートを割り当て（-P: 大文字）
docker run -d -P nginx
docker ps   # PORTS 列でどのポートが割り当てられたか確認

# 現在のポートマッピングを確認
docker port <コンテナID>
# 80/tcp -> 0.0.0.0:32768
```

---

## 4. ボリュームマウント

### なぜボリュームが必要か

コンテナは **停止・削除するとデータが消える**。  
DB のデータやアップロードファイルなどを永続化するためにボリュームを使う。

```
コンテナ削除 → コンテナ内のデータはすべて消える ← 問題！
                   ↕ ボリュームでマウント
             ホスト or 名前付きボリューム → データは残る ✅
```

### 📖 用語：バインドマウント（Bind Mount）

> ホストの特定ディレクトリをコンテナにマウントする方法。  
> `-v <ホストのパス>:<コンテナのパス>`

```bash
# ホストのカレントディレクトリをコンテナの /usr/share/nginx/html にマウント
mkdir ~/mysite
echo "<h1>Hello from host!</h1>" > ~/mysite/index.html

docker run -d -p 8080:80 -v ~/mysite:/usr/share/nginx/html nginx

curl http://localhost:8080
# Hello from host! が返る

# ホスト側のファイルを変更するとコンテナ側にも即反映される
echo "<h1>Updated!</h1>" > ~/mysite/index.html
curl http://localhost:8080   # Updated! になっている

# 読み取り専用マウント（:ro）
docker run -d -p 8080:80 -v ~/mysite:/usr/share/nginx/html:ro nginx
# コンテナからファイルを書き換えられない
```

> **主な用途：** 開発中のソースコードをホットリロードしたいとき

### 📖 用語：名前付きボリューム（Named Volume）

> Docker が管理するボリューム。ホストの具体的なパスを意識しなくてよい。  
> `-v <ボリューム名>:<コンテナのパス>`

```bash
# 名前付きボリュームを使って MySQL を起動
docker run -d \
  --name mydb \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mydb-data:/var/lib/mysql \
  mysql:8.0

# ボリュームの一覧
docker volume ls

# ボリュームの詳細（ホストのどこに保存されているか）
docker volume inspect mydb-data
# Mountpoint: /var/lib/docker/volumes/mydb-data/_data

# コンテナを削除してもデータは残る
docker rm -f mydb

# 同じボリュームで再起動 → データが復元される
docker run -d \
  --name mydb \
  -e MYSQL_ROOT_PASSWORD=secret \
  -v mydb-data:/var/lib/mysql \
  mysql:8.0
```

> **主な用途：** DB など永続化が必要なデータ

### バインドマウント vs 名前付きボリューム

| | バインドマウント | 名前付きボリューム |
|---|---|---|
| パス指定 | ホストの絶対パス | ボリューム名だけ |
| 用途 | ソースコード共有・設定ファイル | DB データ・永続化データ |
| 可搬性 | 低い（パスに依存） | 高い |
| Docker 管理 | しない | する |
| パーミッション | ホストの権限に依存 | Docker が管理 |

### tmpfs マウント（メモリ上の一時領域）

```bash
# コンテナのメモリ上にマウント（ディスクに書かれない・コンテナ終了で消える）
docker run -d \
  --tmpfs /tmp \
  --tmpfs /run:size=100m \
  nginx

# 主な用途: 機密データの一時的な置き場・パフォーマンス向上
```

---

## 5. コンテナのネットワーク

### 📖 用語：Docker ネットワーク

> コンテナ同士、またはコンテナとホストの通信経路を管理する仕組み。

```bash
# ネットワーク一覧（インストール直後から 3 つある）
docker network ls
# NETWORK ID   NAME      DRIVER    SCOPE
# abc123       bridge    bridge    local   ← デフォルト
# def456       host      host      local
# ghi789       none      null      local
```

### ネットワークドライバの種類

| ドライバ | 説明 | 用途 |
|---|---|---|
| `bridge`（デフォルト） | 仮想スイッチ。コンテナ同士はコンテナ名では通信不可 | 単体での動作確認 |
| ユーザー定義 bridge | コンテナ名で名前解決できる | 複数コンテナ連携 |
| `host` | ホストのネットワークをそのまま使う | パフォーマンス優先時 |
| `none` | ネットワークなし（完全隔離） | セキュリティ重視 |

### カスタムネットワークで名前解決を使う

```bash
# カスタムネットワークを作成
docker network create mynet

# 同じネットワークで起動するとコンテナ名で通信できる
docker run -d --name web --network mynet nginx
docker run -d --name db --network mynet mysql:8.0 -e MYSQL_ROOT_PASSWORD=secret

# web から db に名前で ping できる
docker exec web ping db

# デフォルト bridge では名前解決できない（IP 直指定が必要）
docker run -d --name web2 nginx
docker run -d --name db2 mysql:8.0 -e MYSQL_ROOT_PASSWORD=secret
docker exec web2 ping db2  # ← 解決できない（失敗する）

# ネットワークの詳細（どのコンテナが接続しているか）
docker network inspect mynet
```

> **LPIC との接続：**  
> Docker のブリッジネットワークは Linux の `bridge` デバイスと同じ仕組み。  
> `ip addr show docker0` で Docker が作ったブリッジインターフェースを確認できる。
>
> ```bash
> ip addr show docker0
> # docker0: <BROADCAST,MULTICAST,UP,LOWER_UP>
> #     inet 172.17.0.1/16 brd 172.17.255.255
> # コンテナはこのサブネット（172.17.x.x）から IP を割り当てられる
> ```

---

## 6. コンテナに名前をつける

```bash
# --name で名前を指定（省略するとランダムな名前が自動生成される）
docker run -d --name web-server -p 8080:80 nginx

# 名前で操作できる
docker stop web-server
docker start web-server
docker logs web-server
docker rm web-server
```

---

## 7. 環境変数の渡し方

```bash
# -e で環境変数を渡す
docker run -d \
  --name mydb \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  mysql:8.0

# ファイルから一括で渡す（--env-file）
cat > myapp.env << 'EOF'
MYSQL_ROOT_PASSWORD=secret
MYSQL_DATABASE=myapp
MYSQL_USER=appuser
MYSQL_PASSWORD=apppass
EOF

docker run -d --name mydb --env-file myapp.env mysql:8.0

# コンテナ内の環境変数を確認
docker exec mydb env
```

---

## 8. リソース制限（CPU・メモリ）

```bash
# メモリ上限 256MB、スワップ禁止
docker run -d --memory 256m --memory-swap 256m nginx

# CPU 使用率を 0.5 コア相当に制限
docker run -d --cpus="0.5" nginx

# CPU のコアを指定（0番と1番のみ使用）
docker run -d --cpuset-cpus="0,1" nginx

# リアルタイムでリソース使用量を確認
docker stats
docker stats web-server   # 特定コンテナだけ
# CONTAINER ID   CPU %   MEM USAGE / LIMIT   MEM %
# a1b2...        0.1%    12MiB / 256MiB      4.7%
```

> **なぜ制限が必要か：**  
> 制限がなければ 1 つのコンテナが CPU/メモリを使い切り、他のコンテナやシステム自体が止まる。  
> cgroup（1-1 で学んだ Linux 機能）がこれを実現している。

---

## 9. コンテナの詳細情報を調べる

```bash
# コンテナの詳細情報（JSON形式）
docker inspect <コンテナID>

# ネットワーク情報だけ抽出
docker inspect --format='{{.NetworkSettings.IPAddress}}' <コンテナID>

# マウント情報
docker inspect --format='{{json .Mounts}}' <コンテナID>

# 環境変数一覧
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' <コンテナID>
```

### ホストとコンテナ間でファイルをコピー

```bash
# ホスト → コンテナ
docker cp ./myfile.txt <コンテナID>:/tmp/myfile.txt

# コンテナ → ホスト
docker cp <コンテナID>:/etc/nginx/nginx.conf ./nginx.conf

# 停止中のコンテナでも可能
```

---

## 10. クリーンアップ

```bash
# 停止中の全コンテナを削除
docker container prune

# 使われていないイメージを削除
docker image prune

# タグのないイメージ（dangling image）だけ削除
docker image prune

# 使われていないボリュームを削除
docker volume prune

# 使われていないネットワークを削除
docker network prune

# すべてまとめてクリーンアップ（注意！）
docker system prune
docker system prune -a    # イメージも含めて全削除
```

---

## ✅ 振り返りチェックリスト

- [ ] `run / stop / start / rm / exec / logs` を説明なしに使える
- [ ] `-d` の意味と使いどころを説明できる
- [ ] `-p 8080:80` の左右がそれぞれ何を指すか説明できる
- [ ] バインドマウントと名前付きボリュームの使い分けを説明できる
- [ ] `docker logs -f` でリアルタイムにログを確認できる
- [ ] カスタムネットワークを使うとコンテナ名で名前解決できる理由を説明できる
- [ ] `--memory` と `--cpus` でリソース制限ができる
- [ ] `docker cp` でファイルをコンテナと交換できる

---

## 次のユニット

[1-4. シナリオ演習](./1-4_scenario.md)
