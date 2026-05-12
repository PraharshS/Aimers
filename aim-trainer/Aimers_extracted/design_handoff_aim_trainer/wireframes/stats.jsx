// Stats & Progression — minimal gamer aesthetic
const Stats_A = () => (
  <div className="frame">
    <TopBar path="stats · overview" />
    <TabNav items={["overview","by mode","sessions","leaderboard"]} active={0} right={<div className="label" style={{ padding: "0 14px" }}>range · 30d ▾</div>} />
    <div className="screen" style={{ padding: 16, gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          ["avg score","7,210",[30,28,24,20,18,15,12],"+8%"],
          ["accuracy","68.4%",[40,36,32,30,28,26,24],"+2%"],
          ["avg ttk","312ms",[30,28,26,30,28,26,24],"-14ms"],
          ["hours","42.5",[20,22,24,26,28,30,34],"+6.2"],
        ].map(([t,v,pts,d],i)=>(
          <div key={i} className="card" style={{ padding: 12 }}>
            <div className="row between"><div className="label">{t}</div><div className="label accent">{d}</div></div>
            <div className="tnum" style={{ fontSize: 22, marginTop: 4 }}>{v}</div>
            <svg width="100%" height="32" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ marginTop: 4 }}>
              <ChartLine points={pts.map((y,j)=>[j*100/(pts.length-1),y])} color="var(--accent)" />
            </svg>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 14, flex: 1 }}>
        <div className="row between"><div className="label-md">score · last 30 days</div><div className="row gap-3"><span className="label accent">● all modes</span><span className="label">○ flick</span></div></div>
        <svg width="100%" height="86%" viewBox="0 0 600 160" preserveAspectRatio="none" style={{ marginTop: 6 }}>
          <Axis x1="20" y1="20" x2="20" y2="140" /><Axis x1="20" y1="140" x2="600" y2="140" />
          <Axis x1="20" y1="80" x2="600" y2="80" />
          <ChartArea points={[[40,110],[100,100],[160,105],[220,90],[280,82],[340,72],[400,75],[460,58],[520,52],[580,38]]} baselineY={140} />
          <ChartLine points={[[40,110],[100,100],[160,105],[220,90],[280,82],[340,72],[400,75],[460,58],[520,52],[580,38]]} color="var(--accent)" w="1.6" />
          <ChartLine points={[[40,118],[100,112],[160,108],[220,102],[280,98],[340,92],[400,88],[460,82],[520,78],[580,72]]} color="var(--text-2)" dashed />
        </svg>
      </div>
      <div className="row gap-2">
        {[["gridshot","9,840","pb"],["flick","6,210",""],["track","4,820",""],["switch","5,140",""],["reflex","186ms","pb"]].map(([m,s,t],i)=>(
          <div key={i} className="card flex-1" style={{ padding: 10 }}>
            <div className="row between"><div className="label">{m}</div>{t && <span className="tag tag-accent" style={{ fontSize: 8 }}>{t}</span>}</div>
            <div className="tnum" style={{ fontSize: 16, marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Stats_B = () => (
  <div className="frame">
    <TopBar path="stats · weakness" />
    <TabNav items={["overview","by mode","sessions","leaderboard"]} active={1} />
    <div className="screen" style={{ padding: 16, gap: 12, flexDirection: "row" }}>
      <div className="col flex-1 gap-2">
        <div className="row between"><div className="display h1">your weak spots</div><div className="label">last 1,200 shots</div></div>
        <div className="card-flush flex-1" style={{ position: "relative" }}>
          <div className="label" style={{ position: "absolute", top: 10, left: 12, zIndex: 2 }}>screen-relative heatmap</div>
          <div style={{ position: "absolute", inset: 30, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "repeat(8, 1fr)", gap: 1 }}>
            {Array.from({length: 96}).map((_, i) => {
              const x = i % 12, y = Math.floor(i / 12);
              const dx = x - 5.5, dy = y - 3.5;
              const v = Math.max(0, 1 - Math.sqrt(dx*dx + dy*dy)/5);
              const weak = (x >= 9 && y >= 5) || (x <= 2 && y <= 1);
              return <div key={i} style={{
                background: weak ? `rgba(255,93,93,${0.2 + v*0.5})` : `rgba(200,255,0,${v*0.32})`,
                border: "1px solid var(--line)"
              }} />;
            })}
          </div>
        </div>
      </div>
      <div className="col gap-2" style={{ width: 220 }}>
        <div className="label">drills to fix</div>
        {[
          ["Far flick · right","↗","42% miss"],
          ["Cross-screen flick","↙","31% miss"],
          ["Anti-flick · left","↖","28% miss"],
          ["Vertical track","↕","slow ttk"],
        ].map(([n, a, sub], i) => (
          <div key={i} className="card" style={{ padding: 10 }}>
            <div className="row between"><span style={{ fontSize: 12 }}>{n}</span><span className="tnum accent">{a}</span></div>
            <div className="label" style={{ marginTop: 2 }}>{sub}</div>
          </div>
        ))}
        <div className="btn btn-sm btn-primary" style={{ marginTop: 6, justifyContent: "center" }}>build weakness playlist ▸</div>
      </div>
    </div>
  </div>
);

const Stats_C = () => {
  const days = Array.from({length: 84}, (_, i) => (i * 17 + 3) % 11);
  return (
    <div className="frame">
      <TopBar path="stats · streak" />
      <TabNav items={["overview","by mode","sessions","leaderboard"]} active={2} />
      <div className="screen" style={{ padding: 18, gap: 14 }}>
        <div className="row between">
          <div>
            <div className="label">current streak</div>
            <div className="display" style={{ fontSize: 36, lineHeight: 1 }}>06 <span className="mute" style={{ fontSize: 16 }}>days</span></div>
          </div>
          <div className="col" style={{ alignItems: "flex-end" }}>
            <div className="label">longest · 2026</div>
            <div className="tnum" style={{ fontSize: 26 }}>28 d</div>
          </div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="row between"><div className="label">last 12 weeks</div><div className="row gap-2"><span className="label">less</span><div className="row gap-1">{[0,1,2,3,4].map(v=><div key={v} style={{ width: 10, height: 10, background: v === 0 ? "transparent" : `rgba(200,255,0,${0.15 + v * 0.18})`, border: "1px solid var(--line)" }} />)}</div><span className="label">more</span></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 3, marginTop: 8 }}>
            {Array.from({length: 12}).map((_, w) => (
              <div key={w} style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 3 }}>
                {Array.from({length: 7}).map((_, d) => {
                  const v = days[w * 7 + d];
                  return <div key={d} style={{
                    width: "100%", aspectRatio: "1",
                    background: v === 0 ? "transparent" : `rgba(200,255,0,${0.15 + v * 0.06})`,
                    border: "1px solid var(--line)",
                    borderRadius: 1
                  }} />;
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="row gap-3">
          <div className="card flex-1" style={{ padding: 12 }}>
            <div className="label">today's goal</div>
            <div className="row between" style={{ marginTop: 4 }}><span style={{ fontSize: 13 }}>play 15 min · 2 modes</span><span className="tnum">09 / 15 min</span></div>
            <div className="bar" style={{ marginTop: 6 }}><div className="bar-fill" style={{ width: "60%" }} /></div>
          </div>
          <div className="card" style={{ padding: 12, width: 210 }}>
            <div className="label">badges · 04 / 12</div>
            <div className="row gap-2" style={{ marginTop: 6 }}>
              {["◇","◆","◇","◆"].map((b,i)=><div key={i} style={{ width: 26, height: 26, border: "1px solid var(--accent)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{b}</div>)}
              <div style={{ width: 26, height: 26, border: "1px dashed var(--line-2)", color: "var(--text-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>?</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stats_D = () => {
  const labels = ["flick","track","switch","reflex","spray","precision"];
  const vals = [.72, .55, .65, .80, .42, .68];
  const cx = 110, cy = 100, R = 70;
  const ring = (k) => labels.map((_, i) => {
    const a = (i / labels.length) * Math.PI * 2 - Math.PI/2;
    return [cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k];
  });
  const pts = vals.map((v, i) => {
    const a = (i / labels.length) * Math.PI * 2 - Math.PI/2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v];
  });
  const toPath = (arr) => arr.map((p, i) => `${i===0?"M":"L"} ${p[0]} ${p[1]}`).join(" ") + " Z";
  return (
    <div className="frame">
      <TopBar path="stats · profile" />
      <TabNav items={["overview","by mode","sessions","leaderboard"]} active={3} />
      <div className="screen" style={{ padding: 16, flexDirection: "row", gap: 14 }}>
        <div className="card" style={{ width: 240, padding: 14 }}>
          <div className="label">skill profile</div>
          <svg width="100%" height="200" viewBox="0 0 220 200">
            {[.33,.66,1].map(k => <path key={k} d={toPath(ring(k))} stroke="var(--line)" fill="none" />)}
            {labels.map((l, i) => {
              const a = (i / labels.length) * Math.PI * 2 - Math.PI/2;
              return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a)*R} y2={cy + Math.sin(a)*R} stroke="var(--line)" />;
            })}
            <path d={toPath(pts)} stroke="var(--accent)" strokeWidth="1.4" fill="var(--accent)" fillOpacity=".12" />
            {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill="var(--accent)" />)}
            {labels.map((l, i) => {
              const a = (i / labels.length) * Math.PI * 2 - Math.PI/2;
              const x = cx + Math.cos(a) * (R + 14);
              const y = cy + Math.sin(a) * (R + 14) + 3;
              return <text key={i} x={x} y={y} fontFamily="var(--mono)" fontSize="9" textAnchor="middle" fill="var(--text-3)" style={{ letterSpacing: ".1em", textTransform: "uppercase" }}>{l}</text>;
            })}
          </svg>
          <div className="kv"><span className="label">composite</span><span className="tnum">63.7</span></div>
        </div>
        <div className="col flex-1 gap-3">
          <div className="row between">
            <div><div className="label">current rank</div><div className="display" style={{ fontSize: 26, color: "var(--accent)" }}>PLAT II <span className="tnum mute" style={{ fontSize: 14 }}>· 1,420 rr</span></div></div>
            <div className="tag">top 14% global</div>
          </div>
          <div className="card flex-1" style={{ padding: 14, position: "relative" }}>
            <div className="label">climb</div>
            <div className="col" style={{ position: "absolute", inset: 28, justifyContent: "space-between" }}>
              {[
                ["IMMORTAL","2,500"],
                ["DIAMOND","2,000"],
                ["PLATINUM","1,400"],
                ["GOLD","900"],
                ["SILVER","400"],
              ].map(([r, rr], i) => {
                const me = r === "PLATINUM";
                return (
                  <div key={i} className="row gap-3" style={{
                    padding: "8px 12px",
                    background: me ? "var(--bg-3)" : "transparent",
                    border: me ? "1px solid var(--accent)" : "1px solid var(--line)",
                    borderRadius: 2
                  }}>
                    <div style={{ width: 8, height: 8, transform: "rotate(45deg)", background: me ? "var(--accent)" : "transparent", border: "1px solid var(--line-2)" }} />
                    <div className="tnum" style={{ fontSize: 12, letterSpacing: ".12em", flex: 1 }}>{r}</div>
                    <div className="label">{rr} rr</div>
                    {me && <div className="label accent">▸ you</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="row gap-3">
            <div className="card flex-1"><div className="label">next rank in</div><div className="tnum" style={{ fontSize: 18, marginTop: 2 }}>+580 rr</div></div>
            <div className="card flex-1"><div className="label">weekly delta</div><div className="tnum accent" style={{ fontSize: 18, marginTop: 2 }}>+42 ↑</div></div>
            <div className="card flex-1"><div className="label">peak '26</div><div className="tnum" style={{ fontSize: 18, marginTop: 2 }}>DIAMOND IV</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Stats_A, Stats_B, Stats_C, Stats_D });
