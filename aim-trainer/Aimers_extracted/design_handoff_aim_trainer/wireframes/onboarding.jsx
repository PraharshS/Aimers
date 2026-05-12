// Onboarding / Calibration — minimal gamer aesthetic

const Steps = ({ n, of }) => (
  <div className="row gap-2">
    <div className="label">step {String(n).padStart(2,"0")} / {String(of).padStart(2,"0")}</div>
    <div className="row gap-1">
      {Array.from({length: of}).map((_, i) =>
        <div key={i} style={{ width: 22, height: 2, background: i < n ? "var(--accent)" : "var(--line-2)" }} />
      )}
    </div>
  </div>
);

const Onboard_A = () => (
  <div className="frame">
    <TopBar path="onboard · calibrate" />
    <div className="screen" style={{ padding: 18, gap: 12 }}>
      <div className="row between"><Steps n={2} of={4} /><div className="label">[skip]</div></div>
      <div>
        <div className="display h1">match your in-game sens</div>
        <div className="label mute" style={{ marginTop: 4 }}>drag your mouse 180° between the two markers · we'll do the math</div>
      </div>
      <div className="card-flush flex-1" style={{ position: "relative" }}>
        <div className="playfield" style={{ borderTop: "none" }}>
          <div className="label" style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)" }}>drag here · 180°</div>
          <div className="target target-active" style={{ position: "absolute", left: "10%", top: "50%", transform: "translate(0,-50%)" }} />
          <div className="target" style={{ position: "absolute", right: "10%", top: "50%", transform: "translate(0,-50%)" }} />
          <svg style={{ position: "absolute", inset: 0 }} viewBox="0 0 700 280" preserveAspectRatio="none">
            <path d="M 80 140 Q 350 30 620 140" stroke="var(--accent)" strokeWidth="1.4" fill="none" strokeDasharray="3 4" />
          </svg>
        </div>
      </div>
      <div className="row gap-3">
        {[["in-game sens","0.41","valorant"],["cm / 360°","34.2","mouse travel"],["dpi","800","detected"]].map(([k,v,s],i)=>(
          <div key={i} className="card flex-1" style={{ padding: 12 }}>
            <div className="label">{k}</div>
            <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
              <span className="tnum" style={{ fontSize: 20 }}>{v}</span>
              <span className="label">{s}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="row between">
        <div className="btn btn-sm btn-ghost">← back</div>
        <div className="btn btn-sm btn-primary">next ▸</div>
      </div>
    </div>
  </div>
);

const Onboard_B = () => (
  <div className="frame">
    <TopBar path="onboard · skill" />
    <div className="screen" style={{ padding: 18, gap: 14 }}>
      <Steps n={1} of={3} />
      <div>
        <div className="display h1">where are you at?</div>
        <div className="label mute" style={{ marginTop: 4 }}>we'll set drill difficulty · you can change it anytime</div>
      </div>
      <div className="col gap-2" style={{ flex: 1 }}>
        {[
          ["beginner",      "never trained · casual fps"],
          ["intermediate",  "silver / gold ranked"],
          ["advanced",      "plat / diamond · climbing"],
          ["elite",         "immortal+ · pro-curious"],
        ].map(([k, sub], i) => (
          <div key={i} className={i === 1 ? "card-active" : "card"} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: "1px solid var(--line-2)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {i === 1 && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
            </div>
            <div className="flex-1">
              <div className="tnum" style={{ fontSize: 14, letterSpacing: ".06em", textTransform: "uppercase" }}>{k}</div>
              <div className="label mute" style={{ marginTop: 2 }}>{sub}</div>
            </div>
            <div className="label">0{i+1}</div>
          </div>
        ))}
      </div>
      <div className="row between">
        <div className="label mute">you can re-take the assessment after any session</div>
        <div className="btn btn-sm btn-primary">continue ▸</div>
      </div>
    </div>
  </div>
);

const Onboard_C = () => (
  <div className="frame">
    <TopBar path="onboard · welcome" />
    <div className="screen" style={{ padding: 18, gap: 14 }}>
      <Steps n={1} of={4} />
      <div>
        <div className="display h1">what do you play?</div>
        <div className="label mute" style={{ marginTop: 4 }}>multi-select · we tune drills to your titles</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, flex: 1 }}>
        {[
          ["Valorant","tac fps"],
          ["CS2","tac fps"],
          ["Apex","battle royale"],
          ["Overwatch","hero shooter"],
          ["Marvel Rivals","hero shooter"],
          ["Other","custom"],
        ].map(([g, t], i) => (
          <div key={i} className={i === 0 || i === 2 ? "card-active" : "card"} style={{ padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div className="row between">
              <div style={{ width: 22, height: 22, border: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                {(i === 0 || i === 2) ? "✓" : ""}
              </div>
              <div className="label">0{i+1}</div>
            </div>
            <div>
              <div className="display" style={{ fontSize: 16 }}>{g}</div>
              <div className="label">{t}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="row between">
        <div className="btn btn-sm btn-ghost">skip all</div>
        <div className="btn btn-sm btn-primary">next: goals ▸</div>
      </div>
    </div>
  </div>
);

const Onboard_D = () => {
  const spots = spotsForSeed(5, 7, 620, 240, 40);
  return (
    <div className="frame">
      <TopBar path="onboard · benchmark" />
      <div className="screen" style={{ padding: 16, gap: 12 }}>
        <div className="row between">
          <div>
            <div className="label">benchmark · 30 second test</div>
            <div className="display h1">shoot the dots.</div>
          </div>
          <div className="row gap-3">
            <div><div className="label">elapsed</div><div className="tnum" style={{ fontSize: 24 }}>00:18</div></div>
            <div className="vdivider" style={{ height: 36 }} />
            <div><div className="label">live</div><div className="tnum accent" style={{ fontSize: 24 }}>1,210</div></div>
          </div>
        </div>
        <div className="card-flush flex-1" style={{ position: "relative" }}>
          <div className="playfield" style={{ borderTop: "none" }}>
            {spots.map((p, i) => (
              <div key={i} className={`target target-lg ${i === 0 ? "target-active" : ""} ${i === 2 ? "target-hit" : ""}`}
                style={{ position: "absolute", left: p[0]-14, top: p[1]-14 }} />
            ))}
            <div className="xhair" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}><div className="xhair-dot" /></div>
          </div>
        </div>
        <div className="row gap-3">
          <div className="card flex-1" style={{ padding: 10 }}>
            <div className="label">predicted level</div>
            <div className="display accent" style={{ fontSize: 18, marginTop: 2 }}>INTERMEDIATE</div>
          </div>
          <div className="card flex-1" style={{ padding: 10 }}>
            <div className="label">recommended drills</div>
            <div className="row gap-2" style={{ marginTop: 4 }}>
              {["flick","track","switch"].map((k,i)=><span key={i} className="tag">{k}</span>)}
            </div>
          </div>
          <div className="card flex-1" style={{ padding: 10 }}>
            <div className="label">sens fit</div>
            <div className="tnum" style={{ fontSize: 18, marginTop: 2 }}>34.2 <span className="label">cm/360</span></div>
          </div>
        </div>
        <div className="bar" style={{ width: "100%" }}><div className="bar-fill" style={{ width: "60%" }} /></div>
      </div>
    </div>
  );
};

Object.assign(window, { Onboard_A, Onboard_B, Onboard_C, Onboard_D });
