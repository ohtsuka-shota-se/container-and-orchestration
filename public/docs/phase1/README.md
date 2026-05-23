# Phase 1：Dockerコンテナ基礎

## カリキュラム全体

| フェーズ | テーマ | 想定時間 | ステータス |
|---|---|---|---|
| **Phase 1** | **Dockerコンテナ基礎** | **6〜8 時間** | ✅ 公開中 |
| Phase 2 | イメージ作成・管理 | 4〜6 時間 | 🚧 準備中 |
| Phase 3 | Docker Compose | 4〜6 時間 | 🚧 準備中 |
| Phase 4 | Docker Swarm | 4〜6 時間 | 🚧 準備中 |
| Phase 5 | Kubernetes 入門 | 8〜10 時間 | 🚧 準備中 |

**対象：** LPIC Level 1 合格者 ／ **形式：** 座学 + ハンズオン + シナリオ演習

**動作確認環境：** Ubuntu 22.04 / 24.04、Docker Engine 26.x 以降、メモリ 4GB 以上推奨

---

## シナリオ（Phase 1 全体）

> 社内の新しい開発環境を Docker で統一したい。  
> まずローカルで動かして感覚をつかもう。

---

## ユニット構成

| ユニット | タイトル | 形式 | 時間 |
|---|---|---|---|
| [1-1](./1-1_why-containers.md) | なぜコンテナなのか | 座学 | 30 分 |
| [1-2](./1-2_install-and-first-run.md) | インストールとはじめの一歩 | 座学＋ハンズオン | 60 分 |
| [1-3](./1-3_container-basics.md) | コンテナ操作の基本 | ハンズオン | 90 分 |
| [1-4](./1-4_scenario.md) | シナリオ演習 | ハンズオン | 90 分 |

---

## 習得できること

- [ ] VM とコンテナの違いを説明できる
- [ ] namespace / cgroup の役割を説明できる
- [ ] Docker Engine のアーキテクチャ（dockerd / containerd / runc）を説明できる
- [ ] イメージ・コンテナ・レジストリ・レイヤーの概念を説明できる
- [ ] `run / stop / start / rm / exec / logs` を使いこなせる
- [ ] ポートマッピング（`-p`）を設定できる
- [ ] バインドマウントと名前付きボリュームを使い分けられる

---

## 各ユニットの進め方

1. **シナリオ提示** — 実務に近い課題からスタート
2. **概念・用語解説** — なぜそうなるのかを理解する
3. **ハンズオン** — 手を動かしてコマンドを体に染み込ませる
4. **振り返りチェックリスト** — 理解度を自己確認

---

## 補足資料

| 資料 | 内容 |
|---|---|
| [コマンドチートシート](../appendix/cheatsheet-phase1.md) | よく使うコマンド早見表 |
| [アーキテクチャ図集](../appendix/architecture-diagrams.md) | 各 Phase の構成図 |
| [用語集](../appendix/glossary.md) | 全 Phase 共通の用語定義 |
| [トラブルシューティングガイド](../appendix/troubleshooting.md) | よくあるエラーと対処法 |

---

## ディレクトリ構成

```
docker-curriculum/
├── phase1/
│   ├── README.md                    ← このファイル
│   ├── 1-1_why-containers.md
│   ├── 1-2_install-and-first-run.md
│   ├── 1-3_container-basics.md
│   └── 1-4_scenario.md
└── appendix/
    ├── cheatsheet-phase1.md
    ├── architecture-diagrams.md
    ├── glossary.md
    └── troubleshooting.md
```
