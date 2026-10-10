import type { CustomLayerInterface, CustomRenderMethodInput, Map as MapLibreMap } from "maplibre-gl";
import { LEADERS, type Leader, type LeaderId } from "@/content/race";
import { courseWidth, laneHalfWidth, leaderRadius, pxToMercator, runnerRadius } from "./lane";
import type { LeaderPoint } from "./leader-labels";
import { glColor, type MapPalette } from "./palette";
import { writeLeader, writeRunners, type RouteGeometry, type RunnerField } from "./runner-field";

// The runner stream: one MapLibre custom layer, one gl.POINTS draw call for the
// whole field. Positions are float32 offsets from a fixed origin (the route start);
// the origin is folded into the matrix in float64, which keeps dots on their street
// at full zoom (plain float32 mercator drifts about 2 px at zoom 17.5). Leaders are
// a second, tiny draw with the same program: one larger point each, in its own
// color with a white ring.

const VERTEX = `#version 300 es
layout(location = 0) in vec2 a_pos;  // mercator offset from the origin
layout(location = 1) in vec2 a_off;  // unit normal times lane jitter (-0.5..0.5) or leader side (-1, 1)
uniform mat4 u_matrix;               // MapLibre's main matrix with the origin folded in
uniform float u_spread;              // offset scale along the normal, in mercator units
uniform float u_size;                // point size, device px
void main() {
  gl_Position = u_matrix * vec4(a_pos + a_off * u_spread, 0.0, 1.0);
  gl_PointSize = u_size;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec4 u_fill;     // premultiplied
uniform vec4 u_rim;      // premultiplied
uniform float u_radius;  // dot radius, device px
uniform float u_rimWidth;
uniform float u_size;
out vec4 fragColor;
void main() {
  float d = length(gl_PointCoord - 0.5) * u_size;
  float alpha = 1.0 - smoothstep(u_radius - 0.75, u_radius + 0.75, d);
  float rim = u_rimWidth > 0.0 ? smoothstep(u_radius - u_rimWidth - 0.5, u_radius - u_rimWidth + 0.5, d) : 0.0;
  fragColor = mix(u_fill, u_rim, rim) * alpha;
}`;

const FLOATS_PER_VERTEX = 4;

type Uniforms = Record<"matrix" | "spread" | "size" | "fill" | "rim" | "radius" | "rimWidth", WebGLUniformLocation | null>;

export type RunnerLayerOptions = Readonly<{
  field: RunnerField;
  geom: RouteGeometry;
  palette: MapPalette;
  /** Race time in minutes, read once per frame. */
  time: () => number;
  /** How many runners of the field to draw (the quality tier). */
  count: () => number;
  /** Leaders to draw, in label priority order, read every frame (the pace markers can be toggled). */
  leaders: () => readonly Leader[];
  /** Called every frame with the leader markers on screen (CSS px) and the zoom. */
  onLeaders: (points: LeaderPoint[], zoom: number) => void;
}>;

