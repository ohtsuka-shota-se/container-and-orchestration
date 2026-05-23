# コマンドチートシート — Phase 1

## コンテナ操作

| コマンド | 説明 |
|---|---|
| `docker run <image>` | コンテナを作成して起動 |
| `docker run -d <image>` | バックグラウンドで起動 |
| `docker run -it <image> bash` | インタラクティブにシェルを起動 |
| `docker run --rm <image>` | 終了時にコンテナを自動削除 |
| `docker run --name <name> <image>` | 名前をつけて起動 |
| `docker ps` | 実行中のコンテナ一覧 |
| `docker ps -a` | 停止中も含む全コンテナ一覧 |
| `docker stop <ID/name>` | コンテナを停止 |
| `docker start <ID/name>` | 停止中のコンテナを起動 |
| `docker restart <ID/name>` | コンテナを再起動 |
| `docker rm <ID/name>` | コンテナを削除（停止済みのもの） |
| `docker rm -f <ID/name>` | コンテナを強制削除（実行中も可） |
| `docker exec -it <ID/name> bash` | 実行中のコンテナにシェルで入る |
| `docker exec <ID/name> <cmd>` | 実行中のコンテナでコマンドを実行 |
| `docker logs <ID/name>` | ログを表示 |
| `docker logs -f <ID/name>` | ログをリアルタイムで表示 |
| `docker inspect <ID/name>` | コンテナの詳細情報（JSON） |
| `docker stats` | リソース使用状況をリアルタイムで表示 |

## ポートマッピング

| コマンド | 説明 |
|---|---|
| `docker run -p 8080:80 <image>` | ホスト:8080 → コンテナ:80 |
| `docker run -p 127.0.0.1:8080:80 <image>` | ループバックのみバインド |
| `docker run -P <image>` | EXPOSE されたポートにランダムマッピング |

## ボリューム

| コマンド | 説明 |
|---|---|
| `docker run -v /host/path:/container/path <image>` | バインドマウント |
| `docker run -v myvolume:/container/path <image>` | 名前付きボリューム |
| `docker run -v /container/path <image>` | 匿名ボリューム |
| `docker volume ls` | ボリューム一覧 |
| `docker volume create <name>` | ボリュームを作成 |
| `docker volume inspect <name>` | ボリュームの詳細 |
| `docker volume rm <name>` | ボリュームを削除 |
| `docker volume prune` | 未使用ボリュームを削除 |

## イメージ操作

| コマンド | 説明 |
|---|---|
| `docker images` | ローカルのイメージ一覧 |
| `docker pull <image>:<tag>` | イメージをダウンロード |
| `docker rmi <image>` | イメージを削除 |
| `docker image prune` | 未使用（dangling）イメージを削除 |
| `docker history <image>` | イメージのレイヤー履歴 |
| `docker image inspect <image>` | イメージの詳細情報 |

## クリーンアップ

| コマンド | 説明 |
|---|---|
| `docker container prune` | 停止中の全コンテナを削除 |
| `docker image prune` | 未使用イメージを削除 |
| `docker volume prune` | 未使用ボリュームを削除 |
| `docker network prune` | 未使用ネットワークを削除 |
| `docker system prune` | 上記すべてをまとめて実行 |
| `docker system prune -a` | 使用中でないものをすべて削除（注意） |
| `docker system df` | ディスク使用量を表示 |

## よく使うオプションまとめ

| オプション | 意味 |
|---|---|
| `-d` | バックグラウンド実行（detach） |
| `-i` | 標準入力を開く（interactive） |
| `-t` | 疑似 TTY を割り当て |
| `-p <host>:<container>` | ポートマッピング |
| `-v <host>:<container>` | ボリュームマウント |
| `-e KEY=VALUE` | 環境変数を渡す |
| `--name <name>` | コンテナ名を指定 |
| `--rm` | 終了時にコンテナを自動削除 |
| `--restart always` | 停止したら自動再起動 |
| `--restart unless-stopped` | 手動停止以外は自動再起動 |
