import * as THREE from 'three'

/* ─────────────────────────────────────────────────────────────────────────
   Three.js rectangular tunnel background for the aim trainer.

   Architecture:
   - An infinite corridor of rectangular rings spaced along the Z axis
   - Longitudinal rails connect the rings front-to-back
   - Camera floats inside, auto-dolly forward + subtle pan response
   - Canvas is solid (no alpha), placed behind the 2D overlay canvas
───────────────────────────────────────────────────────────────────────── */

const TUNNEL_W  = 9     // half-width
const TUNNEL_H  = 6     // half-height
const DEPTH     = 100   // total tunnel length
const RING_STEP = 2.5   // Z spacing between rings
const RAIL_STEP = 2     // X/Y spacing between rails

export class ThreeBackground {
  private renderer: THREE.WebGLRenderer
  private scene:    THREE.Scene
  private camera:   THREE.PerspectiveCamera
  private group:    THREE.Group           // rings + rails (auto-dolly by shifting Z)

  readonly canvas: HTMLCanvasElement

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x050a10, 1)
    this.canvas = this.renderer.domElement

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x020508, 0.045)

    this.camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.1, 130)
    this.camera.position.set(0, 0, 0)

    this.group = new THREE.Group()
    this.scene.add(this.group)

    this._build()
  }

  private _addSeg(pts: THREE.Vector3[], mat: THREE.LineBasicMaterial) {
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    this.group.add(new THREE.Line(geo, mat))
  }

  private _build() {
    const W = TUNNEL_W
    const H = TUNNEL_H

    const dimMat  = new THREE.LineBasicMaterial({ color: 0x0d3550, transparent: true, opacity: 0.55 })
    const midMat  = new THREE.LineBasicMaterial({ color: 0x1a5580, transparent: true, opacity: 0.75 })
    const brightMat = new THREE.LineBasicMaterial({ color: 0x2a80b0, transparent: true, opacity: 0.9 })

    // ── Rings ──────────────────────────────────────────────────────────────
    for (let z = 0; z >= -DEPTH; z -= RING_STEP) {
      const isMajor = (Math.round(-z) % 10 === 0)
      const m = isMajor ? brightMat : (Math.round(-z) % 5 === 0 ? midMat : dimMat)
      this._addSeg([
        new THREE.Vector3(-W, -H, z), new THREE.Vector3( W, -H, z),
        new THREE.Vector3( W,  H, z), new THREE.Vector3(-W,  H, z),
        new THREE.Vector3(-W, -H, z),
      ], m)
    }

    // ── Rails — floor ──────────────────────────────────────────────────────
    for (let x = -W; x <= W; x += RAIL_STEP) {
      const m = x === 0 ? midMat : dimMat
      this._addSeg([new THREE.Vector3(x, -H, 0), new THREE.Vector3(x, -H, -DEPTH)], m)
    }
    // ── Rails — ceiling ───────────────────────────────────────────────────
    for (let x = -W; x <= W; x += RAIL_STEP) {
      const m = x === 0 ? midMat : dimMat
      this._addSeg([new THREE.Vector3(x, H, 0), new THREE.Vector3(x, H, -DEPTH)], m)
    }
    // ── Rails — left wall ─────────────────────────────────────────────────
    for (let y = -H; y <= H; y += RAIL_STEP) {
      const m = y === 0 ? midMat : dimMat
      this._addSeg([new THREE.Vector3(-W, y, 0), new THREE.Vector3(-W, y, -DEPTH)], m)
    }
    // ── Rails — right wall ────────────────────────────────────────────────
    for (let y = -H; y <= H; y += RAIL_STEP) {
      const m = y === 0 ? midMat : dimMat
      this._addSeg([new THREE.Vector3(W, y, 0), new THREE.Vector3(W, y, -DEPTH)], m)
    }
  }

  resize(cssW: number, cssH: number) {
    this.renderer.setSize(cssW, cssH)
    this.camera.aspect = cssW / cssH
    this.camera.updateProjectionMatrix()
  }

  render(pan: { x: number; y: number }, now: number) {
    // Auto-dolly: move camera forward then teleport back seamlessly
    const speed    = 0.0005
    const cycle    = RING_STEP            // teleport every ring step
    const forward  = (now * speed) % cycle

    this.camera.position.z = -forward
    // Subtle pan tilt (world-space look offset, not rotation)
    const tx = -pan.x * 0.0004
    const ty =  pan.y * 0.0004
    this.camera.position.x = tx
    this.camera.position.y = ty
    this.camera.lookAt(tx * 0.3, ty * 0.3, this.camera.position.z - 30)

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.dispose()
    this.canvas.remove()
  }
}
