import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import mermaid from "mermaid";

// ── テーマ定義 ─────────────────────────────────────────────────
const DARK = {
  appBg: "#0f1923",
  sidebarBg: "#0d1520",
  sidebarBorder: "rgba(99,179,237,0.1)",
  headerBg: "#0d1520",
  footerBg: "#0d1520",
  accent: "#63b3ed",
  accentMuted: "#90cdf4",
  accentBg: "rgba(99,179,237,0.1)",
  accentBgActive: "rgba(99,179,237,0.18)",
  accentBorder: "rgba(99,179,237,0.2)",
  accentBorderLight: "rgba(99,179,237,0.15)",
  text: "#e2e8f0",
  textSub: "#cbd5e0",
  textMuted: "#a0aec0",
  textFaint: "#718096",
  textDim: "#4a5568",
  codeBg: "#0d1117",
  codeText: "#e2e8f0",
  codeHeaderBg: "rgba(99,179,237,0.1)",
  inlineCodeBg: "rgba(99,179,237,0.15)",
  inlineCodeText: "#90cdf4",
  blockquoteBg: "rgba(99,179,237,0.07)",
  blockquoteText: "#a0aec0",
  tableHeadBg: "rgba(99,179,237,0.12)",
  tableThText: "#90cdf4",
  tableTdText: "#cbd5e0",
  tableRowBorder: "rgba(255,255,255,0.05)",
  hrColor: "rgba(99,179,237,0.15)",
  strong: "#fbd38d",
  checkOn: "#68d391",
  checkOff: "#4a5568",
  progressBg: "rgba(255,255,255,0.05)",
  scrollThumb: "rgba(99,179,237,0.3)",
  mermaidBg: "#0d1117",
  mermaidBorder: "rgba(99,179,237,0.2)",
  selectBg: "rgba(99,179,237,0.08)",
  h1Color: "#63b3ed",
  h1Border: "rgba(99,179,237,0.3)",
  h2Color: "#90cdf4",
  h3Color: "#a0aec0",
  toggleBg: "rgba(99,179,237,0.1)",
  toggleBorder: "rgba(99,179,237,0.25)",
  toggleColor: "#90cdf4",
  mermaidTheme: "dark",
  mermaidVars: {
    primaryColor: "#1a365d",
    primaryTextColor: "#e2e8f0",
    primaryBorderColor: "#63b3ed",
    lineColor: "#63b3ed",
    secondaryColor: "#2d3748",
    tertiaryColor: "#1a202c",
    clusterBkg: "#1a202c",
    clusterBorder: "#63b3ed",
    titleColor: "#90cdf4",
    edgeLabelBackground: "#0d1117",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
};

const LIGHT = {
  appBg: "#f7f9fc",
  sidebarBg: "#ffffff",
  sidebarBorder: "rgba(0,0,0,0.08)",
  headerBg: "#ffffff",
  footerBg: "#ffffff",
  accent: "#2563eb",
  accentMuted: "#1d4ed8",
  accentBg: "rgba(37,99,235,0.07)",
  accentBgActive: "rgba(37,99,235,0.12)",
  accentBorder: "rgba(37,99,235,0.2)",
  accentBorderLight: "rgba(37,99,235,0.15)",
  text: "#1a202c",
  textSub: "#2d3748",
  textMuted: "#4a5568",
  textFaint: "#718096",
  textDim: "#a0aec0",
  codeBg: "#1e2030",
  codeText: "#cdd6f4",
  codeHeaderBg: "rgba(37,99,235,0.07)",
  inlineCodeBg: "rgba(37,99,235,0.08)",
  inlineCodeText: "#1d4ed8",
  blockquoteBg: "rgba(37,99,235,0.05)",
  blockquoteText: "#4a5568",
  tableHeadBg: "rgba(37,99,235,0.07)",
  tableThText: "#1d4ed8",
  tableTdText: "#2d3748",
  tableRowBorder: "rgba(0,0,0,0.05)",
  hrColor: "rgba(37,99,235,0.12)",
  strong: "#c05621",
  checkOn: "#38a169",
  checkOff: "#cbd5e0",
  progressBg: "rgba(0,0,0,0.06)",
  scrollThumb: "rgba(37,99,235,0.2)",
  mermaidBg: "#eef3fb",
  mermaidBorder: "rgba(37,99,235,0.2)",
  selectBg: "rgba(37,99,235,0.06)",
  h1Color: "#1d4ed8",
  h1Border: "rgba(37,99,235,0.2)",
  h2Color: "#2563eb",
  h3Color: "#4a5568",
  toggleBg: "rgba(37,99,235,0.07)",
  toggleBorder: "rgba(37,99,235,0.2)",
  toggleColor: "#2563eb",
  mermaidTheme: "default",
  mermaidVars: {
    primaryColor: "#dbeafe",
    primaryTextColor: "#1e3a5f",
    primaryBorderColor: "#2563eb",
    lineColor: "#2563eb",
    secondaryColor: "#eff6ff",
    tertiaryColor: "#f0f9ff",
    clusterBkg: "#f0f4ff",
    clusterBorder: "#2563eb",
    titleColor: "#1d4ed8",
    edgeLabelBackground: "#f7f9fc",
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
};

// ── ナビ定義をフェッチ ─────────────────────────────────────────
function useManifest() {
  const [nav, setNav] = useState([]);
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + "docs/manifest.json")
      .then((r) => r.json())
      .then((d) => setNav(d.nav));
  }, []);
  return nav;
}

// ── MD フェッチ ────────────────────────────────────────────────
function useDoc(id) {
  const [content, setContent] = useState(null);
  useEffect(() => {
    if (!id) return;
    setContent(null);
    fetch(import.meta.env.BASE_URL + `docs/${id}.md`)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("# エラー\nファイルを読み込めませんでした。"));
  }, [id]);
  return content;
}

// ── フラットなページリストを生成 ───────────────────────────────
function flatPages(nav) {
  return nav.flatMap((g) => g.items);
}

