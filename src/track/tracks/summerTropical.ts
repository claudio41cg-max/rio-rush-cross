import type { TrackDefinition } from '../../core/types';

/** Copa Verão 4/5 — costa tropical, com serra curta, S técnico e descida para o mar. */
export const summerTropical: TrackDefinition = {
  id:'summer_tropical',name:'Costa Tropical',theme:'beach',laps:3,
  description:'Costa tropical com subida forte, descida rápida, S técnico e curvas de raio variado entre coqueiros e pedras.',difficulty:3,
  controlPoints:[
    {x:0,y:0,z:0},{x:6,y:0,z:-78},{x:42,y:2,z:-145},{x:105,y:7,z:-180},
    {x:176,y:13,z:-170},{x:226,y:18,z:-120},{x:238,y:16,z:-55},{x:210,y:12,z:2},
    {x:154,y:8,z:28},{x:92,y:5,z:8},{x:58,y:7,z:62},{x:86,y:12,z:118},
    {x:152,y:16,z:158},{x:212,y:12,z:206},{x:168,y:7,z:238},{x:96,y:3,z:226},
    {x:30,y:1,z:174},{x:-16,y:0,z:102}
  ],
  halfWidth:8.2,
  halfWidths:[8.6,8.6,8.4,8.1,8.0,8.0,8.1,8.3,8.2,8.0,8.0,8.0,8.2,8.5,8.8,8.6,8.6,8.6],
  wallHalfWidthFactor:1.6,itemBoxRows:[.12,.34,.60,.83],boostPads:[.16,.39,.64,.88],
  environment:{skyTop:0x197cc5,skyHorizon:0x6fd9df,skyBottom:0xe9fff5,fogColor:0xbbe3d8,fogDensity:.0014,sunColor:0xffefc4,sunIntensity:2.8,sunDirection:{x:.55,y:.72,z:.30},ambientSky:0x9edfe2,ambientGround:0x6c9b65,ambientIntensity:.94},
  palette:{road:0x474b4f,roadStripe:0xf8f2d8,curb:0x18b98e,curbAlt:0xf7f7f1,offroad:0x6ba85a,wall:0x2b3031,ground:0x5f9b50}
};
