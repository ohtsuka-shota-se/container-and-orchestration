# ハンズオン用ファイル集

このディレクトリには、カリキュラムのハンズオン演習で使用するファイルをまとめています。

## 使い方

リポジトリをクローンして、対応するフェーズのディレクトリを作業フォルダとして使ってください。

```bash
git clone https://github.com/ohtsuka-shota-se/container-and-orchestration.git
cd container-and-orchestration/hands-on
```

## ディレクトリ構成

```
hands-on/
├── phase2/
│   └── todo-api/            ← Phase 2: Flask ToDo API（Dockerfile演習）
│       ├── app.py
│       ├── requirements.txt
│       ├── Dockerfile
│       └── .dockerignore
├── phase3/
│   └── wordpress/           ← Phase 3: WordPress + MySQL + phpMyAdmin
│       ├── compose.yaml
│       ├── compose.override.yaml
│       ├── .env.example
│       └── .gitignore
├── phase4/
│   └── swarm-demo/          ← Phase 4: Swarm スタック演習
│       └── compose.yaml
├── phase5/
│   ├── k8s-todo/            ← Phase 5: Flask API を K8s にデプロイ
│   │   └── manifests/
│   │       ├── base/
│   │       │   ├── configmap.yaml
│   │       │   ├── deployment.yaml
│   │       │   └── service.yaml
│   │       └── dev/
│   │           ├── service-nodeport.yaml
│   │           └── ingress.yaml
│   └── k8s-mysql/           ← Phase 5: MySQL を K8s で動かす演習
│       ├── mysql-secret.yaml
│       ├── mysql-pvc.yaml
│       └── mysql-deployment.yaml
└── appendix/
    └── zabbix-study/        ← 補足: Zabbix によるコンテナ監視ハンズオン
        ├── zabbix-server-compose.yaml
        └── zabbix-agent-compose.yaml
```

## Phase ごとの対応

| フェーズ | ディレクトリ | 対応ユニット |
|---|---|---|
| Phase 2 | `phase2/todo-api/` | 2-4 シナリオ演習 |
| Phase 3 | `phase3/wordpress/` | 3-4 シナリオ演習 |
| Phase 4 | `phase4/swarm-demo/` | 4-5 シナリオ演習 |
| Phase 5 | `phase5/k8s-todo/` | 5-5 シナリオ演習 |
| Phase 5 | `phase5/k8s-mysql/` | 5-4 ConfigMap/Secret/PV |
| 補足資料 | `appendix/zabbix-study/` | Zabbix 監視ハンズオン |

## 注意事項

- `.env.example` を `.env` にコピーしてから値を設定してください（`.env` は Git 管理対象外）
- Phase 5 の Deployment に含まれる `your-username` はご自身の Docker Hub ユーザー名に置き換えてください
- Secret はコマンドで作成するため、このリポジトリには含まれていません（セキュリティのため）
