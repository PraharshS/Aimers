// Shared primitives — minimal gamer aesthetic.

const TopBar = ({ path = "play / drills", live = true }) => (
  <div className="topbar">
    <span className="brand">AIMERS</span>
    <span style={{ color: "var(--text-3)" }}>/</span>
    <span>{path}</span>
    <div style={{ flex: 1 }} />
    {live && <span className="live-dot" />}
    <span>online · 4,128</span>
    <span style={{ color: "var(--text-3)" }}>·</span>
    <span>v0.42</span>
  </div>
);

const Label = ({ children, sm }) => (
  <span className={sm ? "label" : "label-md"}>{children}</span>
);

// SVG sparkline / line chart
const ChartLine = ({ points, color = "var(--text)", w = 1.4, dashed = false }) => {
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  return (
    <path d={d} stroke={color} strokeWidth={w} fill="none"
      strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={dashed ? "3 3" : undefined} />
  );
};
const ChartArea = ({ points, color = "var(--accent)", baselineY }) => {
  if (!points.length) return null;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ")
    + ` L ${points[points.length-1][0]} ${baselineY} L ${points[0][0]} ${baselineY} Z`;
  return <path d={d} fill={color} opacity="0.1" />;
};
const Axis = ({ x1, y1, x2, y2 }) => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" strokeWidth="1" />
);

// Deterministic-ish target spots
function spotsForSeed(seed, n, w, h, pad = 30) {
  const out = [];
  let s = seed * 9301 + 49297;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const rx = (s / 233280) * (w - pad * 2) + pad;
    s = (s * 9301 + 49297) % 233280;
    const ry = (s / 233280) * (h - pad * 2) + pad;
    out.push([rx, ry]);
  }
  return out;
}

// Mode glyphs — single-stroke, minimal
const ModeIcon = ({ kind, size = 18 }) => {
  const s = size;
  const stroke = { stroke: "currentColor", strokeWidth: 1.2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" {...stroke}>
      {kind === "grid" && <>
        <circle cx="6" cy="6" r="1.2" /><circle cx="12" cy="6" r="1.2" /><circle cx="18" cy="6" r="1.2" />
        <circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" />
        <circle cx="6" cy="18" r="1.2" /><circle cx="12" cy="18" r="1.2" /><circle cx="18" cy="18" r="1.2" />
      </>}
      {kind === "flick" && <>
        <circle cx="5" cy="19" r="1.5" /><circle cx="19" cy="6" r="2.2" />
        <path d="M 6 17.5 L 17 8" strokeDasharray="2 2.5" />
      </>}
      {kind === "track" && <>
        <circle cx="13" cy="11" r="2" />
        <path d="M 3 16 Q 8 11 13 12 T 22 7" />
      </>}
      {kind === "strafe" && <>
        <circle cx="12" cy="12" r="2" />
        <path d="M 4 12 L 8 12 M 16 12 L 20 12 M 6 10 L 4 12 L 6 14 M 18 10 L 20 12 L 18 14" />
      </>}
      {kind === "switch" && <>
        <circle cx="7" cy="9" r="1.6" /><circle cx="17" cy="9" r="1.6" />
        <circle cx="7" cy="17" r="1.6" /><circle cx="17" cy="17" r="1.6" />
        <path d="M 9 9 L 15 17 M 9 17 L 15 9" strokeDasharray="2 2" />
      </>}
      {kind === "bolt" && <path d="M 13 3 L 7 13 L 12 13 L 10 21 L 17 10 L 12 10 Z" />}
      {kind === "spray" && <>
        <path d="M 5 6 Q 12 8 19 5" /><path d="M 5 10 Q 12 12 19 9" />
        <path d="M 5 14 Q 12 17 19 14" /><path d="M 5 18 Q 12 21 19 19" />
      </>}
      {kind === "plus" && <path d="M 12 5 V 19 M 5 12 H 19" />}
      {kind === "home" && <path d="M 4 11 L 12 4 L 20 11 V 20 H 4 Z" />}
      {kind === "stats" && <path d="M 4 20 V 12 M 10 20 V 6 M 16 20 V 14 M 22 20 V 9" />}
      {kind === "social" && <>
        <circle cx="9" cy="9" r="3" /><circle cx="17" cy="13" r="2.4" />
        <path d="M 3 20 Q 9 14 15 18 Q 18 20 21 20" />
      </>}
      {kind === "cog" && <>
        <circle cx="12" cy="12" r="3" />
        <path d="M 12 3 V 6 M 12 18 V 21 M 3 12 H 6 M 18 12 H 21 M 5.5 5.5 L 7.5 7.5 M 16.5 16.5 L 18.5 18.5 M 5.5 18.5 L 7.5 16.5 M 16.5 7.5 L 18.5 5.5" />
      </>}
      {kind === "search" && <>
        <circle cx="11" cy="11" r="6" /><path d="M 16 16 L 21 21" />
      </>}
    </svg>
  );
};

// Side rail with nav icons
const SideRail = ({ active = "play" }) => (
  <div className="rail">
    {[
      ["home", "home"],
      ["play", "grid"],
      ["stats", "stats"],
      ["social", "social"],
    ].map(([id, icon]) => (
      <div key={id} className={`rail-item ${active === id ? "active" : ""}`}><ModeIcon kind={icon} size={16} /></div>
    ))}
    <div style={{ flex: 1 }} />
    <div className="rail-item"><ModeIcon kind="cog" size={16} /></div>
  </div>
);

// Top nav (horizontal tab bar)
const TabNav = ({ items, active = 0, right }) => (
  <div className="nav">
    {items.map((it, i) => (
      <div key={i} className={`nav-item ${i === active ? "active" : ""}`}>{it}</div>
    ))}
    <div style={{ flex: 1 }} />
    {right}
  </div>
);

Object.assign(window, { TopBar, Label, ChartLine, ChartArea, Axis, spotsForSeed, ModeIcon, SideRail, TabNav });
