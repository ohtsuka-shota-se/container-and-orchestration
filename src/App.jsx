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
  const content = useDoc(activeId);
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
