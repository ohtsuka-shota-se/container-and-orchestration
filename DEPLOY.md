# GitHub 公開手順

## リポジトリ構成

```
docker-curriculum/          ← このディレクトリが Git リポジトリのルート
├── .github/
│   └── workflows/
│       └── deploy.yml      ← GitHub Actions（自動デプロイ）
├── public/
│   └── docs/               ← Markdown ファイル（教材本体）
│       ├── manifest.json   ← ナビゲーション定義
│       ├── phase1/
│       ├── phase2/
│       ├── ...
│       └── appendix/
├── src/
│   ├── App.jsx             ← ビューアー本体（React）
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js          ← base: '/docker-curriculum/' を設定済み
├── package.json
└── .gitignore
```

---

## Step 1：GitHub リポジトリを作成

1. `https://github.com/new` を開く
2. 以下を入力

   | 項目 | 値 |
   |---|---|
   | Repository name | `docker-curriculum` |
   | Visibility | Public（Pages を無料で使うため） |
   | Initialize with README | **チェックしない** |

3. **「Create repository」** をクリック

---

## Step 2：vite.config.js のリポジトリ名を確認

`vite.config.js` の `base` にリポジトリ名が入っています。
リポジトリ名を変えた場合はここを合わせてください。

```js
// vite.config.js
export default defineConfig({
  base: '/docker-curriculum/',   // ← リポジトリ名と一致させる
})
```

---

## Step 3：ローカルで Git を初期化して push

```bash
cd docker-curriculum

# Git 初期化
git init
git add .
git commit -m "initial commit"

# GitHub に接続して push（username を自分のものに変える）
git remote add origin https://github.com/<username>/docker-curriculum.git
git branch -M main
git push -u origin main
```

---

## Step 4：GitHub Pages を有効化

1. リポジトリの **「Settings」** タブを開く
2. 左メニューから **「Pages」** を選択
3. **Source** を **「GitHub Actions」** に変更

   ```
   Build and deployment
   Source: GitHub Actions   ← ここを選ぶ
   ```

4. 保存は不要（選択するだけで OK）

---

## Step 5：自動デプロイの確認

`main` ブランチに push した時点で Actions が自動起動します。

1. リポジトリの **「Actions」** タブを開く
2. **「Deploy to GitHub Pages」** ワークフローが実行中であることを確認
3. 緑のチェックマーク ✅ になったら完了

公開 URL：

```
https://<username>.github.io/docker-curriculum/
```

---

## Step 6：コンテンツを追加・更新するとき

```bash
# Markdown を編集したら
git add public/docs/
git commit -m "update phase2 content"
git push
# → Actions が自動ビルド → Pages に反映（約 1〜2 分）
```

新しいフェーズや補足ページを追加するときは
`public/docs/manifest.json` にエントリを追加するだけです。

```json
{
  "id": "phase2/2-1_dockerfile",
  "label": "2-1 Dockerfile",
  "icon": "📝"
}
```

---

## よくある問題

### ページが真っ白になる

`vite.config.js` の `base` がリポジトリ名と一致していない可能性があります。

```js
// NG: リポジトリ名が my-docker-docs の場合
base: '/docker-curriculum/'

// OK
base: '/my-docker-docs/'
```

修正後に再度 push してください。

### Actions が失敗する

「Actions」タブのログを確認してください。
よくある原因は `npm ci` のキャッシュ問題です。
Actions の画面で **「Re-run jobs」** をクリックすると解決することが多いです。

### 独自ドメインを使いたい

1. Settings → Pages → Custom domain に入力
2. `public/` 直下に `CNAME` ファイルを作成

```bash
echo "docs.example.com" > public/CNAME
git add public/CNAME
git commit -m "add custom domain"
git push
```

3. `vite.config.js` の `base` を `'/'` に変更
