import type { TrackDefinition } from '../../core/types';

/**
 * Copa Verão 5/5 — Ponta do Farol
 * Final da copa: subida de península, hairpin técnico e descida longa com boost.
 */
export const summerLighthouse: TrackDefinition = {
  id: 'summer_lighthouse',
  name: 'Ponta do Farol',
  theme: 'beach',
  laps: 3,
  description:
    'Final da Copa Verão: subida forte até o farol, hairpin no alto, descida rápida e reta final com boost.',
  difficulty: 4,
  controlPoints: [
    { x: 0, y: 0, z: 0 },
    { x: -14, y: 0, z: -88 },
    { x: 12, y: 4, z: -174 },
    { x: 72, y: 10, z: -238 },
    { x: 145, y: 17, z: -270 },
    { x: 220, y: 24, z: -242 },
    { x: 270, y: 28, z: -178 },
    { x: 262, y: 26, z: -112 },
    { x: 220, y: 22, z: -68 },
    { x: 168, y: 17, z: -86 },
    { x: 125, y: 15, z: -50 },
    { x: 142, y: 20, z: 15 },
    { x: 205, y: 24, z: 62 },
    { x: 252, y: 20, z: 126 },
    { x: 222, y: 14, z: 196 },
    { x: 158, y: 9, z: 236 },
    { x: 84, y: 4, z: 224 },
    { x: 24, y: 1, z: 170 },
    { x: -22, y: 0, z: 92 },
  ],
  halfWidth: 8.1,
  halfWidths: [
    8.5, 8.5, 8.3, 8.0, 7.9, 7.8, 7.8, 7.9, 8.0, 7.8, 7.7, 7.8, 8.0, 8.2, 8.4, 8.5, 8.5, 8.4, 8.4,
  ],
  wallHalfWidthFactor: 1.58,
  itemBoxRows: [0.1, 0.32, 0.55, 0.78],
  boostPads: [0.16, 0.38, 0.66, 0.9],
  environment: {
    skyTop: 0x1a4f8c,
    skyHorizon: 0xff8f5a,
    skyBottom: 0xffd9a8,
    fogColor: 0xe8c9a0,
    fogDensity: 0.0015,
    sunColor: 0xffd9a0,
    sunIntensity: 2.5,
    sunDirection: { x: 0.55, y: 0.55, z: 0.4 },
    ambientSky: 0x8eb4d8,
    ambientGround: 0x8a7a55,
    ambientIntensity: 0.9,
  },
  palette: {
    road: 0x454950,
    roadStripe: 0xfff0d0,
    curb: 0xe8a020,
    curbAlt: 0xf5f5f0,
    offroad: 0x8a7a4a,
    wall: 0x2a2e32,
    ground: 0x6f8f50,
  },
};
