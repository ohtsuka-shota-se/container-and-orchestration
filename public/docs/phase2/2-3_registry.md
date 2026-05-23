# 2-3. レジストリへの push/pull

## 🎯 このユニットのゴール

- Docker Hub にイメージを push/pull できる
- タグの命名規則を理解できる
- プライベートレジストリをローカルに構築できる

---

## シナリオ

> Flask アプリのイメージができた。次はチームに配布したい。  
> 「イメージファイルをメールで送る」は現実的でない。  
> **レジストリ** を使って「URL でいつでも取得できる」状態にしよう。

---

## 1. タグの命名規則

### 📖 用語：タグ（Tag）

> イメージのバージョンを識別する文字列。`イメージ名:タグ` の形式。

```
docker.io / library / nginx : latest
  ↑           ↑        ↑       ↑
レジストリ  名前空間  イメージ名  タグ

# docker.io と library は省略可能なのでふだんは
nginx:latest  と書く
```

### 自分のイメージのタグ命名

```
docker.io / username / flask-app : v1.0.0
              ↑           ↑           ↑
          DockerHubの  イメージ名   バージョン
          ユーザー名

# 省略すると
username/flask-app:v1.0.0
```

### バージョニングの慣習

```bash
# セマンティックバージョニング（推奨）
myapp:1.0.0   # メジャー.マイナー.パッチ
myapp:1.0     # マイナーまで（パッチは流動的）
myapp:1       # メジャーのみ（安定版を常に指す）
myapp:latest  # 最新（タグなし省略時のデフォルト）

# latest に依存しすぎると再現性が下がる
# 本番環境では具体的なバージョンタグを推奨
```

---

## 2. Docker Hub への push

### Docker Hub アカウントの準備

1. `https://hub.docker.com` でアカウント作成
2. ローカルでログイン

```bash
docker login
# Username: your-username
# Password: your-password
# Login Succeeded
```

### イメージにタグをつけて push

```bash
# 既存イメージにタグをつける（コピーではなくエイリアス）
docker tag flask-app:prod your-username/flask-app:v1.0.0

# 確認
docker images | grep flask-app
# your-username/flask-app   v1.0.0   ...

# Docker Hub に push
docker push your-username/flask-app:v1.0.0

# latest タグも push する場合
docker tag flask-app:prod your-username/flask-app:latest
docker push your-username/flask-app:latest
```

### 別のマシン / チームメンバーが pull する

```bash
# ログイン不要（public リポジトリの場合）
docker pull your-username/flask-app:v1.0.0

# そのまま実行できる
docker run -d -p 5000:5000 your-username/flask-app:v1.0.0
```

> **LPIC との接続：**  
> `docker push/pull` は `apt` のパッケージ管理と似た構造。
>
> ```
> apt:    パッケージ → パッケージリポジトリ（/etc/apt/sources.list）
> Docker: イメージ  → レジストリ（docker.io, ECR, GCRなど）
>
> apt install nginx   ≈   docker pull nginx
> dpkg -i mypackage   ≈   docker load < myimage.tar
> apt-get remove      ≈   docker rmi
> ```
>
> 「レジストリはイメージの apt リポジトリ」と捉えると役割がわかりやすい。

---

## 3. プライベートレジストリの構築

Docker Hub はパブリックだが、社内ソースコードを含むイメージを公開したくない場合がある。  
Docker 公式の `registry` イメージでプライベートレジストリを立てられる。

```bash
# レジストリサーバーを起動（ポート 5001 で公開）
docker run -d \
  --name private-registry \
  -p 5001:5000 \
  -v registry-data:/var/lib/registry \
  registry:2
```

### プライベートレジストリを使う

```bash
# タグにレジストリのアドレスを含める
docker tag flask-app:prod localhost:5001/flask-app:v1.0.0

# push（ログイン不要）
docker push localhost:5001/flask-app:v1.0.0

# pull
docker pull localhost:5001/flask-app:v1.0.0

# レジストリに保存されているイメージ一覧（API で確認）
curl http://localhost:5001/v2/_catalog
# {"repositories":["flask-app"]}

curl http://localhost:5001/v2/flask-app/tags/list
# {"name":"flask-app","tags":["v1.0.0"]}
```

### ダイジェストで確実に同じイメージを指定する

### 📖 用語：ダイジェスト（Digest）

> イメージの内容から計算された SHA256 ハッシュ。タグは後から変更できるが、ダイジェストは変わらない。

```bash
# push 時にダイジェストが表示される
docker push localhost:5001/flask-app:v1.0.0
# v1.0.0: digest: sha256:abc123def456... size: 1234

# ダイジェストで pull（本番環境での推奨）
docker pull localhost:5001/flask-app@sha256:abc123def456...

# 現在のイメージのダイジェストを確認
docker inspect --format='{{index .RepoDigests 0}}' localhost:5001/flask-app:v1.0.0
```

---

## 4. イメージのセーブ・ロード（オフライン配布）

ネットワークが使えない環境では tar ファイルで配布することもできる：

```bash
# イメージを tar ファイルに書き出す
docker save flask-app:prod | gzip > flask-app-v1.tar.gz

# サイズ確認
ls -lh flask-app-v1.tar.gz

# 別のマシンに転送して読み込む
docker load < flask-app-v1.tar.gz

# 確認
docker images | grep flask-app
```

---

## ✅ 振り返りチェックリスト

- [ ] `docker tag` でイメージに別名をつけられる
- [ ] `docker push / pull` の流れを説明できる
- [ ] タグと最終的にはダイジェストで同一性を担保する意味を説明できる
- [ ] `registry:2` でプライベートレジストリを立てられる
- [ ] `docker save / load` でオフライン配布できる

---

## 次のユニット

[2-4. シナリオ演習](./2-4_scenario.md)
