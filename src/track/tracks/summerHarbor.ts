import type { TrackDefinition } from '../../core/types';

/**
 * Copa Verão 2/5 — Cais da Brisa
 * Porto / orla com píer: fluxo médio, S suave, pouca elevação.
 * Layout aberto (sem auto-cruzamento), no estilo das outras pistas beach.
 */
export const summerHarbor: TrackDefinition = {
  id: 'summer_harbor',
  name: 'Cais da Brisa',
  theme: 'beach',
  laps: 3,
  description:
    'Cais e orla com brisa do mar: retas generosas, um S fluido junto ao porto e curvas limpas.',
  difficulty: 2,
  controlPoints: [
    { x: 0, y: 0, z: 0 },
    { x: -4, y: 0, z: -78 },
    { x: 14, y: 0.2, z: -152 },
    { x: 58, y: 0.5, z: -205 },
    { x: 118, y: 0.7, z: -228 },
    { x: 178, y: 0.9, z: -208 },
    { x: 218, y: 0.6, z: -158 },
    { x: 232, y: 0.3, z: -95 },
    { x: 218, y: 0.1, z: -35 },
    { x: 180, y: 0, z: 12 },
    { x: 192, y: 0.2, z: 68 },
    { x: 175, y: 0.3, z: 122 },
    { x: 130, y: 0.2, z: 162 },
    { x: 72, y: 0, z: 172 },
    { x: 24, y: 0, z: 145 },
    { x: -6, y: 0, z: 95 },
    { x: -16, y: 0, z: 42 },
  ],
  halfWidth: 8.5,
  halfWidths: [8.9, 8.9, 8.7, 8.5, 8.5, 8.5, 8.6, 8.8, 8.8, 8.5, 8.5, 8.5, 8.6, 8.8, 8.9, 8.7, 8.7],
  wallHalfWidthFactor: 1.6,
  itemBoxRows: [0.11, 0.35, 0.58, 0.82],
  boostPads: [0.23, 0.48, 0.9],
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
