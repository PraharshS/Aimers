// Main Menu / Mode Select — minimal gamer aesthetic
// A: Catalog grid (Aimlabs-y)
// B: List + detail panel
// C: Home feed (daily + playlists)
// D: Command-palette launcher (novel)

const MODES = [
  { name: "Gridshot",     tag: "Classic",    icon: "grid",   ttk: "—",     pb: "9,840" },
  { name: "Flick",        tag: "Precision",  icon: "flick",  ttk: "287ms", pb: "8,420" },
  { name: "Tracking",     tag: "Smooth",     icon: "track",  ttk: "—",     pb: "7,210" },
  { name: "Strafe Track", tag: "Reactive",   icon: "strafe", ttk: "—",     pb: "6,180" },
  { name: "Switching",    tag: "Multi-target",icon: "switch",ttk: "402ms", pb: "5,140" },
  { name: "Reflex",       tag: "Reaction",   icon: "bolt",   ttk: "186ms", pb: "—" },
  { name: "Spray Ctrl",   tag: "Recoil",     icon: "spray",  ttk: "—",     pb: "4,950" },
  { name: "Custom",       tag: "Build",      icon: "plus",   ttk: "—",     pb: "—" },
];

// ── A. Catalog grid ─────────────────────────────────────────────────────
const Menu_A = () => (
  <div className="frame">
    <TopBar path="play / catalog" />
    <div className="screen" style={{ flexDirection: "row" }}>
      <SideRail active="play" />
      <div className="col flex-1" style={{ padding: "16px 18px", gap: 12 }}>
        <div className="row between">
          <div>
            <div className="label">drills · catalog</div>
            <div className="h1">All modes <span className="mute-2 tnum"> · 08</span></div>
          </div>
          <div className="row gap-2">
            <div className="tag"><ModeIcon kind="search" size={11} /> search</div>
            <div className="tag">sort · popular ▾</div>
            <div className="btn btn-sm btn-primary">▸ quick start</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, flex: 1 }}>
          {MODES.map((m, i) => (
            <div key={i} className={i === 1 ? "card-active" : "card"} style={{ padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="row between">
                <ModeIcon kind={m.icon} size={18} />
                <div className="label">{String(i+1).padStart(2,"0")}</div>
              </div>
              <div>
                <div className="display" style={{ fontSize: 15 }}>{m.name}</div>
                <div className="label">{m.tag}</div>
              </div>
              <div className="row between" style={{ paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                <span className="label">PB</span>
                <span className="tnum" style={{ fontSize: 12 }}>{m.pb}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── B. List + detail panel ──────────────────────────────────────────────
const Menu_B = () => (
  <div className="frame">
    <TopBar path="play / flick" />
    <div className="screen" style={{ flexDirection: "row" }}>
      <SideRail active="play" />
      {/* mode list */}
      <div className="col" style={{ width: 180, borderRight: "1px solid var(--line)", padding: "12px 0" }}>
        <div className="label" style={{ padding: "0 14px 8px" }}>modes · 08</div>
        {MODES.map((m, i) => (
          <div key={i} className="row gap-2" style={{
            padding: "8px 14px",
            background: i === 1 ? "var(--bg-3)" : "transparent",
            borderLeft: i === 1 ? "1px solid var(--accent)" : "1px solid transparent",
            color: i === 1 ? "var(--text)" : "var(--text-2)",
          }}>
            <ModeIcon kind={m.icon} size={14} />
            <div className="flex-1" style={{ fontSize: 12 }}>{m.name}</div>
            <span className="tnum label">{m.pb}</span>
          </div>
        ))}
      </div>
      {/* detail */}
      <div className="col flex-1" style={{ padding: "18px 20px", gap: 14 }}>
        <div className="row between">
          <div>
            <div className="label">precision · 60s</div>
            <div className="display" style={{ fontSize: 30, lineHeight: 1 }}>Flick</div>
          </div>
          <div className="row gap-2">
            <div className="btn btn-sm">benchmark</div>
            <div className="btn btn-primary">▸ launch</div>
          </div>
        </div>
        <div className="card-flush" style={{ flex: 1, padding: 0, position: "relative" }}>
          <div className="label" style={{ position: "absolute", top: 10, left: 12, zIndex: 2 }}>preview · gridshot.demo</div>
          <div className="playfield">
            {spotsForSeed(3, 5, 460, 200, 50).map((p, i) => (
              <div key={i} className={`target ${i === 2 ? "target-active" : ""}`}
                style={{ position: "absolute", left: p[0] - 9, top: p[1] - 9 }} />
            ))}
            <div className="xhair" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}><div className="xhair-dot" /></div>
          </div>
        </div>
        <div className="row gap-3">
          {[["personal best","8,420"],["accuracy","68.4%"],["avg ttk","287ms"],["global rank","#12,901"]].map(([k,v],i)=>(
            <div key={i} className="card flex-1">
              <div className="label">{k}</div>
              <div className="tnum" style={{ fontSize: 18, marginTop: 4 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ── C. Home feed ────────────────────────────────────────────────────────
const Menu_C = () => (
  <div className="frame">
    <TopBar path="home" />
    <div className="screen" style={{ flexDirection: "row" }}>
      <SideRail active="home" />
      <div className="col flex-1" style={{ padding: "16px 20px", gap: 14 }}>
        <div className="row between">
          <div>
            <div className="label">welcome back</div>
            <div className="h1 display">good evening, ace<span className="accent">.</span></div>
          </div>
          <div className="row gap-3">
            <div className="col" style={{ alignItems: "flex-end" }}>
              <div className="label">streak</div>
              <div className="tnum">06 d</div>
            </div>
            <div className="vdivider" style={{ height: 32 }} />
            <div className="col" style={{ alignItems: "flex-end" }}>
              <div className="label">rank</div>
              <div className="tnum accent">PLAT II</div>
            </div>
          </div>
        </div>
        {/* Hero */}
        <div className="card-raised" style={{ padding: 16, display: "flex", gap: 16, flex: 1 }}>
          <div className="col flex-1 gap-2" style={{ justifyContent: "space-between" }}>
            <div>
              <div className="row gap-2"><span className="tag tag-accent">daily</span><span className="label">resets in 04:12:38</span></div>
              <div className="display" style={{ fontSize: 32, lineHeight: 1.05, marginTop: 8 }}>Tracking Ladder</div>
              <div className="mute" style={{ fontSize: 12, maxWidth: 280, marginTop: 4 }}>Five rounds, smoothness escalates. Clear all to bank +250 XP.</div>
            </div>
            <div className="row gap-2">
              <div className="btn btn-primary">▸ start</div>
              <div className="btn">info</div>
            </div>
          </div>
          <div className="playfield" style={{ flex: "0 0 220px", border: "1px solid var(--line)" }}>
            {spotsForSeed(9, 4, 220, 180, 30).map((p, i) => (
              <div key={i} className="target" style={{ position: "absolute", left: p[0] - 9, top: p[1] - 9 }} />
            ))}
            <svg style={{ position: "absolute", inset: 0 }} viewBox="0 0 220 180" preserveAspectRatio="none">
              <path d="M 30 140 Q 80 30 200 90" stroke="var(--accent)" strokeWidth="1.4" fill="none" strokeDasharray="3 4" />
            </svg>
          </div>
        </div>
        {/* Continue */}
        <div className="col gap-2">
          <div className="row between">
            <div className="label-md">continue training</div>
            <div className="label">‹ 1 / 3 ›</div>
          </div>
          <div className="row gap-2">
            {[
              ["Valorant warm-up", "12 min · 4 drills"],
              ["CS2 essentials", "18 min · 6 drills"],
              ["Apex micro", "14 min · 5 drills"],
              ["Flick ladder", "08 min · 3 drills"],
            ].map(([n, m], i) => (
              <div key={i} className="card flex-1" style={{ padding: 12 }}>
                <div className="bar" style={{ width: "100%", marginBottom: 10 }}><div className="bar-fill" style={{ width: `${30 + i * 18}%` }} /></div>
                <div style={{ fontSize: 13 }}>{n}</div>
                <div className="label" style={{ marginTop: 2 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── D. Command-palette launcher ─────────────────────────────────────────
const Menu_D = () => (
  <div className="frame">
    <TopBar path="launcher" />
    <div className="screen" style={{ padding: "26px 0", justifyContent: "flex-start", alignItems: "center", gap: 0 }}>
      <div className="col gap-3" style={{ width: "min(560px, 86%)" }}>
        <div className="label" style={{ textAlign: "center" }}>press <span style={{ color: "var(--text-2)" }}>⌘K</span> anywhere · search any drill</div>
        {/* command input */}
        <div className="card-raised row gap-2" style={{ padding: "12px 14px" }}>
          <span className="accent tnum">›</span>
          <span className="tnum" style={{ fontSize: 16 }}>flick<span style={{ background: "var(--accent)", color: "var(--bg)", padding: "0 4px" }}>_</span></span>
          <div style={{ flex: 1 }} />
          <span className="tag">esc</span>
        </div>
        {/* results */}
        <div className="card-flush" style={{ padding: 0 }}>
          {[
            { type: "drill",   name: "Flick · 60s",        icon: "flick",  hint: "↵ launch",       active: true },
            { type: "drill",   name: "Flick ladder",       icon: "flick",  hint: "8 min · 3 lvl" },
            { type: "drill",   name: "Anti-flick (left)",  icon: "flick",  hint: "weakness" },
            { type: "list",    name: "Valorant warm-up",   icon: "grid",   hint: "playlist · 4 drills" },
            { type: "page",    name: "Calibrate sens",     icon: "cog",    hint: "settings" },
          ].map((r, i) => (
            <div key={i} className="row gap-3" style={{
              padding: "10px 14px",
              borderTop: i === 0 ? "none" : "1px solid var(--line)",
              background: r.active ? "var(--bg-3)" : "transparent",
              borderLeft: r.active ? "1px solid var(--accent)" : "1px solid transparent"
            }}>
              <ModeIcon kind={r.icon} size={14} />
              <div className="label" style={{ width: 38 }}>{r.type}</div>
              <div className="flex-1" style={{ fontSize: 12 }}>{r.name}</div>
              <div className="label">{r.hint}</div>
            </div>
          ))}
        </div>
        <div className="row between">
          <div className="label">↑↓ navigate · ↵ run · ⌘+enter add to queue</div>
          <div className="label accent">7 results</div>
        </div>
      </div>
      {/* hotkey legend */}
      <div className="row gap-3" style={{ position: "absolute", bottom: 16, left: 18, right: 18, justifyContent: "space-between" }}>
        <div className="label">{`AIMERS · ${new Date().toLocaleDateString("en-CA")}`}</div>
        <div className="row gap-3">
          <span className="label">⌘+1 home</span>
          <span className="label">⌘+2 play</span>
          <span className="label">⌘+3 stats</span>
          <span className="label">⌘+, settings</span>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, { Menu_A, Menu_B, Menu_C, Menu_D });
