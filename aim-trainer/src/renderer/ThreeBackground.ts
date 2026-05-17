import * as THREE from 'three'

export type BackgroundType = 'tunnel' | 'dojo' | 'bunker' | 'mars'

/* ─────────────────────────────────────────────────────────────────────────
   Four static Three.js backgrounds for the aim trainer.
   Switch at runtime via setBackground(type).
───────────────────────────────────────────────────────────────────────── */

// ── Helpers ───────────────────────────────────────────────────────────────

function makeTex(
  w: number, h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
  rx = 1, ry = 1,
): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  draw(c.getContext('2d')!)
  const t = new THREE.CanvasTexture(c)
  if (rx !== 1 || ry !== 1) {
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
  }
  return t
}

// ── Tunnel constants ───────────────────────────────────────────────────────
const TUNNEL_W  = 9
const TUNNEL_H  = 6
const DEPTH     = 100
const RING_STEP = 2.5
const RAIL_STEP = 2

export class ThreeBackground {
  private renderer: THREE.WebGLRenderer
  private scene:    THREE.Scene
  private camera:   THREE.PerspectiveCamera
  private group:    THREE.Group

  // Base camera pose per background (set in each _build method)
  private _baseX   = 0
  private _baseY   = 0
  private _baseZ   = 0
  private _lookAtY = 0

  readonly canvas: HTMLCanvasElement

  constructor(type: BackgroundType = 'tunnel') {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.canvas = this.renderer.domElement

    this.scene  = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 500)
    this.group  = new THREE.Group()
    this.scene.add(this.group)

