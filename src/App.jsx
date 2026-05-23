import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

// ── コードブロックのコピーボタン ───────────────────────────────
function CodeBlock({ children, className }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");
  const lang = className?.replace("language-", "") ?? "";
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ margin: "12px 0", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(99,179,237,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(99,179,237,0.1)", padding: "4px 12px", borderBottom: "1px solid rgba(99,179,237,0.15)" }}>
        <span style={{ fontSize: "0.72em", color: "#63b3ed", fontFamily: "monospace" }}>{lang || "code"}</span>
        <button onClick={copy} style={{ background: "none", border: "1px solid rgba(99,179,237,0.3)", color: copied ? "#68d391" : "#63b3ed", padding: "2px 10px", borderRadius: 4, cursor: "pointer", fontSize: "0.72em" }}>
          {copied ? "✓ コピー済み" : "コピー"}
        </button>
      </div>
      <pre style={{ background: "#0d1117", padding: "14px", margin: 0, overflowX: "auto", fontSize: "0.8em", lineHeight: 1.6, color: "#e2e8f0", fontFamily: "'JetBrains Mono',monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Markdown カスタムコンポーネント ────────────────────────────
const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    if (inline) {
      return <code style={{ background: "rgba(99,179,237,0.15)", color: "#90cdf4", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.88em" }}>{children}</code>;
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  h1: ({ children }) => <h1 style={{ fontSize: "1.4em", fontWeight: 800, color: "#63b3ed", margin: "8px 0 14px", borderBottom: "2px solid rgba(99,179,237,0.3)", paddingBottom: 8 }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontSize: "1.1em", fontWeight: 700, color: "#90cdf4", margin: "24px 0 8px" }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: "0.97em", fontWeight: 700, color: "#a0aec0", margin: "16px 0 6px" }}>{children}</h3>,
  p: ({ children }) => <p style={{ color: "#cbd5e0", fontSize: "0.9em", lineHeight: 1.75, margin: "6px 0" }}>{children}</p>,
  a: ({ href, children }) => <a href={href} style={{ color: "#63b3ed", textDecoration: "underline" }} target="_blank" rel="noopener noreferrer">{children}</a>,
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: "3px solid #63b3ed", margin: "10px 0", padding: "8px 14px", background: "rgba(99,179,237,0.07)", borderRadius: "0 8px 8px 0", color: "#a0aec0", fontSize: "0.9em" }}>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "10px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82em" }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: "rgba(99,179,237,0.12)" }}>{children}</thead>,
  th: ({ children }) => <th style={{ padding: "7px 10px", textAlign: "left", color: "#90cdf4", fontWeight: 700, borderBottom: "1px solid rgba(99,179,237,0.2)", whiteSpace: "nowrap" }}>{children}</th>,
  td: ({ children }) => <td style={{ padding: "6px 10px", color: "#cbd5e0", borderBottom: "1px solid rgba(255,255,255,0.05)", verticalAlign: "top" }}>{children}</td>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: "6px 0", color: "#cbd5e0", fontSize: "0.9em", lineHeight: 1.7 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 22, margin: "6px 0", color: "#cbd5e0", fontSize: "0.9em", lineHeight: 1.7 }}>{children}</ol>,
  li: ({ children }) => <li style={{ paddingBottom: 3 }}>{children}</li>,
  hr: () => <hr style={{ border: "none", borderTop: "1px solid rgba(99,179,237,0.15)", margin: "18px 0" }} />,
  strong: ({ children }) => <strong style={{ color: "#fbd38d", fontWeight: 700 }}>{children}</strong>,
  input: ({ checked }) => (
    <span style={{ fontSize: "1.1em", marginRight: 6, color: checked ? "#68d391" : "#4a5568" }}>{checked ? "☑" : "☐"}</span>
  ),
};

