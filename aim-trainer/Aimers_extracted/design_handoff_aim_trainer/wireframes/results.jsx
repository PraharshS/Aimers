// Results / Score — minimal gamer aesthetic
// A: Big number hero
// B: Stats breakdown
// C: Vs last 10 comparison
// D: Novel — per-shot replay timeline

const Results_A = () => (
  <div className="frame">
    <TopBar path="results · gridshot" />
    <div className="screen" style={{ padding: "26px 22px", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <div className="row gap-2"><span className="tag tag-accent">new pb</span><span className="label">gridshot · 60s · ended 21:42</span></div>
      <div className="tera accent">9,840</div>
      <div className="label">score</div>
      <div className="bar" style={{ width: 240, marginTop: 4 }}><div className="bar-fill" style={{ width: "82%" }} /></div>
      <div className="label">+1,210 vs prev best</div>
      <div className="row gap-6" style={{ marginTop: 14 }}>
        <div style={{ textAlign: "center" }}><div className="label">accuracy</div><div className="tnum" style={{ fontSize: 26 }}>74%</div></div>
        <div className="vdivider" style={{ height: 44 }} />
        <div style={{ textAlign: "center" }}><div className="label">avg ttk</div><div className="tnum" style={{ fontSize: 26 }}>287ms</div></div>
        <div className="vdivider" style={{ height: 44 }} />
        <div style={{ textAlign: "center" }}><div className="label">best streak</div><div className="tnum" style={{ fontSize: 26 }}>×24</div></div>
      </div>
      <div className="row gap-2" style={{ marginTop: 18 }}>
        <div className="btn btn-sm">[R] retry</div>
        <div className="btn btn-sm">next drill</div>
        <div className="btn btn-sm btn-primary">save run ▸</div>
      </div>
    </div>
  </div>
);

const Results_B = () => (
  <div className="frame">
    <TopBar path="results · breakdown" />
    <div className="screen" style={{ padding: 16, gap: 12 }}>
      <div className="row between">
        <div>
          <div className="label">gridshot · 60s</div>
          <div className="display h1">run complete</div>
        </div>
        <div className="col" style={{ alignItems: "flex-end" }}>
          <div className="label">final score</div>
          <div className="huge accent">9,840</div>
        </div>
      </div>
      <div className="row gap-3" style={{ flex: 1 }}>
        <div className="col gap-2" style={{ width: 200 }}>
          {[
            ["accuracy","74%","+4%"],
            ["avg ttk","287 ms","-18ms"],
            ["best streak","×24","+6"],
            ["targets hit","58 / 78","—"],
            ["overshoot","12 px","↓"],
          ].map(([k,v,d],i)=>(
            <div key={i} className="card" style={{ padding: 10 }}>
              <div className="label">{k}</div>
              <div className="row between" style={{ marginTop: 2 }}>
                <span className="tnum" style={{ fontSize: 17 }}>{v}</span>
                <span className="tnum" style={{ fontSize: 10, color: d === "—" ? "var(--text-3)" : "var(--accent)" }}>{d}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="col flex-1 gap-3">
          <div className="card flex-1">
            <div className="row between"><div className="label">score / time</div><div className="label accent">● this run</div></div>
            <svg width="100%" height="100%" viewBox="0 0 320 120" preserveAspectRatio="none" style={{ marginTop: 6 }}>
              <Axis x1="0" y1="100" x2="320" y2="100" />
              <Axis x1="0" y1="60" x2="320" y2="60" />
              <Axis x1="0" y1="20" x2="320" y2="20" />
              <ChartArea points={[[0,90],[40,75],[80,68],[120,60],[160,52],[200,38],[240,30],[280,22],[320,16]]} baselineY={100} />
              <ChartLine points={[[0,90],[40,75],[80,68],[120,60],[160,52],[200,38],[240,30],[280,22],[320,16]]} color="var(--accent)" w="1.6" />
            </svg>
          </div>
          <div className="card flex-1" style={{ position: "relative" }}>
            <div className="label">hit heatmap</div>
            <div style={{ position: "absolute", inset: 28, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gridAutoRows: "1fr", gap: 2 }}>
              {Array.from({length:32}).map((_,i) => {
                const v = (i * 41 + 7) % 100;
                return <div key={i} style={{ background: `rgba(200,255,0,${v/180 + 0.04})`, border: "1px solid var(--line)" }} />;
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="row between">
        <div className="label">[s] share · [esc] menu</div>
        <div className="row gap-2">
          <div className="btn btn-sm">retry</div>
          <div className="btn btn-sm btn-primary">next ▸</div>
        </div>
      </div>
    </div>
  </div>
);

const Results_C = () => (
  <div className="frame">
    <TopBar path="results · vs last 10" />
    <div className="screen" style={{ padding: 16, gap: 12 }}>
      <div className="row between">
        <div className="display h1">this run vs last 10</div>
        <div className="tag tag-accent">career best</div>
      </div>
      <div className="row gap-3" style={{ flex: 1 }}>
        <div className="card flex-1" style={{ padding: 14 }}>
          <div className="row between"><span className="label">score history</span><span className="label accent">● this run · 9,840</span></div>
          <svg width="100%" height="92%" viewBox="0 0 360 180" preserveAspectRatio="none" style={{ marginTop: 6 }}>
            <Axis x1="20" y1="20" x2="20" y2="160" />
            <Axis x1="20" y1="160" x2="360" y2="160" />
            <Axis x1="20" y1="60" x2="360" y2="60" />
            <Axis x1="20" y1="100" x2="360" y2="100" />
            <ChartLine points={[[40,130],[70,125],[100,110],[130,118],[160,100],[190,95],[220,82],[250,88],[280,68],[310,40]]} color="var(--text-2)" />
            <circle cx="310" cy="40" r="3.5" fill="var(--accent)" />
            <line x1="310" y1="40" x2="310" y2="160" stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="2 3" />
          </svg>
        </div>
        <div className="col gap-2" style={{ width: 210 }}>
          <div className="label">delta vs avg(10)</div>
          {[
            ["score","9,840","+1,210"],
            ["acc","74%","+4%"],
            ["ttk","287ms","-18ms"],
            ["streak","×24","+6"],
            ["misses","20","-7"],
          ].map(([k,v,d],i)=>(
            <div key={i} className="kv">
              <span className="label" style={{ width: 50 }}>{k}</span>
              <span className="tnum" style={{ fontSize: 13 }}>{v}</span>
              <span className="tnum accent" style={{ fontSize: 11 }}>{d}</span>
            </div>
          ))}
          <div className="card-raised" style={{ marginTop: 6 }}>
            <div className="label">verdict</div>
            <div className="display accent" style={{ fontSize: 22 }}>career best</div>
            <div className="label mute" style={{ marginTop: 4 }}>+12% over your last avg</div>
          </div>
          <div className="row gap-2" style={{ marginTop: "auto" }}>
            <div className="btn btn-sm flex-1" style={{ justifyContent: "center" }}>retry</div>
            <div className="btn btn-sm btn-primary flex-1" style={{ justifyContent: "center" }}>save ▸</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Novel — per-shot replay timeline
const Results_D = () => {
  // synthesize 30 shots: [ttkMs, hit, dev]
  let s = 17;
  const shots = Array.from({ length: 30 }, () => {
    s = (s * 9301 + 49297) % 233280;
    const ttk = 220 + (s % 240);
    s = (s * 9301 + 49297) % 233280;
    const hit = (s % 100) > 22 ? 1 : 0;
    s = (s * 9301 + 49297) % 233280;
    const dev = (s % 30) + 2;
    return [ttk, hit, dev];
  });
  return (
    <div className="frame">
      <TopBar path="results · replay" />
      <div className="screen" style={{ padding: 14, gap: 10 }}>
        <div className="row between">
          <div>
            <div className="label">flick · 60s</div>
            <div className="display h1">30 shots</div>
          </div>
          <div className="row gap-3">
            <div><div className="label">final</div><div className="huge accent">9,840</div></div>
            <div className="vdivider" style={{ height: 40 }} />
            <div><div className="label">acc</div><div className="huge">74%</div></div>
            <div className="vdivider" style={{ height: 40 }} />
            <div><div className="label">avg ttk</div><div className="huge">287ms</div></div>
          </div>
        </div>
        {/* timeline */}
        <div className="card-flush flex-1" style={{ padding: 14, position: "relative" }}>
          <div className="row between" style={{ marginBottom: 8 }}>
            <div className="label">shot · timeline</div>
            <div className="label">scrub · hover any bar</div>
          </div>
          <div className="row" style={{ height: "calc(100% - 56px)", gap: 4, alignItems: "flex-end" }}>
            {shots.map((sh, i) => {
              const [ttk, hit, dev] = sh;
              const h = Math.round((ttk / 500) * 100);
              return (
                <div key={i} className="col" style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                  <div style={{
                    width: "70%",
                    height: `${h}%`,
                    background: hit ? "var(--text)" : "transparent",
                    border: hit ? "none" : "1px solid var(--danger)",
                    borderRadius: 1,
                  }} />
                  <div className="label" style={{ fontSize: 8 }}>{i+1}</div>
                </div>
              );
            })}
          </div>
          <div className="row between" style={{ marginTop: 8 }}>
            <div className="label">faster ↓ · slower ↑ · ✗ miss</div>
            <div className="row gap-3">
              <div className="row gap-2"><span style={{ width:8, height:8, background: "var(--text)" }} /><span className="label">hit</span></div>
              <div className="row gap-2"><span style={{ width:8, height:8, border: "1px solid var(--danger)" }} /><span className="label">miss</span></div>
            </div>
          </div>
        </div>
        <div className="row between">
          <div className="label">⏵ playback · 0.5× · 1× · 2×</div>
          <div className="row gap-2">
            <div className="btn btn-sm">retry</div>
            <div className="btn btn-sm btn-primary">next ▸</div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Results_A, Results_B, Results_C, Results_D });
