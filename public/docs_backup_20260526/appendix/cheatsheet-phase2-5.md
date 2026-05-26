# コマンドチートシート — Phase 2〜5

---

## Phase 2：イメージ作成・管理

### docker build

| コマンド | 説明 |
|---|---|
| `docker build -t <name>:<tag> .` | カレントの Dockerfile でビルド |
| `docker build --no-cache -t <name> .` | キャッシュを使わずビルド |
| `docker build --target <stage> -t <name> .` | マルチステージの特定ステージまでビルド |
| `docker build -f Dockerfile.prod -t <name> .` | Dockerfile を指定 |

### イメージ操作

| コマンド | 説明 |
|---|---|
| `docker tag <src> <dst>` | イメージに別名をつける |
| `docker push <name>:<tag>` | レジストリに push |
| `docker pull <name>:<tag>` | レジストリから pull |
| `docker save <image> \| gzip > file.tar.gz` | ファイルに書き出す |
| `docker load < file.tar.gz` | ファイルから読み込む |
| `docker history <image>` | レイヤー履歴を表示 |

### 主要な Dockerfile 命令

| 命令 | 説明 |
|---|---|
| `FROM <image>` | ベースイメージ指定 |
| `WORKDIR <path>` | 作業ディレクトリ設定 |
| `COPY <src> <dst>` | ファイルをコピー |
| `RUN <cmd>` | ビルド時にコマンド実行 |
| `ENV <key>=<value>` | 環境変数を設定 |
| `EXPOSE <port>` | ポートを宣言 |
| `CMD ["cmd","arg"]` | デフォルト起動コマンド |
| `ENTRYPOINT ["cmd"]` | 必ず実行するコマンド |
| `ARG <name>` | ビルド引数（--build-arg で渡す） |
| `COPY --from=<stage>` | 別ステージからコピー |

---

## Phase 3：Docker Compose

| コマンド | 説明 |
|---|---|
| `docker compose up -d` | 全サービスをバックグラウンドで起動 |
| `docker compose down` | 全サービスを停止・削除 |
| `docker compose down -v` | ボリュームも含めて全削除 |
| `docker compose ps` | サービスの状態確認 |
| `docker compose logs -f` | ログをリアルタイムで表示 |
| `docker compose logs -f <svc>` | 特定サービスのログ |
| `docker compose exec <svc> bash` | サービスのコンテナに入る |
| `docker compose build` | イメージをリビルド |
| `docker compose up -d --build` | ビルドして起動 |
| `docker compose restart <svc>` | サービスを再起動 |
| `docker compose config` | 変数展開後の設定を確認 |
| `docker compose -f a.yaml -f b.yaml up` | 複数ファイルを指定 |
| `docker compose up -d --scale web=3` | スケールアウト |

---

## Phase 4：Docker Swarm

### クラスタ管理

| コマンド | 説明 |
|---|---|
| `docker swarm init --advertise-addr <IP>` | Swarm を初期化（Manager） |
| `docker swarm join --token <token> <IP>:2377` | クラスタに参加（Worker） |
| `docker swarm join-token manager` | Manager 用トークンを表示 |
| `docker swarm join-token worker` | Worker 用トークンを表示 |
| `docker swarm leave` | クラスタから離脱 |
| `docker node ls` | 全ノードの一覧 |
| `docker node inspect <node> --pretty` | ノードの詳細 |
| `docker node update --availability drain <node>` | メンテナンス（タスク退避） |
| `docker node update --availability active <node>` | 通常稼働に戻す |
| `docker node update --label-add key=val <node>` | ラベルを追加 |
| `docker node rm <node>` | ノードを削除 |

### Service 管理

| コマンド | 説明 |
|---|---|
| `docker service create --name <n> --replicas <r> <image>` | サービス作成 |
| `docker service ls` | サービス一覧 |
| `docker service ps <svc>` | タスク（コンテナ）一覧 |
| `docker service inspect <svc> --pretty` | サービスの詳細 |
| `docker service logs -f <svc>` | ログ |
| `docker service scale <svc>=<n>` | スケール変更 |
| `docker service update --image <img> <svc>` | イメージ更新 |
| `docker service rollback <svc>` | ロールバック |
| `docker service rm <svc>` | サービス削除 |

### Stack 管理

| コマンド | 説明 |
|---|---|
| `docker stack deploy -c compose.yaml <stack>` | Stack をデプロイ |
| `docker stack ls` | Stack 一覧 |
| `docker stack services <stack>` | Stack 内のサービス一覧 |
| `docker stack ps <stack>` | Stack 内のタスク一覧 |
| `docker stack rm <stack>` | Stack を削除 |

### Secret 管理

| コマンド | 説明 |
|---|---|
| `echo "val" \| docker secret create <name> -` | Secret を作成 |
| `docker secret ls` | Secret 一覧 |
| `docker secret rm <name>` | Secret を削除 |

---

## Phase 5：Kubernetes

### 基本操作

| コマンド | 説明 |
|---|---|
| `kubectl get <resource>` | リソース一覧 |
| `kubectl get <resource> -o wide` | 詳細付き一覧 |
| `kubectl get <resource> -w` | リアルタイム監視 |
| `kubectl get all -n <ns>` | Namespace 内の全リソース |
| `kubectl describe <resource> <name>` | リソースの詳細 |
| `kubectl apply -f <file.yaml>` | マニフェストを適用 |
| `kubectl apply -f <dir>/` | ディレクトリ内を一括適用 |
| `kubectl delete -f <file.yaml>` | マニフェストで削除 |
| `kubectl delete <resource> <name>` | リソースを削除 |
| `kubectl logs <pod>` | ログ表示 |
| `kubectl logs -f <pod>` | リアルタイムログ |
| `kubectl logs --previous <pod>` | クラッシュ前のログ |
| `kubectl exec -it <pod> -- bash` | コンテナに入る |
| `kubectl port-forward <pod> <local>:<remote>` | ポートフォワード |
| `kubectl port-forward svc/<svc> <local>:<remote>` | Service をフォワード |

### Deployment 操作

| コマンド | 説明 |
|---|---|
| `kubectl set image deployment/<name> <container>=<image>` | イメージ更新 |
| `kubectl rollout status deployment/<name>` | 更新の進行確認 |
| `kubectl rollout history deployment/<name>` | 更新履歴 |
| `kubectl rollout undo deployment/<name>` | ロールバック |
| `kubectl scale deployment/<name> --replicas=<n>` | レプリカ数変更 |

### Namespace 操作

| コマンド | 説明 |
|---|---|
| `kubectl create namespace <name>` | Namespace を作成 |
| `kubectl get namespaces` | Namespace 一覧 |
| `kubectl -n <ns> <command>` | 特定 Namespace で実行 |
| `kubectl config set-context --current --namespace=<ns>` | デフォルト NS を変更 |

### リソース確認

| コマンド | 説明 |
|---|---|
| `kubectl get pods -l app=nginx` | ラベルで絞り込み |
| `kubectl get pod <name> -o yaml` | YAML 形式で出力 |
| `kubectl top nodes` | Node のリソース使用量 |
| `kubectl top pods` | Pod のリソース使用量 |
| `kubectl get events --sort-by='.lastTimestamp'` | イベント一覧 |