// ── サイドバーのナビグループ ───────────────────────────────────
function NavGroup({ group, activeId, onSelect }) {
  const [open, setOpen] = useState(group.items.some((i) => i.id === activeId) || group.phase === "Phase 1");
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen((p) => !p)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "none", border: "none", color: "#718096", cursor: "pointer", fontSize: "0.72em", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        <span>{group.phase} {group.status === "published" ? "" : "🚧"}</span>
        <span style={{ fontSize: "1.1em", opacity: 0.5 }}>{open ? "▾" : "▸"}</span>
      </button>
      {open && group.items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px",
            border: "none", background: activeId === item.id ? "rgba(99,179,237,0.18)" : "transparent",
            color: activeId === item.id ? "#63b3ed" : "#a0aec0",
            borderLeft: `3px solid ${activeId === item.id ? "#63b3ed" : "transparent"}`,
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
function Progress({ nav, activeId }) {
  const pages = flatPages(nav);
  const idx = pages.findIndex((p) => p.id === activeId);
  const pct = pages.length > 1 ? Math.round((idx / (pages.length - 1)) * 100) : 0;
  return (
    <div style={{ height: 2, background: "rgba(255,255,255,0.05)", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#63b3ed,#90cdf4)", transition: "width 0.3s" }} />
    </div>
  );
}

// ── メイン ─────────────────────────────────────────────────────
export default function App() {
  const nav = useManifest();
  const pages = flatPages(nav);
  const [activeId, setActiveId] = useState("phase1/README");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const content = useDoc(activeId);
  const contentRef = useRef(null);

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

  const curIdx = pages.findIndex((p) => p.id === activeId);
  const prev = pages[curIdx - 1];
  const next = pages[curIdx + 1];
  const curItem = pages[curIdx];

  const Sidebar = () => (
    <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
      {nav.map((g) => <NavGroup key={g.phase} group={g} activeId={activeId} onSelect={go} />)}
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f1923", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: "#e2e8f0", overflow: "hidden" }}>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ width: 230, flexShrink: 0, background: "#0d1520", borderRight: "1px solid rgba(99,179,237,0.1)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 14px 10px", borderBottom: "1px solid rgba(99,179,237,0.1)", flexShrink: 0 }}>
          <div style={{ fontSize: "0.85em", color: "#63b3ed", fontWeight: 800, letterSpacing: "0.05em" }}>🐳 Docker</div>
          <div style={{ fontSize: "0.72em", color: "#4a5568", marginTop: 2 }}>ハンズオンカリキュラム</div>
        </div>
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: "relative", width: 260, background: "#0d1520", borderRight: "1px solid rgba(99,179,237,0.15)", display: "flex", flexDirection: "column", zIndex: 1 }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(99,179,237,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: "0.85em", color: "#63b3ed", fontWeight: 800 }}>🐳 Docker</div>
                <div style={{ fontSize: "0.72em", color: "#4a5568" }}>ハンズオンカリキュラム</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#718096", cursor: "pointer", fontSize: "1.3em" }}>✕</button>
            </div>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <Progress nav={nav} activeId={activeId} />

        {/* Header */}
        <div style={{ padding: "11px 16px", background: "#0d1520", borderBottom: "1px solid rgba(99,179,237,0.1)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} style={{ display: "none", background: "rgba(99,179,237,0.1)", border: "1px solid rgba(99,179,237,0.2)", color: "#63b3ed", padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: "1em" }}>☰</button>
          <div style={{ flex: 1, minWidth: 0, fontSize: "0.93em", fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {curItem?.icon} {curItem?.label}
          </div>
          {/* Quick selector */}
          <select value={activeId} onChange={(e) => go(e.target.value)} style={{ background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)", color: "#90cdf4", padding: "5px 8px", borderRadius: 6, fontSize: "0.8em", maxWidth: 170 }}>
            {nav.map((g) => (
              <optgroup key={g.phase} label={g.phase}>
                {g.items.map((item) => <option key={item.id} value={item.id}>{item.icon} {item.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Content */}
        <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "24px 20px 48px" }}>
          <div style={{ maxWidth: 740, margin: "0 auto" }}>
            {content === null
              ? <div style={{ color: "#4a5568", fontSize: "0.9em", paddingTop: 40, textAlign: "center" }}>読み込み中…</div>
              : <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{content}</ReactMarkdown>
            }
          </div>
        </div>

        {/* Bottom nav */}
        <div style={{ borderTop: "1px solid rgba(99,179,237,0.1)", padding: "10px 16px", background: "#0d1520", display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => prev && go(prev.id)} disabled={!prev}
            style={{ flex: 1, padding: "8px 10px", background: prev ? "rgba(99,179,237,0.1)" : "transparent", border: `1px solid ${prev ? "rgba(99,179,237,0.2)" : "rgba(255,255,255,0.05)"}`, color: prev ? "#90cdf4" : "#2d3748", borderRadius: 8, cursor: prev ? "pointer" : "default", fontSize: "0.82em", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {prev && <>{prev.icon} ← {prev.label}</>}
          </button>
          <button onClick={() => next && go(next.id)} disabled={!next}
            style={{ flex: 1, padding: "8px 10px", background: next ? "rgba(99,179,237,0.1)" : "transparent", border: `1px solid ${next ? "rgba(99,179,237,0.2)" : "rgba(255,255,255,0.05)"}`, color: next ? "#90cdf4" : "#2d3748", borderRadius: 8, cursor: next ? "pointer" : "default", fontSize: "0.82em", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {next && <>{next.icon} {next.label} →</>}
          </button>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,179,237,0.3); border-radius: 2px; }
        @media (max-width: 640px) {
          .desktop-sidebar { display: none !important; }
          .menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
