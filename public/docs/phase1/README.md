# Phase 1：Dockerコンテナ基礎

## カリキュラム全体

| フェーズ | テーマ | 想定時間 | ステータス |
|---|---|---|---|
| **Phase 1** | **Dockerコンテナ基礎** | **6〜8 時間** | ✅ 公開中 |
| Phase 2 | イメージ作成・管理 | 4〜6 時間 | ✅ 公開中 |
| Phase 3 | Docker Compose | 4〜6 時間 | ✅ 公開中 |
| Phase 4 | Docker Swarm | 4〜6 時間 | ✅ 公開中 |
| Phase 5 | Kubernetes 入門 | 8〜10 時間 | ✅ 公開中 |

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
container-and-orchestration/
├── hands-on/                        ← ハンズオン用ファイル（クローンして使う）
│   ├── phase2/todo-api/             （Flask API・Dockerfile）
│   ├── phase3/wordpress/            （Compose 演習）
│   ├── phase4/swarm-demo/           （Swarm Stack 演習）
│   └── phase5/k8s-todo/, k8s-mysql/ （K8s マニフェスト）
└── docs/
    ├── phase1/                      ← このフェーズ
    │   ├── README.md
    │   ├── 1-1_why-containers.md
    │   ├── 1-2_install-and-first-run.md
    │   ├── 1-3_container-basics.md
    │   └── 1-4_scenario.md
    ├── phase2/
    │   ├── README.md
    │   ├── 2-1_dockerfile.md
    │   ├── 2-2_multistage.md
    │   ├── 2-3_registry.md
    │   └── 2-4_scenario.md
    ├── phase3/
    │   ├── README.md
    │   ├── 3-1_compose-basics.md
    │   ├── 3-2_compose-operations.md
    │   ├── 3-3_networks-volumes.md
    │   └── 3-4_scenario.md
    ├── phase4/
    │   ├── README.md
    │   ├── 4-1_swarm-intro.md
    │   ├── 4-2_cluster-setup.md
    │   ├── 4-3_services.md
    │   ├── 4-4_stack.md
    │   └── 4-5_scenario.md
    ├── phase5/
    │   ├── README.md
    │   ├── 5-1_k8s-overview.md
    │   ├── 5-2_local-setup.md
    │   ├── 5-3_core-resources.md
    │   ├── 5-4_config-storage.md
    │   └── 5-5_scenario.md
    └── appendix/
        ├── cheatsheet-phase1.md
        ├── cheatsheet-phase2-5.md
        ├── architecture-diagrams.md
        ├── glossary.md
        └── troubleshooting.md
```
