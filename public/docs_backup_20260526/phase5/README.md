# Phase 5：Kubernetes 入門

## 概要

| 項目 | 内容 |
|---|---|
| 対象 | Phase 4 修了者 |
| 想定時間 | 8〜10 時間 |
| 形式 | 座学 + ハンズオン + シナリオ演習 |

## シナリオ（Phase 5 全体）

> Swarm でオーケストレーションの概念は掴んだ。  
> 次は業界標準の Kubernetes へ。  
> Phase 2 で作った Flask アプリを K8s にデプロイして、  
> ローリングアップデート・スケーリング・設定管理を体験しよう。

---

## ユニット構成

| ユニット | タイトル | 形式 | 時間 |
|---|---|---|---|
| [5-1](./5-1_k8s-overview.md) | K8s の全体像とアーキテクチャ | 座学 | 60 分 |
| [5-2](./5-2_local-setup.md) | ローカル環境構築と kubectl | ハンズオン | 60 分 |
| [5-3](./5-3_core-resources.md) | Pod / Deployment / Service | ハンズオン | 90 分 |
| [5-4](./5-4_config-storage.md) | ConfigMap / Secret / PersistentVolume | ハンズオン | 60 分 |
| [5-5](./5-5_scenario.md) | シナリオ演習 | ハンズオン | 90 分 |

---

## 習得できること

- [ ] K8s のアーキテクチャ（Control Plane / Node）を説明できる
- [ ] Pod / Deployment / Service の関係を説明できる
- [ ] YAML マニフェストを書いて `kubectl apply` できる
- [ ] Deployment のローリングアップデートとロールバックを実行できる
- [ ] ConfigMap / Secret で設定を外部化できる
- [ ] Namespace で環境を分離できる

---

## 補足資料

- [コマンドチートシート](../appendix/cheatsheet-phase5.md)
- [用語集](../appendix/glossary.md)
- [トラブルシューティングガイド](../appendix/troubleshooting.md)
