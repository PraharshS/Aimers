// In-Game HUD — minimal gamer aesthetic
// A: Minimal corner HUD
// B: Crosshair-centered thin gauges
// C: Right-rail dense stats
// D: Novel — bottom shot timeline

const Playfield = ({ children, label = "PLAY · 1920 × 1080" }) => (
  <div className="playfield">
    <div className="label" style={{ position: "absolute", top: 10, left: 14 }}>{label}</div>
    {children}
  </div>
);

const Targets = ({ spots, activeIdx = -1, hitIdxs = [] }) => spots.map((p, i) => (
  <div key={i} className={`target target-lg ${i === activeIdx ? "target-active" : ""} ${hitIdxs.includes(i) ? "target-hit" : ""}`}
    style={{ position: "absolute", left: p[0] - 14, top: p[1] - 14 }} />
));

// ── A. Minimal corner HUD ───────────────────────────────────────────────
const HUD_A = () => {
  const spots = spotsForSeed(3, 6, 700, 320, 60);
  return (
    <div className="frame">
      <div className="screen">
        <Playfield label="GRIDSHOT · 60S">
          <Targets spots={spots} activeIdx={2} />
          <div className="xhair" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            <div className="xhair-dot" />
          </div>
          {/* top center timer */}
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
            <div className="label">elapsed</div>
            <div className="tnum" style={{ fontSize: 28, marginTop: -2 }}>00:38</div>
          </div>
          {/* top-left score */}
          <div style={{ position: "absolute", top: 36, left: 14 }}>
            <div className="label">score</div>
            <div className="tnum" style={{ fontSize: 22 }}>2,140</div>
          </div>
          {/* bottom-right meta */}
          <div style={{ position: "absolute", bottom: 14, right: 14, textAlign: "right" }}>
            <div className="row gap-3">
              <div><div className="label">acc</div><div className="tnum" style={{ fontSize: 18 }}>71.2%</div></div>
              <div><div className="label">streak</div><div className="tnum accent" style={{ fontSize: 18 }}>×12</div></div>
              <div><div className="label">ttk</div><div className="tnum" style={{ fontSize: 18 }}>312<span style={{ fontSize: 11, color: "var(--text-3)" }}>ms</span></div></div>
            </div>
          </div>
        </Playfield>
      </div>
    </div>
  );
};

// ── B. Crosshair-centered thin gauges ──────────────────────────────────
const HUD_B = () => {
  const spots = spotsForSeed(7, 6, 700, 320, 60);
  return (
    <div className="frame">
      <div className="screen">
        <Playfield label="FLICK · 60S">
          <Targets spots={spots} hitIdxs={[0]} activeIdx={3} />
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" stroke="var(--line-2)" strokeWidth="1" fill="none" />
              <circle cx="70" cy="70" r="58" stroke="var(--text)" strokeWidth="1.6" fill="none"
                strokeDasharray={`${0.71 * 364} 364`} transform="rotate(-90 70 70)" strokeLinecap="round" />
              <circle cx="70" cy="70" r="48" stroke="var(--line)" strokeWidth="1" fill="none" />
              <circle cx="70" cy="70" r="48" stroke="var(--accent)" strokeWidth="1.6" fill="none"
                strokeDasharray={`${0.64 * 301} 301`} transform="rotate(-90 70 70)" strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
              <div className="xhair"><div className="xhair-dot" /></div>
            </div>
            <div style={{ position: "absolute", left: -54, top: -2, textAlign: "right" }}>
              <div className="label">acc</div>
              <div className="tnum" style={{ fontSize: 14 }}>71%</div>
            </div>
            <div style={{ position: "absolute", right: -54, top: -2 }}>
              <div className="label accent">time</div>
              <div className="tnum accent" style={{ fontSize: 14 }}>0:42</div>
            </div>
          </div>
          {/* bottom strip */}
          <div className="row gap-4" style={{ position: "absolute", bottom: 14, left: 0, right: 0, justifyContent: "center" }}>
            <div><div className="label">score</div><div className="tnum" style={{ fontSize: 16 }}>2,140</div></div>
            <div className="vdivider" style={{ height: 28 }} />
            <div><div className="label">streak</div><div className="tnum accent" style={{ fontSize: 16 }}>×12</div></div>
            <div className="vdivider" style={{ height: 28 }} />
            <div><div className="label">ttk</div><div className="tnum" style={{ fontSize: 16 }}>312ms</div></div>
          </div>
        </Playfield>
      </div>
    </div>
  );
};