// ── Mermaid 図のレンダリング ───────────────────────────────────
function MermaidBlock({ code, t }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: t.mermaidTheme,
      themeVariables: t.mermaidVars,
    });
    const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
    mermaid.render(id, code)
      .then(({ svg }) => { if (ref.current) ref.current.innerHTML = svg; })
      .catch(() => { if (ref.current) ref.current.textContent = code; });
  }, [code, t]);

  return (
    <div ref={ref} style={{
      background: t.mermaidBg,
      padding: "16px 20px",
      borderRadius: 10,
      overflow: "auto",
      border: `1px solid ${t.mermaidBorder}`,
      margin: "12px 0",
      textAlign: "center",
    }} />
  );
}

// ── コードブロックのコピーボタン ───────────────────────────────
function CodeBlock({ children, lang, t }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ margin: "12px 0", borderRadius: 10, overflow: "hidden", border: `1px solid ${t.accentBorder}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: t.codeHeaderBg, padding: "4px 12px", borderBottom: `1px solid ${t.accentBorderLight}` }}>
        <span style={{ fontSize: "0.72em", color: t.accent, fontFamily: "monospace" }}>{lang || "code"}</span>
        <button onClick={copy} style={{ background: "none", border: `1px solid ${t.accentBorder}`, color: copied ? t.checkOn : t.accent, padding: "2px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.72em" }}>
          {copied ? "✓ コピー済み" : "コピー"}
        </button>
      </div>
      <pre style={{ background: t.codeBg, padding: "14px", margin: 0, overflowX: "auto", fontSize: "0.8em", lineHeight: 1.6, color: t.codeText, fontFamily: "'JetBrains Mono',monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── シミュレーター ユーティリティ ─────────────────────────────────────
const rnd = (n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
const short = (id) => id.slice(0, 12);
const pad = (s, n) => String(s).padEnd(n);
const age = () => ["2s ago","5s ago","10s ago","30s ago","1m ago"][Math.floor(Math.random()*5)];

const mkState = () => ({
  docker: {
    containers: [],
    images: [
      { id: "sha256:"+rnd(64), repository: "nginx",   tag: "latest",    size: "142MB",  created: "2 weeks ago" },
      { id: "sha256:"+rnd(64), repository: "ubuntu",  tag: "22.04",     size: "77.8MB", created: "3 weeks ago" },
      { id: "sha256:"+rnd(64), repository: "redis",   tag: "7-alpine",  size: "30.1MB", created: "1 month ago" },
      { id: "sha256:"+rnd(64), repository: "mysql",   tag: "8.0",       size: "530MB",  created: "1 month ago" },
      { id: "sha256:"+rnd(64), repository: "node",    tag: "20-alpine", size: "175MB",  created: "2 weeks ago" },
    ],
  },
  k8s: {
    namespace: "default",
    namespaces: ["default","kube-system","kube-public","monitoring"],
    pods: [],
    deployments: [],
    services: [
      { name:"kubernetes", type:"ClusterIP", clusterIP:"10.96.0.1", ports:"443/TCP", age:"30d", namespace:"default" },
    ],
    configmaps: [],
    secrets: [
      { name:"default-token", type:"kubernetes.io/service-account-token", data:"1", age:"30d", namespace:"default" },
    ],
    nodes: [
      { name:"minikube", status:"Ready", roles:"control-plane", version:"v1.28.0", age:"30d" },
    ],
  },
});

let S = mkState();

const dockerCmds = {
  ps(args) {
    const all = args.includes("-a") || args.includes("--all");
    const rows = S.docker.containers.filter(c => all || c.status.startsWith("Up"));
    const hdr = `${pad("CONTAINER ID",14)} ${pad("IMAGE",18)} ${pad("COMMAND",16)} ${pad("CREATED",12)} ${pad("STATUS",14)} ${pad("PORTS",18)} NAMES`;
    if (!rows.length) return hdr;
    return [hdr, ...rows.map(c =>
      `${pad(short(c.id),14)} ${pad(c.image,18)} ${pad('"'+c.cmd+'"',16)} ${pad(c.created,12)} ${pad(c.status,14)} ${pad(c.ports||"",18)} ${c.name}`
    )].join("\n");
  },
  run(args) {
    const detach = args.includes("-d");
    const ni = args.findIndex(a => a==="--name"); const name0 = ni!==-1 ? args[ni+1] : null;
    const pi = args.findIndex(a => a==="-p");     const port0 = pi!==-1 ? args[pi+1] : null;
    const img = args.filter(a=>!a.startsWith("-")&&a!==name0&&a!==port0).pop();
    if (!img) return "docker: invalid reference format.";
    const known = S.docker.images.flatMap(i=>[i.repository,`${i.repository}:${i.tag}`]);
    if (!known.some(k=>k===img||k.split(":")[0]===img))
      return `Unable to find image '${img}:latest' locally\nError response from daemon: manifest for ${img}:latest not found`;
    const id = rnd(64);
    const name = name0 || `${img.split(":")[0].split("/").pop()}_${rnd(4)}`;
    const cmds = {nginx:"nginx -g 'daemon off;'",ubuntu:"/bin/bash",redis:"redis-server",mysql:"mysqld",node:"node"};
    const c = { id, name, image:img, cmd:cmds[img.split(":")[0]]||"sh", created:"Just now", status:"Up "+age(), ports:port0||"" };
    S.docker.containers.push(c);
    return detach ? short(id) : `✓ Container '${name}' started (${short(id)})`;
  },
  stop(args) {
    const t=args[0]; if(!t) return '"docker stop" requires at least 1 argument.';
    const c=S.docker.containers.find(c=>c.name===t||short(c.id)===t);
    if(!c) return `Error: No such container: ${t}`;
    c.status="Exited (0) 1s ago"; return t;
  },
  start(args) {
    const t=args[0]; if(!t) return '"docker start" requires at least 1 argument.';
    const c=S.docker.containers.find(c=>c.name===t||short(c.id)===t);
    if(!c) return `Error: No such container: ${t}`;
    c.status="Up "+age(); return t;
  },
  rm(args) {
    const force=args.includes("-f");
    const t=args.filter(a=>!a.startsWith("-"))[0]; if(!t) return '"docker rm" requires at least 1 argument.';
    const idx=S.docker.containers.findIndex(c=>c.name===t||short(c.id)===t);
    if(idx===-1) return `Error: No such container: ${t}`;
    if(S.docker.containers[idx].status.startsWith("Up")&&!force)
      return `Error: You cannot remove a running container. Stop it first or use -f`;
    S.docker.containers.splice(idx,1); return t;
  },
  images() {
    const hdr=`${pad("REPOSITORY",20)} ${pad("TAG",12)} ${pad("IMAGE ID",14)} ${pad("CREATED",14)} SIZE`;
    return [hdr,...S.docker.images.map(i=>`${pad(i.repository,20)} ${pad(i.tag,12)} ${pad(short(i.id),14)} ${pad(i.created,14)} ${i.size}`)].join("\n");
  },
  pull(args) {
    const img=args[0]; if(!img) return '"docker pull" requires exactly 1 argument.';
    const exists=S.docker.images.find(i=>i.repository===img.split(":")[0]);
    if(exists) return `Status: Image is up to date for ${img}`;
    S.docker.images.push({id:"sha256:"+rnd(64),repository:img.split(":")[0],tag:img.includes(":")?img.split(":")[1]:"latest",size:"58.3MB",created:"Just now"});
    return `latest: Pulling from library/${img.split(":")[0]}\nDigest: sha256:${rnd(64)}\nStatus: Downloaded newer image for ${img}`;
  },
  logs(args) {
    const t=args.filter(a=>!a.startsWith("-"))[0]; if(!t) return '"docker logs" requires exactly 1 argument.';
    const c=S.docker.containers.find(c=>c.name===t||short(c.id)===t);
    if(!c) return `Error: No such container: ${t}`;
    const m={nginx:"10.0.0.1 - - [GET /] 200\n10.0.0.2 - - [GET /health] 200",redis:"* Ready to accept connections tcp",mysql:"[System] [MY-010931] /usr/sbin/mysqld: ready for connections."};
    return m[c.image.split(":")[0]]||`${c.name} started successfully`;
  },
  inspect(args) {
    const t=args.filter(a=>!a.startsWith("-"))[0]; if(!t) return '"docker inspect" requires at least 1 argument.';
    const c=S.docker.containers.find(c=>c.name===t||short(c.id)===t);
    if(!c) return `Error: No such object: ${t}`;
    return JSON.stringify([{Id:c.id,Name:"/"+c.name,State:{Status:c.status.startsWith("Up")?"running":"exited",Running:c.status.startsWith("Up")},Config:{Image:c.image}}],null,2);
  },
  rmi(args) {
    const t=args[0]; if(!t) return '"docker rmi" requires at least 1 argument.';
    const idx=S.docker.images.findIndex(i=>i.repository===t||`${i.repository}:${i.tag}`===t);
    if(idx===-1) return `Error: No such image: ${t}`;
    S.docker.images.splice(idx,1);
    return `Untagged: ${t}\nDeleted: sha256:${rnd(12)}`;
  },
  "--help":()=>`Usage:  docker [OPTIONS] COMMAND\n\nCommands:\n  images    List images\n  inspect   Return low-level information\n  logs      Fetch logs\n  ps        List containers\n  pull      Download an image\n  rm        Remove containers\n  rmi       Remove images\n  run       Run a command in a new container\n  start     Start stopped containers\n  stop      Stop running containers\n\nRun 'docker COMMAND --help' for more information.`,
};

const kubectlCmds = {
  get(args) {
    const ns = (() => { const i=args.findIndex(a=>a==="-n"||a==="--namespace"); return i!==-1?args[i+1]:S.k8s.namespace; })();
    const all = args.includes("--all-namespaces") || args.includes("-A");
    const res = args.filter(a=>!a.startsWith("-")&&a!==ns)[0];
    if (!res) return 'error: must specify the type of resource to get';
    if (res==="pods"||res==="pod"||res==="po") {
      const rows = S.k8s.pods.filter(p=>all||p.namespace===ns);
      const hdr = all
        ? `${pad("NAMESPACE",14)} ${pad("NAME",28)} ${pad("READY",7)} ${pad("STATUS",12)} ${pad("RESTARTS",10)} AGE`
        : `${pad("NAME",28)} ${pad("READY",7)} ${pad("STATUS",12)} ${pad("RESTARTS",10)} AGE`;
      if(!rows.length) return `${hdr}\n(no pods found in namespace "${ns}")`;
      return [hdr,...rows.map(p=>all
        ? `${pad(p.namespace,14)} ${pad(p.name,28)} ${pad(p.ready,7)} ${pad(p.status,12)} ${pad(p.restarts,10)} ${p.age}`
        : `${pad(p.name,28)} ${pad(p.ready,7)} ${pad(p.status,12)} ${pad(p.restarts,10)} ${p.age}`)].join("\n");
    }
    if (res==="deployments"||res==="deployment"||res==="deploy") {
      const rows=S.k8s.deployments.filter(d=>all||d.namespace===ns);
      const hdr=`${pad("NAME",24)} ${pad("READY",8)} ${pad("UP-TO-DATE",12)} ${pad("AVAILABLE",10)} AGE`;
      if(!rows.length) return `${hdr}\n(no deployments found)`;
      return [hdr,...rows.map(d=>`${pad(d.name,24)} ${pad(d.ready+"/"+d.replicas,8)} ${pad(d.replicas,12)} ${pad(d.available,10)} ${d.age}`)].join("\n");
    }
    if (res==="services"||res==="service"||res==="svc") {
      const rows=S.k8s.services.filter(s=>all||s.namespace===ns);
      const hdr=`${pad("NAME",20)} ${pad("TYPE",14)} ${pad("CLUSTER-IP",16)} ${pad("EXTERNAL-IP",14)} ${pad("PORT(S)",12)} AGE`;
      return [hdr,...rows.map(s=>`${pad(s.name,20)} ${pad(s.type,14)} ${pad(s.clusterIP,16)} ${pad("<none>",14)} ${pad(s.ports,12)} ${s.age}`)].join("\n");
    }
    if (res==="nodes"||res==="node"||res==="no") {
      const hdr=`${pad("NAME",14)} ${pad("STATUS",10)} ${pad("ROLES",16)} ${pad("AGE",8)} VERSION`;
      return [hdr,...S.k8s.nodes.map(n=>`${pad(n.name,14)} ${pad(n.status,10)} ${pad(n.roles,16)} ${pad(n.age,8)} ${n.version}`)].join("\n");
    }
    if (res==="namespaces"||res==="namespace"||res==="ns") {
      const hdr=`${pad("NAME",20)} ${pad("STATUS",10)} AGE`;
      return [hdr,...S.k8s.namespaces.map(n=>`${pad(n,20)} ${pad("Active",10)} 30d`)].join("\n");
    }
    if (res==="configmaps"||res==="configmap"||res==="cm") {
      const rows=S.k8s.configmaps.filter(c=>all||c.namespace===ns);
      const hdr=`${pad("NAME",24)} ${pad("DATA",6)} AGE`;
      if(!rows.length) return `${hdr}\n(no configmaps found)`;
      return [hdr,...rows.map(c=>`${pad(c.name,24)} ${pad(c.data,6)} ${c.age}`)].join("\n");
    }
    if (res==="secrets"||res==="secret") {
      const rows=S.k8s.secrets.filter(s=>all||s.namespace===ns);
      const hdr=`${pad("NAME",24)} ${pad("TYPE",40)} ${pad("DATA",6)} AGE`;
      return [hdr,...rows.map(s=>`${pad(s.name,24)} ${pad(s.type,40)} ${pad(s.data,6)} ${s.age}`)].join("\n");
    }
    return `error: the server doesn't have a resource type "${res}"`;
  },
  apply(args) {
    const fi=args.findIndex(a=>a==="-f"); const file=fi!==-1?args[fi+1]:null;
    if(!file) return 'error: must specify one of -f and -k';
    if(file.includes("deploy")||file.includes("deployment")) {
      const name=file.replace(/\.ya?ml$/,"").replace(/.*\//,"").replace("deployment-","").replace("-deploy","");
      const ns=S.k8s.namespace;
      const exists=S.k8s.deployments.find(d=>d.name===name&&d.namespace===ns);
      const replicas=1;
      if(exists){ exists.ready=replicas; exists.available=replicas; return `deployment.apps/${name} configured`; }
      const podName=`${name}-${rnd(5)}-${rnd(5)}`;
      S.k8s.deployments.push({name,namespace:ns,replicas,ready:replicas,available:replicas,age:"0s"});
      S.k8s.pods.push({name:podName,namespace:ns,ready:"1/1",status:"Running",restarts:0,age:"0s"});
      return `deployment.apps/${name} created`;
    }
    if(file.includes("service")||file.includes("svc")) {
      const name=file.replace(/\.ya?ml$/,"").replace(/.*\//,"").replace("service-","").replace("-svc","");
      const ns=S.k8s.namespace;
      S.k8s.services.push({name,type:"ClusterIP",clusterIP:`10.96.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,ports:"80/TCP",age:"0s",namespace:ns});
      return `service/${name} created`;
    }
    return `Warning: resource mapping not found for "${file}" — simulating apply\nconfigured`;
  },
  create(args) {
    const type=args[0];
    if(type==="deployment"||type==="deploy") {
      const name=args[1]; if(!name) return 'error: --name must be specified';
      const img=args[args.findIndex(a=>a==="--image")+1]||"nginx";
      const ns=S.k8s.namespace;
      const podName=`${name}-${rnd(5)}-${rnd(5)}`;
      S.k8s.deployments.push({name,namespace:ns,replicas:1,ready:1,available:1,age:"0s"});
      S.k8s.pods.push({name:podName,namespace:ns,ready:"1/1",status:"Running",restarts:0,age:"0s"});
      return `deployment.apps/${name} created`;
    }
    if(type==="namespace"||type==="ns") {
      const name=args[1]; if(!name) return 'error: namespace name required';
      if(S.k8s.namespaces.includes(name)) return `Error from server (AlreadyExists): namespaces "${name}" already exists`;
      S.k8s.namespaces.push(name);
      return `namespace/${name} created`;
    }
    return `error: unknown resource type "${type}"`;
  },
  delete(args) {
    const type=args[0]; const name=args[1];
    if(!type||!name) return 'error: must specify resource and name';
    if(type==="pod"||type==="pods"||type==="po") {
      const idx=S.k8s.pods.findIndex(p=>p.name===name);
      if(idx===-1) return `Error from server (NotFound): pods "${name}" not found`;
      S.k8s.pods.splice(idx,1); return `pod "${name}" deleted`;
    }
    if(type==="deployment"||type==="deploy") {
      const di=S.k8s.deployments.findIndex(d=>d.name===name);
      if(di===-1) return `Error from server (NotFound): deployments.apps "${name}" not found`;
      S.k8s.deployments.splice(di,1);
      S.k8s.pods=S.k8s.pods.filter(p=>!p.name.startsWith(name+"-"));
      return `deployment.apps "${name}" deleted`;
    }
    if(type==="service"||type==="svc") {
      const si=S.k8s.services.findIndex(s=>s.name===name);
      if(si===-1) return `Error from server (NotFound): services "${name}" not found`;
      S.k8s.services.splice(si,1); return `service "${name}" deleted`;
    }
    return `Error from server (NotFound): resource "${name}" not found`;
  },
  describe(args) {
    const type=args[0]; const name=args[1];
    if(!type) return 'error: must specify the type of resource';
    if(type==="pod"||type==="po") {
      const p=S.k8s.pods.find(p=>p.name===name||(!name&&true));
      if(!p) return name?`Error from server (NotFound): pods "${name}" not found`:`(no pods)`;
      const target=name?p:S.k8s.pods[0];
      return `Name:         ${target.name}\nNamespace:    ${target.namespace}\nStatus:       ${target.status}\nIP:           10.244.0.${Math.floor(Math.random()*100)+2}\nContainers:\n  app:\n    Image:      nginx:latest\n    Port:       80/TCP\n    State:      Running\n    Ready:      True\nConditions:\n  Ready   True\nEvents:\n  Normal  Scheduled  0s  default-scheduler  Successfully assigned`;
    }
    if(type==="node"||type==="no") {
      const n=S.k8s.nodes[0];
      return `Name:               ${n.name}\nRoles:              ${n.roles}\nStatus:             Ready\nKubernetes Version: ${n.version}\nOS Image:           Ubuntu 22.04.3 LTS\nCPU:                2\nMemory:             3936Mi\nConditions:\n  Ready   True`;
    }
    return `(describe for "${type}" not fully simulated — but you get the idea)`;
  },
  scale(args) {
    const ri=args.findIndex(a=>a.startsWith("--replicas="));
    const replicas=ri!==-1?parseInt(args[ri].split("=")[1]):parseInt(args[args.findIndex(a=>a==="--replicas")+1]);
    const target=args.filter(a=>!a.startsWith("-"))[0];
    if(!target||isNaN(replicas)) return 'error: --replicas required. e.g. kubectl scale deployment/myapp --replicas=3';
    const name=target.includes("/")?target.split("/")[1]:target;
    const d=S.k8s.deployments.find(d=>d.name===name);
    if(!d) return `Error from server (NotFound): deployments.apps "${name}" not found`;
    const ns=d.namespace;
    S.k8s.pods=S.k8s.pods.filter(p=>!p.name.startsWith(name+"-"));
    for(let i=0;i<replicas;i++) S.k8s.pods.push({name:`${name}-${rnd(5)}-${rnd(5)}`,namespace:ns,ready:"1/1",status:"Running",restarts:0,age:"0s"});
    d.replicas=replicas; d.ready=replicas; d.available=replicas;
    return `deployment.apps/${name} scaled`;
  },
  config(args) {
    const sub=args[0];
    if(sub==="get-contexts") return `CURRENT   NAME        CLUSTER     AUTHINFO    NAMESPACE\n*         minikube    minikube    minikube    ${S.k8s.namespace}`;
    if(sub==="current-context") return "minikube";
    if(sub==="set-context") {
      const ni=args.findIndex(a=>a.startsWith("--namespace="));
      if(ni!==-1){ S.k8s.namespace=args[ni].split("=")[1]; return `Context "minikube" modified.`; }
      return `Context "minikube" modified.`;
    }
    return `kubectl config ${sub||""}: see 'kubectl config --help'`;
  },
  logs(args) {
    const name=args.filter(a=>!a.startsWith("-"))[0];
    if(!name) return 'error: pod name required';
    const p=S.k8s.pods.find(p=>p.name===name||p.name.startsWith(name));
    if(!p) return `Error from server (NotFound): pods "${name}" not found`;
    return `2024-01-15T10:23:41Z INFO  Server started on :8080\n2024-01-15T10:23:42Z INFO  Health check OK\n2024-01-15T10:23:43Z INFO  Ready to serve requests`;
  },
  exec(args) {
    const name=args.filter(a=>!a.startsWith("-"))[0];
    if(!name) return 'error: pod name required. e.g. kubectl exec -it <pod> -- /bin/sh';
    const p=S.k8s.pods.find(p=>p.name===name||p.name.startsWith(name));
    if(!p) return `Error from server (NotFound): pods "${name}" not found`;
    return `(exec into "${p.name}" — interactive shell not supported in simulator)`;
  },
  version:()=>`Client Version: v1.28.0\nKustomize Version: v5.0.4\nServer Version: v1.28.3`,
  "cluster-info":()=>`Kubernetes control plane is running at https://192.168.49.2:8443\nCoreDNS is running at https://192.168.49.2:8443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy`,
  "--help":()=>`kubectl controls the Kubernetes cluster manager.\n\nBasic Commands:\n  create      Create a resource\n  apply       Apply a configuration to a resource\n  delete      Delete resources\n  get         Display one or many resources\n  describe    Show details of a specific resource\n  logs        Print the logs for a container\n  exec        Execute a command in a container\n  scale       Scale a deployment\n  config      Modify kubeconfig files\n\nRun 'kubectl COMMAND --help' for more information.`,
};

function execute(raw) {
  const t = raw.trim();
  if (!t) return "";
  const tok = t.split(/\s+/);
  const cmd = tok[0];
  if (cmd === "docker") {
    const sub = tok[1];
    if (!sub) return dockerCmds["--help"]();
    const h = dockerCmds[sub];
    if (!h) return `docker: '${sub}' is not a docker command.\nSee 'docker --help'`;
    return h(tok.slice(2));
  }
  if (cmd === "kubectl" || cmd === "k") {
    const sub = tok[1];
    if (!sub) return kubectlCmds["--help"]();
    const h = kubectlCmds[sub];
    if (!h) return `error: unknown command "${sub}" for "kubectl"\nSee 'kubectl --help'`;
    return h(tok.slice(2));
  }
  if (t === "clear") return "__CLEAR__";
  if (t === "reset") { S = mkState(); return "✓ 環境をリセットしました"; }
  if (t === "help") return `利用可能なコマンド:\n  docker ...    Docker操作\n  kubectl ...   Kubernetes操作\n  clear         画面クリア\n  reset         環境リセット\n\n'docker --help' または 'kubectl --help' で詳細を確認`;
  return `${cmd}: command not found`;
}

const DOCKER_TIPS = [
  "docker images",
  "docker run -d --name web -p 8080:80 nginx",
  "docker ps",
  "docker logs web",
  "docker stop web",
  "docker ps -a",
  "docker rm web",
];
const K8S_TIPS = [
  "kubectl get nodes",
  "kubectl create deployment myapp --image=nginx",
  "kubectl get pods",
  "kubectl get deployments",
  "kubectl scale deployment/myapp --replicas=3",
  "kubectl get pods -A",
  "kubectl describe pod",
  "kubectl delete deployment myapp",
];

const PROMPT_DOCKER = "user@docker:~$ ";
const PROMPT_K8S    = "user@k8s:~$ ";

function Terminal({ mode, label, color, prompt, tips, initLines }) {
  const [lines, setLines]   = useState(initLines);
  const [input, setInput]   = useState("");
  const [hist,  setHist]    = useState([]);
  const [hidx,  setHidx]    = useState(-1);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [lines]);

  const submit = (cmd) => {
    const out = execute(cmd);
    if (out === "__CLEAR__") {
      setLines(initLines);
    } else {
      setLines(p => [...p,
        { type:"input", text:cmd },
        ...(out ? [{ type:"output", text:out }] : []),
      ]);
    }
    setHist(p => [cmd, ...p.filter(h=>h!==cmd)].slice(0,50));
    setHidx(-1); setInput("");
  };

  const onKeyDown = (e) => {
    if (e.key==="Enter") { if(input.trim()) submit(input); return; }
    if (e.key==="ArrowUp") {
      e.preventDefault();
      const i=Math.min(hidx+1,hist.length-1); setHidx(i); setInput(hist[i]??"");
    }
    if (e.key==="ArrowDown") {
      e.preventDefault();
      const i=Math.max(hidx-1,-1); setHidx(i); setInput(i===-1?"":hist[i]??"");
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0, height:"100%" }}>
      <div style={{ background:"#1c2128", borderBottom:"1px solid #30363d", padding:"8px 16px", display:"flex", alignItems:"center", gap:8, borderRadius:"8px 8px 0 0" }}>
        <span style={{ width:11,height:11,borderRadius:"50%",background:"#ff5f57",display:"inline-block" }}/>
        <span style={{ width:11,height:11,borderRadius:"50%",background:"#febc2e",display:"inline-block" }}/>
        <span style={{ width:11,height:11,borderRadius:"50%",background:"#28c840",display:"inline-block" }}/>
        <span style={{ marginLeft:8, color:color, fontSize:11, fontWeight:700, letterSpacing:"0.08em" }}>{label}</span>
      </div>
      <div onClick={()=>inputRef.current?.focus()} style={{ flex:1, overflowY:"auto", padding:"12px 16px", background:"#0d1117", cursor:"text", minHeight:0 }}>
        {lines.map((l,i)=>(
          <div key={i} style={{marginBottom:1}}>
            {l.type==="input" && <div style={{display:"flex"}}><span style={{color,userSelect:"none",whiteSpace:"nowrap"}}>{prompt}</span><span style={{color:"#e6edf3"}}>{l.text}</span></div>}
            {l.type==="output" && <pre style={{color:"#c9d1d9",margin:"1px 0 6px",fontSize:12,lineHeight:1.55,whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{l.text}</pre>}
            {l.type==="system" && <div style={{color:"#58a6ff",fontSize:11,marginBottom:3}}>{l.text}</div>}
          </div>
        ))}
        <div style={{display:"flex",alignItems:"center",marginTop:2}}>
          <span style={{color,userSelect:"none",whiteSpace:"nowrap"}}>{prompt}</span>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKeyDown}
            spellCheck={false} style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e6edf3",fontSize:13,fontFamily:"inherit",caretColor:color}}/>
        </div>
        <div ref={bottomRef}/>
      </div>
      <div style={{ background:"#161b22", borderTop:"1px solid #21262d", padding:"8px 12px", borderRadius:"0 0 8px 8px" }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {tips.map((t,i)=>(
            <button key={i} onClick={()=>{submit(t);inputRef.current?.focus();}}
              style={{ background:"#21262d",border:"1px solid #30363d",borderRadius:4,color,fontSize:10,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit" }}
              onMouseEnter={e=>{e.currentTarget.style.background="#30363d";}}
              onMouseLeave={e=>{e.currentTarget.style.background="#21262d";}}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimulatorPane({ defaultTab = "docker" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const dockerInit = [
    {type:"system",text:"🐳 Docker Terminal  —  'docker --help' でコマンド一覧"},
    {type:"system",text:"─────────────────────────────────────────────"},
  ];
  const k8sInit = [
    {type:"system",text:"☸️  Kubernetes Terminal  —  'kubectl --help' でコマンド一覧"},
    {type:"system",text:"─────────────────────────────────────────────"},
  ];
  const tabs = [
    { id:"docker", label:"🐳 Docker",     color:"#2ea043", prompt:PROMPT_DOCKER, tips:DOCKER_TIPS, init:dockerInit },
    { id:"k8s",    label:"☸️  Kubernetes", color:"#388bfd", prompt:PROMPT_K8S,    tips:K8S_TIPS,    init:k8sInit    },
  ];
  return (
    <div style={{ height:"100%", background:"#010409", padding:"12px 16px", fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace", boxSizing:"border-box", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ color:"#e6edf3", fontSize:18, fontWeight:700, letterSpacing:"0.04em" }}>
          Container &amp; Orchestration Simulator
        </div>
        <div style={{ color:"#8b949e", fontSize:11, marginTop:4 }}>
          Docker + Kubernetes をブラウザ上でシミュレート  ·  ↑↓ 履歴  ·  reset で環境リセット
        </div>
      </div>
      <div style={{ display:"flex", gap:4, maxWidth:860, margin:"0 auto 12px", width:"100%" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              flex:1, padding:"10px 0", border:"1px solid",
              borderColor: activeTab===tab.id ? tab.color : "#30363d",
              borderRadius:6, background: activeTab===tab.id ? tab.color+"22" : "#161b22",
              color: activeTab===tab.id ? tab.color : "#8b949e",
              fontSize:13, fontWeight:700, fontFamily:"inherit",
              cursor:"pointer", letterSpacing:"0.05em", transition:"all 0.15s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ flex:1, maxWidth:860, margin:"0 auto", width:"100%", border:"1px solid #30363d", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column", minHeight:0 }}>
        {tabs.map(tab => (
          <div key={tab.id} style={{ display: activeTab===tab.id ? "flex" : "none", flexDirection:"column", height:"100%" }}>
            <Terminal mode={tab.id} label={tab.label.toUpperCase()} color={tab.color} prompt={tab.prompt} tips={tab.tips} initLines={tab.init}/>
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:10, color:"#484f58", fontSize:10 }}>
        両タブは同じ状態を共有  ·  Docker で作ったリソースを K8s タブで確認できます
      </div>
    </div>
  );
}

function SimModal({ tab, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",background:"rgba(0,0,0,0.88)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 16px",background:"#0d1117",borderBottom:"1px solid #30363d",flexShrink:0}}>
        <span style={{color:"#e6edf3",fontWeight:700,fontSize:"0.88em",fontFamily:"monospace"}}>🖥️ Container Simulator</span>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:"#8b949e",fontSize:"0.74em"}}>ESC で閉じる</span>
          <button onClick={onClose} style={{background:"none",border:"1px solid #30363d",color:"#8b949e",padding:"4px 12px",borderRadius:6,cursor:"pointer",fontSize:"0.82em"}}>✕ 閉じる</button>
        </div>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>
        <SimulatorPane defaultTab={tab} />
      </div>
    </div>
  );
}

function SimBanner({ pageId, onOpen, t }) {
  if (!pageId) return null;
  const isK8s = pageId.startsWith("phase5")||pageId.startsWith("phase4");
  const color = isK8s?"#388bfd":"#2ea043";
  return (
    <div style={{padding:"8px 16px",background:isK8s?"rgba(56,139,253,0.07)":"rgba(46,160,67,0.07)",borderBottom:`1px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexShrink:0}}>
      <div>
        <span style={{color,fontWeight:700,fontSize:"0.84em"}}>{isK8s?"☸️":"🐳"} シミュレーターで手を動かそう</span>
        <span style={{color:"#718096",fontSize:"0.76em",marginLeft:10}}>コマンドをそのまま貼り付けて動作確認できます</span>
      </div>
      <button onClick={onOpen} style={{background:color,border:"none",color:"#fff",padding:"6px 13px",borderRadius:7,cursor:"pointer",fontSize:"0.8em",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>
        {isK8s?"Kubernetes Simulator →":"Docker Simulator →"}
      </button>
    </div>
  );
}

// ── 内部リンクのパス解決 ───────────────────────────────────────
// currentId="phase1/README", href="../appendix/cheatsheet-phase1.md"
// → "appendix/cheatsheet-phase1"
function resolveInternalLink(currentId, href) {
  const [path] = href.split("#");
  const withoutMd = path.replace(/\.md$/, "");
  const dir = currentId.split("/").slice(0, -1);
  const resolved = [...dir];
  for (const part of withoutMd.split("/")) {
    if (part === "..") resolved.pop();
    else if (part && part !== ".") resolved.push(part);
  }
  return resolved.join("/");
}

// ── Markdown カスタムコンポーネント ────────────────────────────
function getMdComponents(t, activeId, go) {
  return {
    pre({ children }) {
      const child = Array.isArray(children) ? children[0] : children;
      const className = child?.props?.className ?? "";
      const code = String(child?.props?.children ?? "").replace(/\n$/, "");
      const lang = className.replace("language-", "");
      if (lang === "mermaid") return <MermaidBlock code={code} t={t} />;
      return <CodeBlock lang={lang} t={t}>{code}</CodeBlock>;
    },
    code({ children }) {
      return <code style={{ background: t.inlineCodeBg, color: t.inlineCodeText, padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.88em", whiteSpace: "nowrap" }}>{children}</code>;
    },
    h1: ({ children }) => <h1 style={{ fontSize: "1.4em", fontWeight: 800, color: t.h1Color, margin: "8px 0 14px", borderBottom: `2px solid ${t.h1Border}`, paddingBottom: 8 }}>{children}</h1>,
    h2: ({ children }) => <h2 style={{ fontSize: "1.1em", fontWeight: 700, color: t.h2Color, margin: "24px 0 8px" }}>{children}</h2>,
    h3: ({ children }) => <h3 style={{ fontSize: "0.97em", fontWeight: 700, color: t.h3Color, margin: "16px 0 6px" }}>{children}</h3>,
    p: ({ children }) => <p style={{ color: t.textSub, fontSize: "0.9em", lineHeight: 1.75, margin: "6px 0" }}>{children}</p>,
    a: ({ href, children }) => {
      if (!href) return <span>{children}</span>;
      const isExternal = href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
      if (isExternal) {
        return <a href={href} style={{ color: t.accent, textDecoration: "underline" }} target="_blank" rel="noopener noreferrer">{children}</a>;
      }
      const id = resolveInternalLink(activeId, href);
      return <a href={"#" + id} onClick={(e) => { e.preventDefault(); go(id); }} style={{ color: t.accent, textDecoration: "underline", cursor: "pointer" }}>{children}</a>;
    },
    blockquote: ({ children }) => (
      <blockquote style={{ borderLeft: `3px solid ${t.accent}`, margin: "10px 0", padding: "8px 14px", background: t.blockquoteBg, borderRadius: "0 8px 8px 0", color: t.blockquoteText, fontSize: "0.9em" }}>
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: "auto", margin: "10px 0" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82em" }}>{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead style={{ background: t.tableHeadBg }}>{children}</thead>,
    th: ({ children }) => <th style={{ padding: "7px 10px", textAlign: "left", color: t.tableThText, fontWeight: 700, borderBottom: `1px solid ${t.accentBorder}`, whiteSpace: "nowrap" }}>{children}</th>,
    td: ({ children }) => <td style={{ padding: "6px 10px", color: t.tableTdText, borderBottom: `1px solid ${t.tableRowBorder}`, verticalAlign: "top" }}>{children}</td>,
    ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: "6px 0", color: t.textSub, fontSize: "0.9em", lineHeight: 1.7 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ paddingLeft: 22, margin: "6px 0", color: t.textSub, fontSize: "0.9em", lineHeight: 1.7 }}>{children}</ol>,
    li: ({ children }) => <li style={{ paddingBottom: 3 }}>{children}</li>,
    hr: () => <hr style={{ border: "none", borderTop: `1px solid ${t.hrColor}`, margin: "18px 0" }} />,
    strong: ({ children }) => <strong style={{ color: t.strong, fontWeight: 700 }}>{children}</strong>,
    input: ({ checked }) => (
      <span style={{ fontSize: "1.1em", marginRight: 6, color: checked ? t.checkOn : t.checkOff }}>{checked ? "☑" : "☐"}</span>
    ),
  };
}

// ── サイドバーのナビグループ ───────────────────────────────────
function NavGroup({ group, activeId, onSelect, t }) {
  const [open, setOpen] = useState(group.items.some((i) => i.id === activeId) || group.phase === "Phase 1");
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "none", border: "none", cursor: "pointer" }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "0.68em", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: t.textDim }}>
            {group.phase} {group.status === "published" ? "" : "🚧"}
          </div>
          <div style={{ fontSize: "0.82em", fontWeight: 600, color: t.textFaint, marginTop: 2 }}>
            {group.label}
          </div>
        </div>
        <span style={{ fontSize: "0.85em", opacity: 0.5, color: t.textFaint }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && group.items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px",
            border: "none", background: activeId === item.id ? t.accentBgActive : "transparent",
            color: activeId === item.id ? t.accent : t.textMuted,
            borderLeft: `3px solid ${activeId === item.id ? t.accent : "transparent"}`,
            borderRadius: "0 6px 6px 0", cursor: "pointer", textAlign: "left",
            fontSize: "0.85em", fontWeight: activeId === item.id ? 700 : 400,
          }}
        >
          <span>{item.icon}</span>
          <span style={{ lineHeight: 1.3 }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── プログレスバー ─────────────────────────────────────────────
function Progress({ nav, activeId, t }) {
  const pages = flatPages(nav);
  const idx = pages.findIndex((p) => p.id === activeId);
  const pct = pages.length > 1 ? Math.round((idx / (pages.length - 1)) * 100) : 0;
  return (
    <div style={{ height: 2, background: t.progressBg, flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${t.accent},${t.accentMuted})`, transition: "width 0.3s" }} />
    </div>
  );
}

// ── テーマ切り替えボタン ───────────────────────────────────────
function ThemeToggle({ isDark, onToggle, t }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
      style={{
        background: t.toggleBg,
        border: `1px solid ${t.toggleBorder}`,
        color: t.toggleColor,
        padding: "5px 9px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: "1em",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}

// ── メイン ─────────────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });
  const t = isDark ? DARK : LIGHT;

  const nav = useManifest();
  const pages = flatPages(nav);
  const [activeId, setActiveId] = useState("phase1/README");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const content = useDoc(activeId);
  const simTab = activeId?.startsWith("phase5") || activeId?.startsWith("phase4") ? "k8s" : "docker";
  const contentRef = useRef(null);

  // body の背景色をテーマに合わせる
  useEffect(() => {
    document.body.style.background = t.appBg;
  }, [t.appBg]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [activeId]);

  // URL hash で直リンク対応
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && pages.some((p) => p.id === hash)) setActiveId(hash);
  }, [pages.length]);

  const go = (id) => {
    setActiveId(id);
    setSidebarOpen(false);
    history.replaceState(null, "", "#" + id);
  };

  const toggleTheme = () => {
    setIsDark((d) => {
      const next = !d;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const curIdx = pages.findIndex((p) => p.id === activeId);
  const prev = pages[curIdx - 1];
  const next = pages[curIdx + 1];
  const curItem = pages[curIdx];

  const mdComponents = useMemo(() => getMdComponents(t, activeId, go), [t, activeId]);

  const SidebarContent = () => (
    <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
      {nav.map((g) => <NavGroup key={g.phase} group={g} activeId={activeId} onSelect={go} t={t} />)}
    </div>
  );

  const SidebarHeader = ({ showClose }) => (
    <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${t.sidebarBorder}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: "0.85em", color: t.accent, fontWeight: 800, letterSpacing: "0.05em" }}>🐳 Docker</div>
        <div style={{ fontSize: "0.72em", color: t.textDim, marginTop: 2 }}>ハンズオンカリキュラム</div>
      </div>
      {showClose && (
        <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: t.textFaint, cursor: "pointer", fontSize: "1.3em" }}>✕</button>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: t.appBg, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: t.text, overflow: "hidden" }}>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ width: 230, flexShrink: 0, background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}`, display: "flex", flexDirection: "column" }}>
        <SidebarHeader showClose={false} />
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: "relative", width: 260, background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}`, display: "flex", flexDirection: "column", zIndex: 1 }}>
            <SidebarHeader showClose={true} />
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Progress nav={nav} activeId={activeId} t={t} />

        {/* Header */}
        <div style={{ padding: "11px 16px", background: t.headerBg, borderBottom: `1px solid ${t.sidebarBorder}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} style={{ display: "none", background: t.accentBg, border: `1px solid ${t.accentBorder}`, color: t.accent, padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: "1em" }}>☰</button>
          <div style={{ flex: 1, minWidth: 0, fontSize: "0.93em", fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {curItem?.icon} {curItem?.label}
          </div>
          {/* Quick selector */}
          <select value={activeId} onChange={(e) => go(e.target.value)} style={{ background: t.selectBg, border: `1px solid ${t.accentBorder}`, color: t.accentMuted, padding: "5px 8px", borderRadius: 6, fontSize: "0.8em", maxWidth: 170 }}>
            {nav.map((g) => (
              <optgroup key={g.phase} label={g.phase}>
                {g.items.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}
              </optgroup>
            ))}
          </select>
          {/* Theme toggle */}
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} t={t} />
        </div>

        {/* Simulator Banner */}
        <SimBanner pageId={activeId} onOpen={() => setSimOpen(true)} t={t} />

        {/* Content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "24px 20px 48px", background: t.appBg }}>
          <div style={{ maxWidth: 740, margin: "0 auto" }}>
            {content === null
              ? <div style={{ color: t.textDim, fontSize: "0.9em", paddingTop: 40, textAlign: "center" }}>読み込み中…</div>
              : <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
            }
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ borderTop: `1px solid ${t.sidebarBorder}`, padding: "10px 16px", background: t.footerBg, display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => prev && go(prev.id)} disabled={!prev}
            style={{ flex: 1, padding: "8px 10px", background: prev ? t.accentBg : "transparent", border: `1px solid ${prev ? t.accentBorder : t.progressBg}`, color: prev ? t.accentMuted : t.textDim, borderRadius: 8, cursor: prev ? "pointer" : "default", fontSize: "0.82em", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prev && <>{prev.icon} ← {prev.label}</>}
          </button>
          <button onClick={() => next && go(next.id)} disabled={!next}
            style={{ flex: 1, padding: "8px 10px", background: next ? t.accentBg : "transparent", border: `1px solid ${next ? t.accentBorder : t.progressBg}`, color: next ? t.accentMuted : t.textDim, borderRadius: 8, cursor: next ? "pointer" : "default", fontSize: "0.82em", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {next && <>{next.icon} {next.label} →</>}
          </button>
        </div>
      </div>

      {simOpen && <SimModal tab={simTab} onClose={() => setSimOpen(false)} />}

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.scrollThumb}; border-radius: 2px; }
        @media (max-width: 640px) {
          .desktop-sidebar { display: none !important; }
          .menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
