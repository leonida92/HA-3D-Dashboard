import * as THREE from 'three';

/**
 * Converts Color Temperature (Kelvin) to RGB Color
 * Approximate algorithm for 1000K to 40000K
 */
export function kelvinToColor(kelvin: number): THREE.Color {
  let temp = kelvin / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
    }
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    b = 255;
  }

  const clamp = (v: number) => Math.min(255, Math.max(0, v)) / 255;
  return new THREE.Color(clamp(r), clamp(g), clamp(b));
}
