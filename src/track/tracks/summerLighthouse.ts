import type { TrackDefinition } from '../../core/types';

/**
 * Copa Verão 5/5 — Ponta do Farol
 * Final de campeonato: península com mais elevação, sequência técnica e reta de boost.
 */
export const summerLighthouse: TrackDefinition = {
  id: 'summer_lighthouse',
  name: 'Ponta do Farol',
  theme: 'beach',
  laps: 3,
  description:
    'Ponta rochosa com farol ao fundo: subidas, uma sequência apertada e uma reta longa de boost até a chegada.',
  difficulty: 4,
  controlPoints: [
    { x: 0, y: 0, z: 0 },
    { x: -10, y: 0, z: -82 },
    { x: 8, y: 0.6, z: -162 },
    { x: 48, y: 1.6, z: -220 },
    { x: 108, y: 3.0, z: -255 },
    { x: 175, y: 4.6, z: -245 },
    { x: 228, y: 5.5, z: -200 },
    { x: 255, y: 5.2, z: -140 },
    { x: 258, y: 4.0, z: -75 },
    { x: 235, y: 2.8, z: -20 },
    { x: 200, y: 2.0, z: 30 },
    { x: 215, y: 2.4, z: 85 },
    { x: 200, y: 2.0, z: 140 },
    { x: 160, y: 1.3, z: 180 },
    { x: 105, y: 0.7, z: 200 },
    { x: 50, y: 0.2, z: 190 },
    { x: 12, y: 0, z: 155 },
    { x: -12, y: 0, z: 105 },
    { x: -20, y: 0, z: 52 },
  ],
  halfWidth: 8.1,
  halfWidths: [
    8.5, 8.5, 8.3, 8.1, 8.0, 8.0, 8.1, 8.3, 8.4, 8.2, 8.1, 8.1, 8.2, 8.4, 8.5, 8.5, 8.4, 8.3, 8.4,
  ],
  wallHalfWidthFactor: 1.58,
  itemBoxRows: [0.1, 0.32, 0.55, 0.78],
  boostPads: [0.2, 0.45, 0.72, 0.93],
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
