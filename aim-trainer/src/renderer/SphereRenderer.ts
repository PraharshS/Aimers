import { Renderer, Program, Geometry, Mesh } from 'ogl'

/* ─────────────────────────────────────────────────────────────────────────
   Billboard-sphere renderer using OGL (lightweight WebGL wrapper).

   Each target is a simple quad (-1..1 in local space). The fragment shader
   reconstructs the sphere normal from the 2D fragment position and applies
   Phong lighting — giving the appearance of a real 3D sphere without any
   sphere mesh geometry.

   The canvas is transparent so it overlays the existing Canvas 2D background.
───────────────────────────────────────────────────────────────────────── */

const MAX_SPHERES = 20

// ── Vertex shader ────────────────────────────────────────────────────────
const VERT = /* glsl */ `
attribute vec2 position;   /* quad corner in local space: -1 .. 1 */
attribute vec2 uv;         /* 0 .. 1                              */
attribute vec2 aCenter;    /* screen-space center, CSS pixels     */
attribute float aRadius;   /* screen-space radius, CSS pixels     */
attribute vec3 aColor;
attribute float aActive;

varying vec2  vPos;
varying vec3  vColor;
varying float vActive;

uniform vec2 uResolution;  /* CSS canvas size in pixels */

void main() {
  vPos    = position;
  vColor  = aColor;
  vActive = aActive;

  /* Place quad at aCenter, scaled to aRadius */
  vec2 screenPos = aCenter + position * aRadius;

  /* Screen → clip space (flip Y because WebGL Y is bottom-up) */
  vec2 clip = (screenPos / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;

  gl_Position = vec4(clip, 0.0, 1.0);
}
`

// ── Fragment shader ───────────────────────────────────────────────────────
const FRAG = /* glsl */ `
precision highp float;

varying vec2  vPos;    /* -1 .. 1 local position; sphere edge at dist == 1 */
varying vec3  vColor;
varying float vActive;

uniform float uTime;   /* performance.now() in ms */

void main() {
  float dist = length(vPos);
  if (dist > 1.0) discard;

  /* ── Sphere normal ───────────────────────────────────────────────────── */
  vec3 N = normalize(vec3(vPos.x, vPos.y, sqrt(max(0.0, 1.0 - dist * dist))));

  /* ── Lighting ────────────────────────────────────────────────────────── */
  vec3 L = normalize(vec3(-0.5, 0.8, 0.6));   /* key light: upper-left-front */
  vec3 V = vec3(0.0, 0.0, 1.0);               /* viewer faces +Z             */
  vec3 H = normalize(L + V);                   /* Blinn-Phong half-vector     */

  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), 64.0);
  float rim  = pow(1.0 - max(dot(N, V), 0.0), 2.5);

  vec3 col = vColor * 0.18                /* ambient       */
           + vColor * diff * 0.68         /* diffuse       */
           + vec3(1.0) * spec * 0.55      /* specular      */
           + vColor * rim  * 0.25;        /* rim/back-glow */

  /* ── Active (crosshair-hover) pulse ─────────────────────────────────── */
  if (vActive > 0.5) {
    float pulse = sin(uTime * 0.006) * 0.5 + 0.5;
    col = mix(col, vec3(1.0), pulse * 0.28);
  }

  /* ── Soft anti-aliased edge ──────────────────────────────────────────── */
  float alpha = 1.0 - smoothstep(0.91, 1.0, dist);

  gl_FragColor = vec4(col, alpha);
}
`

// ── Public API ────────────────────────────────────────────────────────────

export type SphereData = {
  sx: number                       // screen-space center X  (CSS pixels)
  sy: number                       // screen-space center Y  (CSS pixels)
  r: number                        // screen-space radius    (CSS pixels)
  rgb: [number, number, number]    // color  0..1 per channel
  active: boolean                  // is the crosshair hovering this target?
}

export class SphereRenderer {
  private renderer: Renderer
  private program:  Program
  private geo:      Geometry
  private mesh:     Mesh

  // Per-instance Float32Arrays (mutated in-place each frame)
  private centers: Float32Array   // 2 floats per instance
  private radii:   Float32Array   // 1 float  per instance
  private colors:  Float32Array   // 3 floats per instance
  private actives: Float32Array   // 1 float  per instance

  readonly canvas: HTMLCanvasElement

  constructor() {
    this.renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    })
    const gl = this.renderer.gl

    // Transparent background so the Canvas 2D below shows through
    gl.clearColor(0, 0, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    this.canvas = gl.canvas as HTMLCanvasElement

    // ── Unit quad (6 vertices, 2 triangles) ──────────────────────────────
    const verts = new Float32Array([-1, -1,  1, -1,  1,  1,  -1, -1,  1,  1, -1,  1])
    const uvs   = new Float32Array([ 0,  0,  1,  0,  1,  1,   0,  0,  1,  1,  0,  1])

    // Pre-allocate per-instance arrays
    this.centers = new Float32Array(MAX_SPHERES * 2)
    this.radii   = new Float32Array(MAX_SPHERES)
    this.colors  = new Float32Array(MAX_SPHERES * 3)
    this.actives = new Float32Array(MAX_SPHERES)

    this.geo = new Geometry(gl, {
      position: { size: 2, data: verts },
      uv:       { size: 2, data: uvs   },
      aCenter:  { size: 2, instanced: 1, data: this.centers },
      aRadius:  { size: 1, instanced: 1, data: this.radii   },
      aColor:   { size: 3, instanced: 1, data: this.colors  },
      aActive:  { size: 1, instanced: 1, data: this.actives },
    })

    this.program = new Program(gl, {
      vertex:   VERT,
      fragment: FRAG,
      uniforms: {
        uResolution: { value: [800, 600] },
        uTime:       { value: 0         },
      },
      transparent: true,
      depthTest:   false,
      depthWrite:  false,
    })

    this.mesh = new Mesh(gl, { geometry: this.geo, program: this.program })
  }

  resize(cssW: number, cssH: number) {
    this.renderer.setSize(cssW, cssH)
    ;(this.program.uniforms as Record<string, { value: unknown }>).uResolution.value = [cssW, cssH]
  }

  render(spheres: SphereData[], now: number) {
    const count = Math.min(spheres.length, MAX_SPHERES)

    for (let i = 0; i < count; i++) {
      const s = spheres[i]
      this.centers[i * 2]     = s.sx
      this.centers[i * 2 + 1] = s.sy
      this.radii[i]            = s.r
      this.colors[i * 3]       = s.rgb[0]
      this.colors[i * 3 + 1]   = s.rgb[1]
      this.colors[i * 3 + 2]   = s.rgb[2]
      this.actives[i]          = s.active ? 1 : 0
    }

    this.geo.instancedCount = count

    if (count > 0) {
      const attrs = this.geo.attributes as Record<string, { needsUpdate: boolean }>
      attrs.aCenter.needsUpdate = true
      attrs.aRadius.needsUpdate = true
      attrs.aColor.needsUpdate  = true
      attrs.aActive.needsUpdate = true
    }

    ;(this.program.uniforms as Record<string, { value: unknown }>).uTime.value = now

    const gl = this.renderer.gl
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (count > 0) {
      this.renderer.render({ scene: this.mesh })
    }
  }

  dispose() {
    this.geo.remove?.()
    try { this.renderer.gl.getExtension('WEBGL_lose_context')?.loseContext() } catch (_) { /* ignore */ }
    this.canvas.remove()
  }
}