    this.setBackground(type)
  }

  setBackground(type: BackgroundType) {
    this._clearGroup()
    // Remove non-group scene children (lights, etc.)
    const extras = this.scene.children.filter(c => c !== this.group)
    extras.forEach(c => this.scene.remove(c))
    this.scene.fog = null

    switch (type) {
      case 'tunnel': this._buildTunnel(); break
      case 'dojo':   this._buildDojo();   break
      case 'bunker': this._buildBunker(); break
      case 'mars':   this._buildMars();   break
    }

    this.renderer.render(this.scene, this.camera)
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private _clearGroup() {
    this.group.traverse(child => {
      if (child === this.group) return
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const m of mats) {
          const lm = m as THREE.MeshLambertMaterial
          if (lm.map) lm.map.dispose()
          m.dispose()
        }
      } else if (child instanceof THREE.Line) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    })
    while (this.group.children.length > 0) this.group.remove(this.group.children[0])
  }

  // ── TUNNEL ─────────────────────────────────────────────────────────────────

  private _line(pts: THREE.Vector3[], mat: THREE.LineBasicMaterial) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    this.group.add(new THREE.Line(geo, mat))
  }

  private _buildTunnel() {
    this._baseX = 0; this._baseY = 0; this._baseZ = 0; this._lookAtY = 0
    this.renderer.setClearColor(0x050a10, 1)
    this.scene.fog = new THREE.FogExp2(0x020508, 0.045)
    this.camera.position.set(0, 0, 0)
    this.camera.lookAt(0, 0, -1)

    const W = TUNNEL_W, H = TUNNEL_H
    const dim    = new THREE.LineBasicMaterial({ color: 0x0d3550, transparent: true, opacity: 0.55 })
    const mid    = new THREE.LineBasicMaterial({ color: 0x1a5580, transparent: true, opacity: 0.75 })
    const bright = new THREE.LineBasicMaterial({ color: 0x2a80b0, transparent: true, opacity: 0.9  })

    for (let z = 0; z >= -DEPTH; z -= RING_STEP) {
      const m = (Math.round(-z) % 10 === 0) ? bright : (Math.round(-z) % 5 === 0 ? mid : dim)
      this._line([
        new THREE.Vector3(-W, -H, z), new THREE.Vector3( W, -H, z),
        new THREE.Vector3( W,  H, z), new THREE.Vector3(-W,  H, z),
        new THREE.Vector3(-W, -H, z),
      ], m)
    }
    for (let x = -W; x <= W; x += RAIL_STEP) {
      const m = x === 0 ? mid : dim
      this._line([new THREE.Vector3(x, -H, 0), new THREE.Vector3(x, -H, -DEPTH)], m)
      this._line([new THREE.Vector3(x,  H, 0), new THREE.Vector3(x,  H, -DEPTH)], m)
    }
    for (let y = -H; y <= H; y += RAIL_STEP) {
      const m = y === 0 ? mid : dim
      this._line([new THREE.Vector3(-W, y, 0), new THREE.Vector3(-W, y, -DEPTH)], m)
      this._line([new THREE.Vector3( W, y, 0), new THREE.Vector3( W, y, -DEPTH)], m)
    }
  }

  // ── DOJO ──────────────────────────────────────────────────────────────────

  private _buildDojo() {
    // Camera raised to y=2, shorter room (D=18), lookAt tilted up so back wall dominates
    this._baseX = 0; this._baseY = 2.0; this._baseZ = 5; this._lookAtY = 3.0
    this.renderer.setClearColor(0x1a0f07, 1)
    this.scene.fog = new THREE.Fog(0x1a0f07, 10, 26)
    this.camera.position.set(0, 2.0, 5)
    this.camera.lookAt(0, 3.0, -13)

    this.scene.add(new THREE.AmbientLight(0xffe0a0, 0.5))
    const key = new THREE.PointLight(0xffcc80, 1.6, 24)
    key.position.set(0, 6.5, -5); this.scene.add(key)
    const fill = new THREE.PointLight(0xfff0d0, 0.7, 20)
    fill.position.set(0, 3.5, -14); this.scene.add(fill)

    const W = 9, H = 8, D = 18

    // Tatami — olive-green woven mat
    const tatami = makeTex(128, 128, ctx => {
      ctx.fillStyle = '#8a9860'
      ctx.fillRect(0, 0, 128, 128)
      ctx.strokeStyle = '#5a6840'; ctx.lineWidth = 2.5
      ctx.strokeRect(4, 4, 59, 120)
      ctx.strokeRect(65, 4, 59, 120)
      ctx.strokeStyle = '#7a8852'; ctx.lineWidth = 0.7
      for (let y = 10; y < 128; y += 7) {
        ctx.beginPath(); ctx.moveTo(5, y); ctx.lineTo(62, y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(66, y); ctx.lineTo(123, y); ctx.stroke()
      }
    }, 4, 5)

    // Wood planks — dark panels with grain
    const wood = makeTex(64, 256, ctx => {
      ctx.fillStyle = '#3e2010'
      ctx.fillRect(0, 0, 64, 256)
      ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 2
      for (let y = 0; y < 256; y += 64) ctx.strokeRect(3, y + 3, 58, 58)
      ctx.strokeStyle = '#4e2a14'; ctx.lineWidth = 0.5
      for (let y = 6; y < 256; y += 9) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y + (Math.random() - 0.5) * 2); ctx.stroke()
      }
    }, 2, 3)

    // Shoji screen — paper with warm backlight grid
    const shoji = makeTex(256, 256, ctx => {
      const g = ctx.createRadialGradient(128, 90, 12, 128, 128, 150)
      g.addColorStop(0, '#fff8e8'); g.addColorStop(1, '#e8d4a0')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
      ctx.strokeStyle = '#5a3810'; ctx.lineWidth = 3.5; ctx.strokeRect(6, 6, 244, 244)
      ctx.lineWidth = 2
      for (let x = 6; x <= 250; x += 62)  { ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, 250); ctx.stroke() }
      for (let y = 6; y <= 250; y += 62)  { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(250, y); ctx.stroke() }
      ctx.lineWidth = 0.8; ctx.strokeStyle = '#8a6030'
      for (let x = 6; x <= 250; x += 20.67) { ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, 250); ctx.stroke() }
      for (let y = 6; y <= 250; y += 20.67) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(250, y); ctx.stroke() }
    }, 2, 1.5)

    // Floor
    const floorM = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2, D),
      new THREE.MeshLambertMaterial({ map: tatami }),
    )
    floorM.rotation.x = -Math.PI / 2
    floorM.position.set(0, 0, -D / 2 + 5)
    this.group.add(floorM)

    // Ceiling
    const ceilM = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2, D),
      new THREE.MeshLambertMaterial({ map: wood }),
    )
    ceilM.rotation.x = Math.PI / 2
    ceilM.position.set(0, H, -D / 2 + 5)
    this.group.add(ceilM)

    // Back wall — shoji screens
    const backM = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2, H),
      new THREE.MeshLambertMaterial({ map: shoji, emissive: new THREE.Color(0x503010), emissiveIntensity: 0.30 }),
    )
    backM.position.set(0, H / 2, -D + 5)
    this.group.add(backM)

    // Left wall
    const leftM = new THREE.Mesh(
      new THREE.PlaneGeometry(D, H),
      new THREE.MeshLambertMaterial({ map: wood }),
    )
    leftM.rotation.y = Math.PI / 2
    leftM.position.set(-W, H / 2, -D / 2 + 5)
    this.group.add(leftM)

    // Right wall
    const rightM = new THREE.Mesh(
      new THREE.PlaneGeometry(D, H),
      new THREE.MeshLambertMaterial({ map: wood }),
    )
    rightM.rotation.y = -Math.PI / 2
    rightM.position.set(W, H / 2, -D / 2 + 5)
    this.group.add(rightM)
  }

  // ── BUNKER ────────────────────────────────────────────────────────────────

  private _buildBunker() {
    this._baseX = 0; this._baseY = 2.0; this._baseZ = 5; this._lookAtY = 3.0
    this.renderer.setClearColor(0x6a9ac0, 1)
    this.scene.fog = new THREE.Fog(0x6a9ac0, 10, 26)
    this.camera.position.set(0, 2.0, 5)
    this.camera.lookAt(0, 3.0, -13)

    this.scene.add(new THREE.AmbientLight(0xc8dff0, 0.55))
    const sun = new THREE.DirectionalLight(0xeef5ff, 1.3)
    sun.position.set(8, 25, 5); this.scene.add(sun)
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x606870, 0.4))

    const W = 11, H = 8, D = 18

    // Concrete — speckled gray with cracks
    const concrete = makeTex(128, 128, ctx => {
      ctx.fillStyle = '#888c92'; ctx.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 500; i++) {
        const x = Math.random() * 128, y = Math.random() * 128
        const v = 120 + Math.floor(Math.random() * 36)
        ctx.fillStyle = `rgb(${v},${v},${v + 3})`
        ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
      }
      ctx.strokeStyle = '#606468'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(26, 128); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(82, 0); ctx.lineTo(78, 128); ctx.stroke()
    }, 5, 3)

    // Checkered range tiles — classic target-range wall
    const checker = makeTex(128, 128, ctx => {
      const sz = 32
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#909098' : '#b2b2ba'
        ctx.fillRect(c * sz, r * sz, sz, sz)
      }
      ctx.strokeStyle = '#686870'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * sz, 0); ctx.lineTo(i * sz, 128); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i * sz); ctx.lineTo(128, i * sz); ctx.stroke()
      }
    }, 8, 5)

    // Sky dome (inside-out sphere)
    this.group.add(new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide }),
    ))

    // Floor
    const floorM = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2, D),
      new THREE.MeshLambertMaterial({ map: concrete }),
    )
    floorM.rotation.x = -Math.PI / 2
    floorM.position.set(0, 0, -D / 2 + 5)
    this.group.add(floorM)

    // Left wall — checkered
    const leftM = new THREE.Mesh(
      new THREE.PlaneGeometry(D, H),
      new THREE.MeshLambertMaterial({ map: checker }),
    )
    leftM.rotation.y = Math.PI / 2
    leftM.position.set(-W, H / 2, -D / 2 + 5)
    this.group.add(leftM)

    // Right wall — checkered
    const rightM = new THREE.Mesh(
      new THREE.PlaneGeometry(D, H),
      new THREE.MeshLambertMaterial({ map: checker }),
    )
    rightM.rotation.y = -Math.PI / 2
    rightM.position.set(W, H / 2, -D / 2 + 5)
    this.group.add(rightM)

    // Back wall — concrete
    const backM = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 2, H),
      new THREE.MeshLambertMaterial({ map: concrete }),
    )
    backM.position.set(0, H / 2, -D + 5)
    this.group.add(backM)
  }

  // ── MARS ──────────────────────────────────────────────────────────────────

  private _buildMars() {
    this._baseX = 0; this._baseY = 2.5; this._baseZ = 4; this._lookAtY = 4.0
    this.renderer.setClearColor(0x3a1808, 1)
    this.scene.fog = new THREE.FogExp2(0x6a2810, 0.025)
    this.camera.position.set(0, 2.5, 4)
    this.camera.lookAt(0, 4.0, -10)

    this.scene.add(new THREE.HemisphereLight(0xff6020, 0x6a2008, 0.65))
    const sun = new THREE.DirectionalLight(0xffcc80, 1.5)
    sun.position.set(30, 40, -10); this.scene.add(sun)

    // Mars surface — red sandy patches
    const surface = makeTex(256, 256, ctx => {
      ctx.fillStyle = '#b85c30'; ctx.fillRect(0, 0, 256, 256)
      for (let i = 0; i < 280; i++) {
        const x = Math.random() * 256, y = Math.random() * 256
        const sz = 5 + Math.random() * 22
        ctx.fillStyle = Math.random() > 0.5 ? '#8a4020' : '#c87040'
        ctx.beginPath()
        ctx.ellipse(x, y, sz, sz * 0.55, Math.random() * Math.PI, 0, Math.PI * 2)
        ctx.fill()
      }
    }, 12, 12)

    // Arena wall — layered rock strata
    const rock = makeTex(256, 128, ctx => {
      ctx.fillStyle = '#7a3820'; ctx.fillRect(0, 0, 256, 128)
      for (let y = 0; y < 128; y += 12) {
        const v = 80 + Math.floor(Math.random() * 40)
        ctx.fillStyle = `rgb(${v + 40},${v},${v - 20})`
        ctx.fillRect(0, y, 256, 8 + Math.random() * 5)
      }
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * 256, y = Math.random() * 128
        ctx.strokeStyle = 'rgba(40,15,5,0.4)'; ctx.lineWidth = 0.5 + Math.random()
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 30, y + Math.random() * 20); ctx.stroke()
      }
    }, 4, 2)

    // Planet surface
    const planetTex = makeTex(256, 256, ctx => {
      const g = ctx.createRadialGradient(80, 70, 15, 128, 128, 128)
      g.addColorStop(0, '#e8c090'); g.addColorStop(0.5, '#c08050'); g.addColorStop(1, '#703010')
      ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
      ctx.globalAlpha = 0.35
      for (let y = 20; y < 256; y += 30) {
        ctx.fillStyle = '#904020'; ctx.fillRect(0, y, 256, 8 + Math.random() * 8)
      }
      ctx.globalAlpha = 1
    })

    // Sky dome
    this.group.add(new THREE.Mesh(
      new THREE.SphereGeometry(200, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x4a1808, side: THREE.BackSide }),
    ))

    // Floor
    const floorM = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshLambertMaterial({ map: surface, color: 0xc06030 }),
    )
    floorM.rotation.x = -Math.PI / 2
    floorM.position.set(0, 0, -20)
    this.group.add(floorM)

    // Curved arena wall — cylinder open at top
    const arena = new THREE.Mesh(
      new THREE.CylinderGeometry(20, 20, 14, 28, 1, true),
      new THREE.MeshLambertMaterial({ map: rock, side: THREE.BackSide }),
    )
    arena.position.set(0, 5, -10)
    this.group.add(arena)

    // Distant planet
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(18, 28, 28),
      new THREE.MeshLambertMaterial({ map: planetTex }),
    )
    planet.position.set(-38, 48, -130)
    this.group.add(planet)
  }

  // ── Common API ────────────────────────────────────────────────────────────

  resize(cssW: number, cssH: number) {
    this.renderer.setSize(cssW, cssH)
    this.camera.aspect = cssW / cssH
    this.camera.updateProjectionMatrix()
    this.renderer.render(this.scene, this.camera)
  }

  render(pan: { x: number; y: number }, _now: number) {
    // Parallax: camera drifts opposite to pan so the 3D scene feels anchored in space.
    // tanh clamps large pan values to ±1 smoothly.
    const tx = Math.tanh(-pan.x * 0.0018) * 1.4
    const ty = Math.tanh( pan.y * 0.0018) * 0.8
    this.camera.position.set(
      this._baseX + tx,
      this._baseY + ty,
      this._baseZ,
    )
    this.camera.lookAt(tx * 0.35, this._lookAtY + ty * 0.35, this._baseZ - 35)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this._clearGroup()
    this.renderer.dispose()
    this.canvas.remove()
  }
}
