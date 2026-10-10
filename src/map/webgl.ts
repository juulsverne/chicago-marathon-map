/** Cheap WebGL2 probe, run before downloading MapLibre (which requires WebGL2).
 *  The probe context is released straight away so it does not count against the
 *  browser's context limit. */
export function hasWebGL2(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
