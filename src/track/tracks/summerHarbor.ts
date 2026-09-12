import type { TrackDefinition } from '../../core/types';

/**
 * Copa Verão 2/5 — Cais da Brisa
 * Porto/orla com reta de cais, curva longa e uma subida de viaduto leve.
 */
export const summerHarbor: TrackDefinition = {
  id: 'summer_harbor',
  name: 'Cais da Brisa',
  theme: 'beach',
  laps: 3,
  description:
    'Porto e orla com reta longa de cais, S rápido, uma subida de viaduto e curvas bem diferentes da Praia ao Meio-Dia.',
  difficulty: 2,
  controlPoints: [
    { x: 0, y: 0, z: 0 },
    { x: -8, y: 0, z: -85 },
    { x: 18, y: 1, z: -165 },
    { x: 78, y: 3, z: -218 },
    { x: 150, y: 4, z: -225 },
    { x: 215, y: 7, z: -188 },
    { x: 250, y: 10, z: -130 },
    { x: 245, y: 9, z: -68 },
    { x: 205, y: 6, z: -20 },
    { x: 145, y: 3, z: -8 },
    { x: 112, y: 4, z: 42 },
    { x: 145, y: 7, z: 82 },
    { x: 178, y: 6, z: 128 },
    { x: 148, y: 3, z: 188 },
    { x: 82, y: 1, z: 216 },
    { x: 20, y: 0, z: 178 },
    { x: -24, y: 0, z: 92 },
  ],
  halfWidth: 8.5,
  halfWidths: [8.9, 8.9, 8.6, 8.3, 8.2, 8.1, 8.1, 8.2, 8.4, 8.2, 8.1, 8.1, 8.3, 8.6, 8.9, 8.8, 8.7],
  wallHalfWidthFactor: 1.6,
  itemBoxRows: [0.11, 0.35, 0.58, 0.82],
  boostPads: [0.18, 0.43, 0.69, 0.91],
  environment: {
    skyTop: 0x1a7ec8,
    skyHorizon: 0x7ec8ef,
    skyBottom: 0xe8f6ff,
    fogColor: 0xc5e6f8,
    fogDensity: 0.0013,
    sunColor: 0xfff0d0,
    sunIntensity: 2.9,
    sunDirection: { x: 0.42, y: 0.82, z: 0.32 },
    ambientSky: 0xa8d8f5,
    ambientGround: 0xc9b88a,
    ambientIntensity: 0.96,
  },
  palette: {
    road: 0x50545a,
    roadStripe: 0xfff8e6,
    curb: 0x2a9bc0,
    curbAlt: 0xffffff,
    offroad: 0xcbb87a,
    wall: 0x2c333a,
    ground: 0xc9b070,
  },
};
