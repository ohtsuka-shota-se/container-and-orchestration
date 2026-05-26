# 2-3. レジストリへの push/pull

## 🎯 このユニットのゴール

- Docker Hub にイメージを push/pull できる
- タグの命名規則を理解できる
- プライベートレジストリをローカルに構築できる
- イメージの脆弱性スキャンを実行できる

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

# CI/CD ではコミットハッシュをタグにすることも
myapp:main-a1b2c3d   # ブランチ名 + コミットハッシュ
myapp:2024.11.01     # 日付ベース

# latest に依存しすぎると再現性が下がる
# 本番環境では具体的なバージョンタグを推奨
```

---

## 2. Docker Hub への push

### Docker Hub アカウントの準備

1. Docker Hub でアカウント作成
2. ローカルでログイン

```bash
docker login
# Username: your-username
# Password: your-password（または Personal Access Token）
# Login Succeeded

# パスワードではなく PAT（Personal Access Token）を使う
# Docker Hub → Account Settings → Security → New Access Token
docker login -u your-username --password-stdin
# プロンプトにトークンをペースト → Enter
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

## 3. 主要なレジストリサービス

### GitHub Container Registry（ghcr.io）

> GitHub リポジトリと連携したレジストリ。GitHub Actions との親和性が高い。

```bash
# GitHub PAT（Personal Access Token）でログイン
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# イメージにタグをつけて push
docker tag flask-app:prod ghcr.io/your-github-username/flask-app:v1.0.0
docker push ghcr.io/your-github-username/flask-app:v1.0.0

# リポジトリの Packages セクションで確認できる
```

**GitHub Actions での自動 push 例：**

```yaml
# .github/workflows/build-push.yml
name: Build and Push
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}
```

### クラウドプロバイダーのレジストリ

| サービス | URL 形式 | 特徴 |
|---|---|---|
| AWS ECR | `<account>.dkr.ecr.<region>.amazonaws.com` | IAM 連携・自動スキャン |
| GCR / Artifact Registry | `<region>-docker.pkg.dev/<project>/<repo>` | GKE との親和性 |
| Azure ACR | `<name>.azurecr.io` | AKS との親和性 |

```bash
# AWS ECR へのログイン
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.ap-northeast-1.amazonaws.com
```

---

## 4. プライベートレジストリの構築

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

### HTTPS を使ったプライベートレジストリ（本番向け）

```bash
# 本番では TLS が必要
# Let's Encrypt や自己署名証明書を用意して：
docker run -d \
  --name registry \
  -p 443:443 \
  -v /path/to/certs:/certs \
  -v registry-data:/var/lib/registry \
  -e REGISTRY_HTTP_ADDR=0.0.0.0:443 \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  registry:2
```

---

## 5. ダイジェストによるイメージの固定

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

# Dockerfile でダイジェストを使う（完全な再現性）
FROM python:3.12-slim@sha256:abc123...   # タグが変わっても同じイメージが使われる
```

---

## 6. イメージの脆弱性スキャン

### 📖 用語：脆弱性スキャン

> イメージに含まれるパッケージの既知の脆弱性（CVE）を検出する。

### Trivy によるスキャン

```bash
# Trivy のインストール（Ubuntu）
sudo apt install -y wget apt-transport-https gnupg
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | \
  sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | \
  sudo tee /etc/apt/sources.list.d/trivy.list
sudo apt update && sudo apt install trivy

# イメージのスキャン
trivy image flask-app:prod

# 出力例
# flask-app:prod (debian 12.5)
# ========================
# Total: 3 (HIGH: 1, MEDIUM: 2, LOW: 0)
#
# ┌─────────────────┬────────────────┬──────────┬───────────────┐
# │    Library      │ Vulnerability  │ Severity │   Fix Version │
# ├─────────────────┼────────────────┼──────────┼───────────────┤
# │ libssl3         │ CVE-2024-xxxx  │ HIGH     │ 3.0.11        │
# └─────────────────┴────────────────┴──────────┴───────────────┘

# CRITICAL のみ表示
trivy image --severity CRITICAL flask-app:prod

# 結果を JSON で出力
trivy image -f json -o results.json flask-app:prod
```

### Docker Scout（Docker Desktop 組み込み）

```bash
# Docker Hub / Docker Desktop がある場合
docker scout cves flask-app:prod
docker scout recommendations flask-app:prod
```

### CI/CD にスキャンを組み込む

```yaml
# GitHub Actions でのスキャン例
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'flask-app:prod'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # 脆弱性が見つかったらビルドを失敗させる
```

---

## 7. イメージのセーブ・ロード（オフライン配布）

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

# 複数イメージをまとめてセーブ
docker save flask-app:prod flask-app:dev | gzip > flask-app-all.tar.gz
```

---

## ✅ 振り返りチェックリスト

- [ ] `docker tag` でイメージに別名をつけられる
- [ ] `docker push / pull` の流れを説明できる
- [ ] タグと最終的にはダイジェストで同一性を担保する意味を説明できる
- [ ] `registry:2` でプライベートレジストリを立てられる
- [ ] `docker save / load` でオフライン配布できる
- [ ] `trivy image` でイメージの脆弱性をスキャンできる
- [ ] GHCR / ECR / GCR など主要レジストリの存在を説明できる

---

## 次のユニット

[2-4. シナリオ演習](./2-4_scenario.md)
