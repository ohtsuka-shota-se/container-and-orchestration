# 1-3. コンテナ操作の基本

## 🎯 このユニットのゴール

- コンテナのライフサイクルを操作できる
- ポートマッピングとボリュームマウントを使いこなせる
- フォアグラウンド / バックグラウンド起動の違いを理解する

---

## シナリオ

> Docker の基礎はわかった。次は実際に使えるコンテナを動かしてみよう。  
> Nginx を使って「外からアクセスできる Web サーバー」を立ち上げる。  
> ここで学ぶコマンドと概念は、この先ずっと使い続ける基本中の基本。

---

## 1. コンテナのライフサイクル

コンテナには以下の状態がある：

```
         docker run / docker start
Created ──────────────────────────→ Running
                                        │
                              docker stop / exit
                                        ↓
                                    Stopped（Exited）
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

# コンテナを停止
docker stop <コンテナIDまたは名前>

# コンテナを起動（停止済みのものを再起動）
docker start <コンテナIDまたは名前>

# コンテナを削除
docker rm <コンテナIDまたは名前>

# 停止と同時に削除（--rm フラグ）
docker run --rm nginx
```

> **💡 コンテナ ID の省略**  
> コンテナ ID は先頭数文字（他と区別できる分だけ）で指定できる。  
> `a1b2c3d4e5f6` なら `a1b` だけでも OK なことが多い。

---

## 2. フォアグラウンドとバックグラウンド

### フォアグラウンド（デフォルト）

```bash
docker run nginx
# ターミナルがコンテナに占有される
# Ctrl+C で停止
```

### バックグラウンド（`-d` オプション）

```bash
docker run -d nginx
# コンテナ ID だけ表示されてプロンプトが戻る
# a1b2c3d4e5f6abc...

# ログを確認
docker logs <コンテナID>
docker logs -f <コンテナID>   # リアルタイムでログを流す（tail -f と同じ感覚）
```

### インタラクティブモード（`-it`）

```bash
# コンテナの中に入ってシェルを使う
docker run -it ubuntu bash

# -i: 標準入力を開いたまま保持
# -t: 疑似 TTY を割り当て（ターミナルとして扱う）
```

```bash
# 実行中のコンテナに「入る」
docker exec -it <コンテナID> bash

# 1 つのコマンドだけ実行
docker exec <コンテナID> cat /etc/nginx/nginx.conf
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

# ランダムなホストポートを割り当て（-P）
docker run -d -P nginx
docker ps   # PORTS 列でどのポートが割り当てられたか確認
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

---

## 5. コンテナに名前をつける

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

## 6. 環境変数の渡し方

```bash
# -e で環境変数を渡す
docker run -d \
  --name mydb \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=myapp \
  -e MYSQL_USER=appuser \
  -e MYSQL_PASSWORD=apppass \
  mysql:8.0

# コンテナ内の環境変数を確認
docker exec mydb env
```

---

## 7. コンテナの詳細情報を調べる

```bash
# コンテナの詳細情報（JSON形式）
docker inspect <コンテナID>

# ネットワーク情報だけ抽出
docker inspect --format='{{.NetworkSettings.IPAddress}}' <コンテナID>

# リソース使用状況をリアルタイムで確認
docker stats

# 特定コンテナだけ
docker stats web-server
```

---

## 8. クリーンアップ

```bash
# 停止中の全コンテナを削除
docker container prune

# 使われていないイメージを削除
docker image prune

# 使われていないボリュームを削除
docker volume prune

# すべてまとめてクリーンアップ（注意！）
docker system prune -a
```

---

## ✅ 振り返りチェックリスト

- [ ] `run / stop / start / rm / exec` を説明なしに使える
- [ ] `-d` の意味と使いどころを説明できる
- [ ] `-p 8080:80` の左右がそれぞれ何を指すか説明できる
- [ ] バインドマウントと名前付きボリュームの使い分けを説明できる
- [ ] `docker logs -f` でリアルタイムにログを確認できる

---

## 次のユニット

[1-4. シナリオ演習](./1-4_scenario.md)
