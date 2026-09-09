/**
 * Character roster - 8 original racers. Stats are 0..1 and trade off by weight
 * class: light = agile/quick off the line, heavy = fast top end but ponderous.
 */
import type { CharacterDef } from '../core/types';

export const CHARACTERS: CharacterDef[] = [
  // --- light ---------------------------------------------------------------
  {
    id: 'zippy',
    name: 'Zippy Nova',
    color: 0x1fd6ee,
    accent: 0xff3fb4,
    driverColor: 0xf7f9ff,
    weightClass: 'light',
    stats: { speed: 0.18, acceleration: 0.95, handling: 0.9, weight: 0.12, miniTurbo: 0.9 },
    tagline: 'Piscou e ela já está duas curvas na frente.',
  },
  {
    id: 'pixel',
    name: 'Pixel Pop',
    color: 0xff4fa3,
    accent: 0x4dffc3,
    driverColor: 0xfff1a8,
    weightClass: 'light',
    stats: { speed: 0.12, acceleration: 0.9, handling: 0.95, weight: 0.08, miniTurbo: 0.85 },
    tagline: 'Direção leve e rápida. Curvas são a especialidade dela.',
  },
  {
    id: 'fennec',
    name: 'Fennec Flash',
    color: 0xffcf1f,
    accent: 0xff6a00,
    driverColor: 0x2b1b12,
    weightClass: 'light',
    stats: { speed: 0.25, acceleration: 0.85, handling: 0.8, weight: 0.2, miniTurbo: 0.95 },
    tagline: 'Pequeno no tamanho, grande no mini-turbo.',
  },
  // --- medium --------------------------------------------------------------
  {
    id: 'max',
    name: 'Max Vortex',
    color: 0xe32222,
    accent: 0xffd23f,
    driverColor: 0xffffff,
    weightClass: 'medium',
    stats: { speed: 0.55, acceleration: 0.55, handling: 0.55, weight: 0.5, miniTurbo: 0.55 },
    tagline: 'Equilibrado em tudo. Cada volta é um espetáculo.',
  },
  {
    id: 'juno',
    name: 'Juno Bolt',
    color: 0x7c3aed,
    accent: 0xffb020,
    driverColor: 0x161326,
    weightClass: 'medium',
    stats: { speed: 0.6, acceleration: 0.45, handling: 0.5, weight: 0.55, miniTurbo: 0.65 },
    tagline: 'Entra em cada derrapagem como uma tempestade.',
  },
  {
    id: 'kai',
    name: 'Kai Tidewater',
    color: 0x1e6bff,
    accent: 0xff7a1a,
    driverColor: 0xdff6ff,
    weightClass: 'medium',
    stats: { speed: 0.5, acceleration: 0.6, handling: 0.65, weight: 0.45, miniTurbo: 0.5 },
    tagline: 'Frio na cabeça e suave nas curvas.',
  },
  // --- heavy ---------------------------------------------------------------
  {
    id: 'bram',
    name: 'Boulder Bram',
    color: 0x1f9a4b,
    accent: 0xd88a3c,
    driverColor: 0x5a3b21,
    weightClass: 'heavy',
    stats: { speed: 0.92, acceleration: 0.2, handling: 0.25, weight: 0.95, miniTurbo: 0.3 },
    tagline: 'Demora a embalar, mas é quase impossível empurrar.',
  },
  {
    id: 'rosa',
    name: 'Big Rig Rosa',
    color: 0xff6a00,
    accent: 0x19d3c5,
    driverColor: 0x2a2a34,
    weightClass: 'heavy',
    stats: { speed: 1.0, acceleration: 0.15, handling: 0.3, weight: 0.9, miniTurbo: 0.35 },
    tagline: 'Força de caminhão em um carro de quatro rodas.',
  },
];

export function getCharacter(id: string): CharacterDef {
  for (let i = 0; i < CHARACTERS.length; i++) {
    if (CHARACTERS[i].id === id) return CHARACTERS[i];
  }
  return CHARACTERS[0];
}
