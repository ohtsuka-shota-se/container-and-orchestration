# コンテナ・オーケストレーション ハンズオンカリキュラム

Docker のコンテナ基礎からはじめ、イメージ作成・Docker Compose・Docker Swarm・Kubernetes まで、
段階的にコンテナ技術の実務スキルを習得するハンズオンカリキュラム。

## 📖 カリキュラムビューア

👉 **https://ohtsuka-shota-se.github.io/container-and-orchestration/**

カリキュラムビューアを見ながら学習を進めてください。

## 📁 構成

```
container-and-orchestration/
├── public/
│   └── docs/                        # カリキュラム本体（Markdown）
│       ├── manifest.json            # ナビゲーション定義
│       ├── phase1/                  # Dockerコンテナ基礎
│       ├── phase2/                  # イメージ作成・管理
│       ├── phase3/                  # Docker Compose
│       ├── phase4/                  # Docker Swarm
│       ├── phase5/                  # Kubernetes入門
│       └── appendix/                # チートシート・用語集・補足資料
├── src/
│   └── App.jsx                      # カリキュラムビューア（Vite + React）
└── .github/
    └── workflows/
        └── deploy.yml               # 自動ビルド・デプロイ
```

## 📚 カリキュラム内容

| Phase | テーマ | 内容 |
|-------|--------|------|
| Phase 1 | Dockerコンテナ基礎 | なぜコンテナか・インストール・基本操作・シナリオ演習 |
| Phase 2 | イメージ作成・管理 | Dockerfile・マルチステージビルド・レジストリ・シナリオ演習 |
| Phase 3 | Docker Compose | Compose基礎・操作と環境変数・ネットワーク/ボリューム・シナリオ演習 |
| Phase 4 | Docker Swarm | Swarm概念・クラスタ構築・Service/スケール・Stackデプロイ・シナリオ演習 |
| Phase 5 | Kubernetes入門 | K8s全体像・ローカル環境・Pod/Deployment/Service・設定/ストレージ・シナリオ演習 |
| 補足資料 | Appendix | チートシート・用語集・トラブル対応・アーキテクチャ図集 |