// ── C. Right-rail dense stats ──────────────────────────────────────────
const HUD_C = () => {
  const spots = spotsForSeed(11, 8, 540, 320, 40);
  return (
    <div className="frame">
      <div className="screen" style={{ flexDirection: "row" }}>
        <Playfield label="SWITCHING · 60S">
          <Targets spots={spots} activeIdx={4} hitIdxs={[1, 6]} />
          <div className="xhair" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}><div className="xhair-dot" /></div>
        </Playfield>
        <div className="col" style={{ width: 170, borderLeft: "1px solid var(--line)", padding: "12px 14px", gap: 6, background: "var(--bg-2)" }}>
          <div className="label">elapsed</div>
          <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
            <div className="tnum" style={{ fontSize: 22 }}>00:38</div>
            <div className="label">/ 01:00</div>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: "63%" }} /></div>
          <div className="kv"><span className="label">score</span><span className="tnum">2,140</span></div>
          <div className="kv"><span className="label">hits</span><span className="tnum">42</span></div>
          <div className="kv"><span className="label">miss</span><span className="tnum mute">17</span></div>
          <div className="kv"><span className="label">acc</span><span className="tnum">71.2%</span></div>
          <div className="kv"><span className="label">avg ttk</span><span className="tnum">312ms</span></div>
          <div className="kv"><span className="label">streak</span><span className="tnum accent">×12</span></div>
          <div className="label" style={{ marginTop: 6 }}>last 8 shots</div>
          <div className="dotrow">
            {[1,1,0,1,1,1,0,1].map((v, i) => <span key={i} className={`d ${v ? "on" : "miss"}`} />)}
          </div>
          <div style={{ flex: 1 }} />
          <div className="label">[esc] pause · [r] reset</div>
        </div>
      </div>
    </div>
  );
};

// ── D. Novel — bottom shot timeline ────────────────────────────────────
const HUD_D = () => {
  const spots = spotsForSeed(2, 6, 700, 280, 60);
  // shot history: [ttkMs, hit?]
  const shots = [[290,1],[340,1],[310,1],[420,0],[270,1],[260,1],[300,1],[280,1],[410,0],[230,1],[250,1],[290,1],[330,1],[280,1]];
  const maxTtk = 500;
  return (
    <div className="frame">
      <div className="screen">
        <Playfield label="TRACKING · LIVE">
          <Targets spots={spots} hitIdxs={[2]} activeIdx={4} />
          {/* ghost ring at crosshair (deviation from last hit) */}
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="22" stroke="var(--accent)" strokeWidth="1" fill="none" strokeDasharray="2 3" opacity=".5" />
              <line x1="32" y1="32" x2="46" y2="22" stroke="var(--accent)" strokeWidth="1.2" />
              <circle cx="46" cy="22" r="2" fill="var(--accent)" />
            </svg>
            <div className="xhair" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}><div className="xhair-dot" /></div>
          </div>
          {/* top hud */}
          <div style={{ position: "absolute", top: 12, left: 0, right: 0 }} className="row between">
            <div style={{ marginLeft: 14 }}>
              <div className="label">score</div>
              <div className="tnum" style={{ fontSize: 20 }}>2,140</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="label">elapsed</div>
              <div className="tnum" style={{ fontSize: 20 }}>00:38</div>
            </div>
            <div style={{ marginRight: 14, textAlign: "right" }}>
              <div className="label">combo</div>
              <div className="tnum accent" style={{ fontSize: 20 }}>×12</div>
            </div>
          </div>
        </Playfield>
        {/* bottom timeline */}
        <div className="row gap-2" style={{ flex: "0 0 78px", padding: "10px 14px", borderTop: "1px solid var(--line)", background: "var(--bg-2)" }}>
          <div className="col gap-1" style={{ width: 60 }}>
            <div className="label">last 14</div>
            <div className="tnum mute" style={{ fontSize: 11 }}>avg 296ms</div>
          </div>
          <div className="row" style={{ flex: 1, gap: 4, alignItems: "flex-end", height: "100%" }}>
            {shots.map((s, i) => {
              const h = Math.round((s[0] / maxTtk) * 56);
              const isLast = i === shots.length - 1;
              return (
                <div key={i} className="col gap-1" style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{
                    width: "100%",
                    height: h,
                    background: s[1] ? (isLast ? "var(--accent)" : "var(--text)") : "transparent",
                    border: s[1] ? "none" : "1px solid var(--danger)",
                    borderRadius: 1,
                  }} />
                  <div className="label" style={{ fontSize: 8, color: s[1] ? "var(--text-3)" : "var(--danger)" }}>{s[1] ? "·" : "✗"}</div>
                </div>
              );
            })}
          </div>
          <div className="col" style={{ width: 80, alignItems: "flex-end" }}>
            <div className="label">acc</div>
            <div className="tnum" style={{ fontSize: 18 }}>71%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { HUD_A, HUD_B, HUD_C, HUD_D });
