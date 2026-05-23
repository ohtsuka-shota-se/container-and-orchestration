# Phase 3：Docker Compose

## 概要

| 項目 | 内容 |
|---|---|
| 対象 | Phase 2 修了者 |
| 想定時間 | 4〜6 時間 |
| 形式 | 座学 + ハンズオン + シナリオ演習 |

## シナリオ（Phase 3 全体）

> Web アプリ・DB・Redis を「1コマンドで」起動・停止できる開発環境を作りたい。  
> 手順書を渡すのではなく、`docker compose up` 一発で誰でも同じ環境を再現できる状態にしよう。

---

## ユニット構成

| ユニット | タイトル | 形式 | 時間 |
|---|---|---|---|
| [3-1](./3-1_compose-basics.md) | Compose の概念と compose.yaml | 座学＋ハンズオン | 60 分 |
| [3-2](./3-2_compose-operations.md) | Compose の操作と環境変数 | ハンズオン | 60 分 |
| [3-3](./3-3_networks-volumes.md) | ネットワークとボリューム | ハンズオン | 60 分 |
| [3-4](./3-4_scenario.md) | シナリオ演習 | ハンズオン | 90 分 |

---

## 習得できること

- [ ] compose.yaml の構造（services / networks / volumes）を書ける
- [ ] `up / down / logs / exec / ps` を使いこなせる
- [ ] 環境変数を `.env` ファイルで外部化できる
- [ ] サービス間通信（サービス名での名前解決）を説明できる
- [ ] override ファイルで開発用と本番用を切り替えられる

---

## 補足資料

- [コマンドチートシート](../appendix/cheatsheet-phase3.md)
- [用語集](../appendix/glossary.md)
- [トラブルシューティングガイド](../appendix/troubleshooting.md)
