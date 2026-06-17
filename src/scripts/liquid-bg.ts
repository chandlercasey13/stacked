// ─── Warp fragment shader (from Framer AnimatedLiquidBackground) ──────────────
const warpFragmentShader = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}
vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {
  vec3 color1 = c1.rgb * c1.a;
  vec3 color2 = c2.rgb * c2.a;
  vec3 color3 = c3.rgb * c3.a;
  float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);
  float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);
  vec3 blended_color_2 = mix(color1, color2, r1);
  float blended_opacity_2 = mix(c1.a, c2.a, r1);
  vec3 c = mix(blended_color_2, color3, r2);
  float o = mix(blended_opacity_2, c3.a, r2);
  return vec4(c, o);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = .5 * u_time;
  float noise_scale = .0005 + .006 * u_scale;
  uv -= .5;
  uv *= (noise_scale * u_resolution);
  uv = rotate(uv, u_rotation * .5 * PI);
  uv /= u_pixelRatio;
  uv += .5;
  float n1 = noise(uv * 1. + t);
  float n2 = noise(uv * 2. - t);
  float angle = n1 * TWO_PI;
  uv.x += 4. * u_distortion * n2 * cos(angle);
  uv.y += 4. * u_distortion * n2 * sin(angle);
  float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));
  for (float i = 1.; i <= iterations_number; i++) {
    uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);
    uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);
  }
  float proportion = clamp(u_proportion, 0., 1.);
  float shape = 0.;
  float mixer = 0.;
  if (u_shape < .5) {
    vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);
    shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);
    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  } else if (u_shape < 1.5) {
    vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);
    float f = fract(stripes_shape_uv.y);
    shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);
    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);
  } else {
    float sh = 1. - uv.y;
    sh -= .5;
    sh /= (noise_scale * u_resolution.y);
    sh += .5;
    float shape_scaling = .2 * (1. - u_shapeScale);
    shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));
    mixer = shape;
  }
  vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);
  fragColor = vec4(color_mix.rgb, color_mix.a);
}`;

const vertexShaderSource = `#version 300 es
layout(location = 0) in vec4 a_position;
void main() { gl_Position = a_position; }`;

// ─── Tiny color parser ────────────────────────────────────────────────────────
function parseColor(css: string): [number, number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
}

// ─── ShaderMount (vanilla port) ───────────────────────────────────────────────
type Uniforms = Record<string, number | number[]>;

class ShaderMount {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private locs: Record<string, WebGLUniformLocation | null> = {};
  private provided: Uniforms;
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private speed: number;
  private resizeObs: ResizeObserver;
  private dead = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private frag: string,
    uniforms: Uniforms = {},
    speed = 1,
    seed = 0
  ) {
    this.provided = uniforms;
    this.speed = speed;
    this.elapsed = seed;

    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;

    this.init();

    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(canvas);
    this.resize();

    if (speed !== 0) this.kick();
  }

  private compile(type: number, src: string) {
    const sh = this.gl.createShader(type)!;
    this.gl.shaderSource(sh, src);
    this.gl.compileShader(sh);
    if (!this.gl.getShaderParameter(sh, this.gl.COMPILE_STATUS)) {
      console.error(this.gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  private init() {
    const { gl } = this;
    const vert = this.compile(gl.VERTEX_SHADER, vertexShaderSource)!;
    const frag = this.compile(gl.FRAGMENT_SHADER, this.frag)!;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.detachShader(prog, vert);
    gl.detachShader(prog, frag);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    this.program = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    this.locs = {
      u_time: gl.getUniformLocation(prog, "u_time"),
      u_pixelRatio: gl.getUniformLocation(prog, "u_pixelRatio"),
      u_resolution: gl.getUniformLocation(prog, "u_resolution"),
      ...Object.fromEntries(Object.keys(this.provided).map(k => [k, gl.getUniformLocation(prog, k)])),
    };
  }

  private resize() {
    const dpr = window.devicePixelRatio;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.frame(performance.now());
  }

  private applyUniforms() {
    const { gl, locs, provided } = this;
    gl.useProgram(this.program);
    gl.uniform1f(locs.u_time as WebGLUniformLocation, this.elapsed * 0.001);
    gl.uniform1f(locs.u_pixelRatio as WebGLUniformLocation, window.devicePixelRatio);
    gl.uniform2f(locs.u_resolution as WebGLUniformLocation, this.canvas.width, this.canvas.height);
    for (const [k, v] of Object.entries(provided)) {
      const loc = locs[k];
      if (!loc) continue;
      if (Array.isArray(v)) {
        if (v.length === 2) gl.uniform2fv(loc, v);
        else if (v.length === 3) gl.uniform3fv(loc, v);
        else if (v.length === 4) gl.uniform4fv(loc, v);
      } else {
        gl.uniform1f(loc, v);
      }
    }
  }

  private frame = (now: number) => {
    if (this.dead) return;
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.elapsed += dt * this.speed;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.applyUniforms();
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    if (this.speed !== 0) this.rafId = requestAnimationFrame(this.frame);
  };

  private kick() {
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  setSpeed(s: number) {
    this.speed = s;
    if (s !== 0 && this.rafId === null) this.kick();
    if (s === 0 && this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  dispose() {
    this.dead = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObs.disconnect();
    if (this.program) this.gl.deleteProgram(this.program);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initLiquidBg() {
  const canvas = document.getElementById("liquid-bg") as HTMLCanvasElement | null;
  if (!canvas) return;

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function makeUniforms(): Uniforms {
    const dark = isDark();
    // Light mode: white + blue prism
    // Dark mode:  dark navy + blue prism
    const c1 = parseColor(dark ? "#0f1623" : "#FFFFFF");
    const c2 = parseColor(dark ? "#1e3a6e" : "#66B3FF");
    const c3 = parseColor(dark ? "#111827" : "#FFFFFF");
    return {
      u_scale:           0.01,
      u_rotation:        -50 * Math.PI / 180,
      u_color1:          c1,
      u_color2:          c2,
      u_color3:          c3,
      u_proportion:      0.01,
      u_softness:        0.47,
      u_shape:           0,
      u_shapeScale:      0.45,
      u_distortion:      0,
      u_swirl:           0.5,
      u_swirlIterations: 16,
    };
  }

  // Seed the animation further along so the prism is already nicely
  // framed on load instead of drifting into view over the first second.
  const startSeed = -240 * 10;

  let mount = new ShaderMount(canvas, warpFragmentShader, makeUniforms(), 0.2, startSeed);

  // Re-create shader with new colors when theme changes
  const themeObserver = new MutationObserver(() => {
    mount.dispose();
    mount = new ShaderMount(canvas, warpFragmentShader, makeUniforms(), 0.2, startSeed);
    if (isVisible) mount.setSpeed(0.2);
    else mount.setSpeed(0);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // Pause when off-screen to save GPU
  let isVisible = true;
  const observer = new IntersectionObserver(([e]) => {
    isVisible = e.isIntersecting;
    mount.setSpeed(isVisible ? 0.2 : 0);
  }, { threshold: 0.01 });
  observer.observe(canvas);

  return mount;
}