export type RunnerLayer = CustomLayerInterface & {
  /** Runners drawn in the last frame (read by tests). */
  readonly drawn: number;
  /** Leaders drawn in the last frame (read by tests). */
  readonly leadersDrawn: readonly LeaderId[];
};

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not create a shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    throw new Error(`Runner shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

export function createRunnerLayer(o: RunnerLayerOptions): RunnerLayer {
  let map: MapLibreMap | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let buffer: WebGLBuffer | null = null;
  let leaderVao: WebGLVertexArrayObject | null = null;
  let leaderBuffer: WebGLBuffer | null = null;
  let u: Uniforms | null = null;
  const vertices = new Float32Array(o.field.size * FLOATS_PER_VERTEX);
  const leaderVertices = new Float32Array(LEADERS.length * FLOATS_PER_VERTEX);
  const runnerFill = glColor(o.palette.runner);
  const runnerEdge = glColor(o.palette.runnerEdge);
  const leaderFills = {} as Record<LeaderId, [number, number, number, number]>;
  for (const l of LEADERS) leaderFills[l.id] = glColor(o.palette.leaders[l.id]);
  const leaderEdge = glColor(o.palette.leaderEdge);
  const matrix = new Float32Array(16);
  // The canvas size in CSS px, read on add and on resize rather than every frame.
  let cssWidth = 1;
  let cssHeight = 1;
  const measure = () => {
    if (!map) return;
    const canvas = map.getCanvas();
    cssWidth = canvas.clientWidth || 1;
    cssHeight = canvas.clientHeight || 1;
  };
  let lastTime = Number.NaN;
  let lastCount = -1;
  let drawn = 0;
  let leadersDrawn: LeaderId[] = [];

  const layer: RunnerLayer = {
    id: "runners",
    type: "custom",
    renderingMode: "2d",
    get drawn() {
      return drawn;
    },
    get leadersDrawn() {
      return leadersDrawn;
    },

    onAdd(m, gl) {
      map = m;
      measure();
      m.on("resize", measure);
      const linked = gl.createProgram();
      gl.attachShader(linked, compile(gl, gl.VERTEX_SHADER, VERTEX));
      gl.attachShader(linked, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
      gl.linkProgram(linked);
      if (!gl.getProgramParameter(linked, gl.LINK_STATUS) && !gl.isContextLost()) {
        throw new Error(`Runner program failed to link: ${gl.getProgramInfoLog(linked)}`);
      }
      program = linked;
      const at = (name: string) => gl.getUniformLocation(linked, name);
      u = {
        matrix: at("u_matrix"),
        spread: at("u_spread"),
        size: at("u_size"),
        fill: at("u_fill"),
        rim: at("u_rim"),
        radius: at("u_radius"),
        rimWidth: at("u_rimWidth"),
      };
      const vertexArray = (bytes: number): [WebGLVertexArrayObject, WebGLBuffer] => {
        const array = gl.createVertexArray();
        gl.bindVertexArray(array);
        const data = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, data);
        gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.DYNAMIC_DRAW);
        const stride = FLOATS_PER_VERTEX * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
        gl.bindVertexArray(null);
        return [array, data];
      };
      [vao, buffer] = vertexArray(vertices.byteLength);
      [leaderVao, leaderBuffer] = vertexArray(leaderVertices.byteLength);
      lastTime = Number.NaN; // a re-added layer must upload again
    },

    onRemove(m, gl) {
      // After a context loss these are no-ops; the engine re-adds the layer on restore.
      m.off("resize", measure);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(leaderBuffer);
      gl.deleteVertexArray(leaderVao);
      gl.deleteProgram(program);
      map = null;
      program = null;
      vao = null;
      buffer = null;
      leaderVao = null;
      leaderBuffer = null;
      u = null;
    },

    render(gl: WebGL2RenderingContext, args: CustomRenderMethodInput) {
      if (!map || !program || !u) return;
      const t = o.time();
      const count = o.count();
      if (t !== lastTime || count !== lastCount) {
        drawn = writeRunners(o.field, count, o.geom, t, vertices);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices, 0, drawn * FLOATS_PER_VERTEX);
        lastTime = t;
        lastCount = count;
      }

      // Fold the float64 origin into the matrix, then hand float32 to the GPU.
      const m = args.defaultProjectionData.mainMatrix;
      const [ox, oy] = o.geom.origin;
      for (let k = 0; k < 12; k++) matrix[k] = m[k];
      for (let k = 0; k < 4; k++) matrix[12 + k] = m[12 + k] + m[k] * ox + m[4 + k] * oy;

      const zoom = map.getZoom();
      const ratio = gl.drawingBufferWidth / cssWidth; // the pixel ratio actually applied
      gl.useProgram(program);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(u.matrix, false, matrix);

      if (drawn > 0) {
        const radius = runnerRadius(zoom) * ratio;
        gl.bindVertexArray(vao);
        gl.uniform1f(u.spread, pxToMercator(2 * laneHalfWidth(zoom), zoom));
        gl.uniform1f(u.size, 2 * radius + 2);
        gl.uniform1f(u.radius, radius);
        gl.uniform4fv(u.fill, runnerFill);
        gl.uniform4fv(u.rim, runnerEdge);
        gl.uniform1f(u.rimWidth, zoom >= 13 ? 0.8 * ratio : 0); // v1 outlined dots from Leaflet zoom 14
        gl.drawArrays(gl.POINTS, 0, drawn);
      }

      // Leaders sit 0.2 course widths to one side of the street (v1).
      const spread = pxToMercator(0.2 * courseWidth(zoom), zoom);
      const cssRadius = leaderRadius(zoom);
      const points: LeaderPoint[] = [];
      const shown: number[] = [];
      const leaders = o.leaders();
      leaders.forEach((l, i) => {
        const at = i * FLOATS_PER_VERTEX;
        if (!writeLeader(l, o.geom, t, leaderVertices, at)) return;
        shown.push(i);
        // Project with the float64 matrix to CSS px: the spot the GPU draws.
        const x = ox + leaderVertices[at] + leaderVertices[at + 2] * spread;
        const y = oy + leaderVertices[at + 1] + leaderVertices[at + 3] * spread;
        const w = m[3] * x + m[7] * y + m[15];
        const sx = ((m[0] * x + m[4] * y + m[12]) / w + 1) * 0.5 * cssWidth;
        const sy = (1 - (m[1] * x + m[5] * y + m[13]) / w) * 0.5 * cssHeight;
        points.push({ id: l.id, x: sx, y: sy, r: cssRadius });
      });
      if (shown.length > 0) {
        const radius = cssRadius * ratio;
        gl.bindVertexArray(leaderVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, leaderBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, leaderVertices);
        gl.uniform1f(u.spread, spread);
        gl.uniform1f(u.size, 2 * radius + 2);
        gl.uniform1f(u.radius, radius);
        gl.uniform4fv(u.rim, leaderEdge);
        gl.uniform1f(u.rimWidth, 2 * ratio);
        for (const i of shown) {
          gl.uniform4fv(u.fill, leaderFills[leaders[i].id]);
          gl.drawArrays(gl.POINTS, i, 1);
        }
      }
      gl.bindVertexArray(null);
      leadersDrawn = points.map((p) => p.id);
      o.onLeaders(points, zoom);
    },
  };
  return layer;
}
