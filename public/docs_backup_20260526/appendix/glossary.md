# 用語集

Phase 1〜5 全体を通じて登場する用語を五十音順でまとめています。  
各用語には登場フェーズを記載しています。

---

## あ行

### イメージ（Image）【Phase 1】
コンテナの設計図となる読み取り専用のテンプレート。アプリ・ライブラリ・設定ファイルをレイヤー構造でまとめたもの。`docker images` で一覧確認できる。

### オーケストレーション（Orchestration）【Phase 4・5】
複数のコンテナを自動的に管理・配置・スケーリング・復旧する仕組み。Docker Swarm や Kubernetes がオーケストレーターにあたる。

---

## か行

### カーネル（Kernel）【Phase 1】
OS の中核部分。コンテナはホスト OS のカーネルを共有する。

### クラスタ（Cluster）【Phase 4・5】
複数のノード（サーバー）をひとつの論理的な単位としてまとめたもの。

### コンテナ（Container）【Phase 1】
イメージを実体化して実行中の状態にしたもの。隔離されたプロセスとして動作する。

### コンテナランタイム（Container Runtime）【Phase 1・5】
コンテナを実際に起動・管理するソフトウェア。低レベルランタイム（runc）と高レベルランタイム（containerd）がある。

---

## さ行

### サービスディスカバリ（Service Discovery）【Phase 3・4・5】
コンテナや Pod がお互いをホスト名やサービス名で見つける仕組み。DNS ベースで実装されることが多い。

### namespace（名前空間）【Phase 1】
プロセスが「見える世界」を分離する Linux カーネルの機能。pid / net / mnt / uts / ipc / user の 6 種類がある。

---

## た行

### タグ（Tag）【Phase 2】
イメージのバージョンを識別する文字列。`nginx:latest` の `latest` 部分。省略すると `latest` が使われる。

### ダイジェスト（Digest）【Phase 2】
イメージのコンテンツから計算されたハッシュ値（SHA256）。タグは変更できるが、ダイジェストは内容が同じなら常に一定。

### dangling image【Phase 2】
タグが付いていない不要なイメージ。`docker image prune` で削除できる。

### Docker Daemon（dockerd）【Phase 1】
バックグラウンドで動き続けるサーバープロセス。Docker CLI からの命令を受け取りコンテナを管理する。

### Docker Hub【Phase 1・2】
Docker 公式のパブリックレジストリ。`hub.docker.com`。公式イメージや個人・企業のイメージが公開されている。

---

## な行

### 名前付きボリューム（Named Volume）【Phase 1】
Docker が管理するボリューム。ホストの具体的なパスを意識せずにデータを永続化できる。

---

## は行

### バインドマウント（Bind Mount）【Phase 1】
ホストの特定ディレクトリをコンテナにマウントする方法。開発中のソースコード共有に向いている。

### ビルドコンテキスト（Build Context）【Phase 2】
`docker build` 時に Docker Daemon に送信されるファイル群。Dockerfile と同じディレクトリが基本。

### ブリッジネットワーク（Bridge Network）【Phase 3】
Docker がデフォルトで作成する仮想ネットワーク。同一ブリッジ内のコンテナは互いに通信できる。

### ポートマッピング / ポートバインド【Phase 1】
コンテナ内のポートをホストのポートに紐付けること。`-p <ホスト>:<コンテナ>` で指定する。

---

## ま行

### マルチステージビルド（Multi-stage Build）【Phase 2】
1 つの Dockerfile に複数の `FROM` を使い、最終イメージのサイズを最小化するテクニック。ビルド環境と実行環境を分けられる。

### マネージャノード（Manager Node）【Phase 4】
Swarm クラスタでスケジューリングや状態管理を担うノード。Raft アルゴリズムで合意形成する。

---

## ら行

### レイヤー（Layer）【Phase 1】
イメージを構成する差分の単位。同じレイヤーは複数のイメージで共有され、ディスクを節約できる。

### レジストリ（Registry）【Phase 1・2】
イメージを保存・配布するサーバー。Docker Hub がデフォルト。企業内にプライベートレジストリを立てることもある。

### レプリカ（Replica）【Phase 4・5】
サービスやデプロイメントの同一コンテナの複製数。スケールアウトの単位。

---

## わ行

### ワーカーノード（Worker Node）【Phase 4・5】
Swarm や K8s でコンテナ（タスク・Pod）を実際に実行するノード。

---

## 英数字

### cgroup（Control Group）【Phase 1】
プロセスグループの CPU・メモリ・I/O などのリソースを制限・計測する Linux カーネルの機能。

### containerd【Phase 1・5】
コンテナのライフサイクルを管理する高レベルランタイム。Docker からも K8s からも利用される CNCF プロジェクト。

### desired state（望ましい状態）【Phase 4・5】
「レプリカを 3 つ動かし続けたい」といった宣言的な定義。オーケストレーターはこの状態を維持しようとし続ける。

### distroless【Phase 2】
OS のパッケージ管理ツールやシェルを含まない最小イメージ。攻撃面を減らしセキュリティを高められる。

### HPA（Horizontal Pod Autoscaler）【Phase 5】
CPU やメモリの使用率に応じて Pod のレプリカ数を自動で増減させる K8s の機能。

### OCI（Open Container Initiative）【Phase 1】
コンテナのイメージ形式やランタイムの仕様を標準化する業界団体。runc は OCI 仕様の参照実装。

### Raft アルゴリズム【Phase 4】
分散システムでの合意形成（リーダー選出・ログ複製）に使われるアルゴリズム。Swarm のマネージャや etcd が使用。

### runc【Phase 1】
OCI 仕様に準拠した低レベルのコンテナランタイム。Linux の namespace/cgroup を直接操作してコンテナを起動する。

### VIP（Virtual IP）【Phase 4】
Swarm のサービスに割り当てられる仮想 IP アドレス。複数のタスク（コンテナ）への負荷分散に使われる。
