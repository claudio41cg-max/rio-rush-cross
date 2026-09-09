import type { TrackDefinition } from '../../core/types';

/** Copa Verão 1/3 — praia clara, larga e fluida, sem cruzamentos apertados. */
export const summerBeach: TrackDefinition = {
  id: 'summer_beach',
  name: 'Praia ao Meio-Dia',
  theme: 'beach',
  laps: 3,
  description: 'Asfalto quente junto ao mar, curvas abertas, areia e uma longa reta costeira.',
  difficulty: 1,
  controlPoints: [
    { x: 0, y: 0, z: 0 }, { x: -6, y: 0, z: -72 }, { x: 10, y: 0.3, z: -142 },
    { x: 52, y: 0.6, z: -194 }, { x: 112, y: 0.8, z: -214 }, { x: 168, y: 0.8, z: -194 },
    { x: 202, y: 0.5, z: -148 }, { x: 210, y: 0.2, z: -86 }, { x: 192, y: 0, z: -28 },
    { x: 158, y: 0, z: 18 }, { x: 170, y: 0, z: 72 }, { x: 154, y: 0, z: 126 },
    { x: 112, y: 0, z: 164 }, { x: 56, y: 0, z: 166 }, { x: 16, y: 0, z: 136 },
    { x: -8, y: 0, z: 86 }, { x: -14, y: 0, z: 38 },
  ],
  halfWidth: 8.8,
  halfWidths: [9.2,9.2,9,8.8,8.8,8.8,9,9.2,9.2,9,8.8,8.8,9,9.2,9.2,9,9],
  wallHalfWidthFactor: 1.62,
  itemBoxRows: [0.12,0.38,0.64,0.86],
  boostPads: [0.24,0.52,0.91],
  environment: { skyTop:0x1686df,skyHorizon:0x8bdcff,skyBottom:0xf6fbff,fogColor:0xcdeefe,fogDensity:0.0012,sunColor:0xfff3cf,sunIntensity:3.0,sunDirection:{x:0.36,y:0.88,z:0.28},ambientSky:0xb9e6ff,ambientGround:0xd7c493,ambientIntensity:1.0 },
  palette: { road:0x55585d,roadStripe:0xfffbdf,curb:0x17a8d8,curbAlt:0xffffff,offroad:0xd9c27e,wall:0x2d343b,ground:0xdcc889 },
};
