# アーキテクチャ図集

各 Phase の構成を図でまとめています。

---

## Phase 1：Docker Engine の構造

```mermaid
flowchart TD
  Dev["👤 開発者"]
  Dockerd["🐳 Docker Daemon（dockerd）\nCLIからの命令を受け付ける\nイメージ管理・ネットワーク管理"]
  Containerd["containerd\nコンテナのライフサイクル管理\nイメージの pull / push\nスナップショット管理"]
  Runc["runc\nnamespace を設定\ncgroup を設定\nコンテナプロセスを起動"]
  Kernel["🐧 Linux カーネル\nnamespace / cgroup / OverlayFS"]

  Dev -->|"docker コマンド\nREST API（Unix Socket）"| Dockerd
  Dockerd --> Containerd
  Containerd --> Runc
  Runc --> Kernel
```

---

## Phase 1：VM vs コンテナ

### 仮想マシン

```mermaid
flowchart TB
  subgraph VM["仮想マシン"]
    direction LR
    AppA["アプリ A\nライブラリ\nGuest OS（Ubuntu）"]
    AppB["アプリ B\nライブラリ\nGuest OS（CentOS）"]
  end
  Hypervisor["Hypervisor\nKVM / VMware / VirtualBox"]
  HostOS["Host OS"]
  HW["物理ハードウェア"]

  VM --> Hypervisor --> HostOS --> HW
```

### コンテナ

```mermaid
flowchart TB
  subgraph Containers["コンテナ（ゲスト OS なし）"]
    direction LR
    CA["アプリ A\nライブラリ"]
    CB["アプリ B\nライブラリ"]
    CC["アプリ C\nライブラリ"]
  end
  Engine["🐳 Docker Engine"]
  HostOS2["Host OS（Linux）\nカーネルを全コンテナで共有"]
  HW2["物理ハードウェア"]

  Containers --> Engine --> HostOS2 --> HW2
```

---

## Phase 1：イメージ・コンテナ・レジストリの関係

```mermaid
flowchart TD
  Registry["☁️ Docker Hub（レジストリ）\nnginx:latest　mysql:8.0\npython:3.12　ubuntu:22.04"]
  LocalStore["🗄️ ローカル イメージストア\nnginx:latest\nmysql:8.0"]
  C1["📦 コンテナ①\nnginx / port:8080"]
  C2["📦 コンテナ②\nnginx / port:8081"]

  Registry -->|"docker pull（自動）"| LocalStore
  LocalStore -->|"docker run"| C1
  LocalStore -->|"docker run"| C2
```

> 同じイメージから複数のコンテナを起動できる

---

## Phase 1：レイヤー構造

```mermaid
flowchart BT
  L1_nginx["Layer 1\nDebian base\n← FROM debian:bookworm-slim"]
  L2_nginx["Layer 2\napt パッケージ\n← apt update"]
  L3_nginx["Layer 3\nnginx バイナリ\n← apt install nginx"]
  L4_nginx["Layer 4\nnginx 設定\n← デフォルト設定"]

  L1_nginx --> L2_nginx --> L3_nginx --> L4_nginx

  L1_py["Layer 1\nDebian base ★共有"]
  L2_py["Layer 2\napt パッケージ"]
  L3_py["Layer 3\nビルドツール"]
  L4_py["Layer 4\nPython バイナリ"]
  L5_py["Layer 5\npip パッケージ"]

  L1_py --> L2_py --> L3_py --> L4_py --> L5_py

  note["★ Layer 1（Debian base）は\nnginx と python で共有\n→ ストレージ節約"]
  L1_nginx -. 共有 .-> note
  L1_py -. 共有 .-> note
```

---

## Phase 1：ポートマッピング

```mermaid
flowchart LR
  Browser["🌐 ブラウザ / curl\nhttp://localhost:8080"]
  Host["Host OS\n0.0.0.0:8080"]
  Container["📦 nginx コンテナ\n0.0.0.0:80 で LISTEN"]

  Browser -->|HTTP| Host
  Host -->|"-p 8080:80"| Container
```

---

## Phase 1：ボリュームマウント

```mermaid
flowchart LR
  subgraph Bind["バインドマウント"]
    HostDir["🗂️ Host\n/home/user/mysite/\n  index.html\n  about.html"]
    ContDir["📦 コンテナ\n/usr/share/nginx/html/"]
    HostDir <-->|"変更が即反映"| ContDir
  end

  subgraph Named["名前付きボリューム"]
    Volume["🗄️ Docker 管理領域\n/var/lib/docker/volumes/mysql-data/"]
    ContDB["📦 コンテナ\n/var/lib/mysql/"]
    Volume <-->|"コンテナ削除後もデータ保持"| ContDB
  end
```

---

## Phase 3：Docker Compose 構成例

```mermaid
flowchart TB
  subgraph Project["compose.yaml Project"]
    Web["🌐 web\nnginx / port:80"]
    App["⚙️ app\n(アプリサーバー)"]
    DB["🗄️ db\nmysql"]
    Cache["⚡ cache\nredis"]
    Network(["🔗 Bridge Network\n自動生成"])
    VolDB[("📀 db-data")]
    VolCache[("📀 cache-data")]

    Web --- Network
    App --- Network
    DB --- Network
    Cache --- Network
    DB -.- VolDB
    Cache -.- VolCache
  end
```

---

## Phase 4：Docker Swarm クラスタ

```mermaid
flowchart TD
  subgraph Swarm["Swarm Cluster"]
    subgraph Managers["Manager Nodes"]
      M1["👑 Manager Node\nLeader"]
      M2["Manager Node\nFollower"]
      M1 <-->|"Raft 合意"| M2
    end
    M1 -->|"タスクをスケジュール"| W1
    M1 --> W2
    M1 --> W3
    W1["🖥️ Worker 1\n[task1]\n[task4]"]
    W2["🖥️ Worker 2\n[task2]"]
    W3["🖥️ Worker 3\n[task3]"]
  end
```

---

## Phase 5：Kubernetes アーキテクチャ

```mermaid
flowchart TD
  subgraph CP["☸️ Control Plane"]
    direction LR
    API["kube-apiserver"]
    ETCD["etcd"]
    Sched["scheduler"]
    CM["controller-manager"]
  end

  subgraph N1["🖥️ Node 1"]
    K1["kubelet / kube-proxy"]
    PA1["Pod A"]
    PA2["Pod A"]
  end

  subgraph N2["🖥️ Node 2"]
    K2["kubelet / kube-proxy"]
    PB["Pod B"]
    PC["Pod C"]
  end

  API -->|"API"| N1
  API -->|"API"| N2
```
