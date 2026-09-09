import type { TrackDefinition } from '../../core/types';

/** Copa Verão 3/3 — costa tropical, rápida e mais exigente sem sobreposição de pista. */
export const summerTropical: TrackDefinition = {
  id:'summer_tropical',name:'Costa Tropical',theme:'beach',laps:3,
  description:'Costa tropical com curvas largas, elevação suave, coqueiros, pedras e mar ao lado da pista.',difficulty:3,
  controlPoints:[
    {x:0,y:0,z:0},{x:0,y:0,z:-76},{x:18,y:.5,z:-150},{x:58,y:1.4,z:-208},
    {x:114,y:2.8,z:-236},{x:174,y:4.5,z:-222},{x:218,y:5.5,z:-180},{x:238,y:4.8,z:-124},
    {x:232,y:3.2,z:-64},{x:204,y:2,z:-16},{x:220,y:2.2,z:40},{x:208,y:1.8,z:96},
    {x:174,y:1.2,z:142},{x:124,y:.7,z:174},{x:68,y:.2,z:170},{x:24,y:0,z:142},
    {x:-8,y:0,z:98},{x:-18,y:0,z:46}
  ],
  halfWidth:8.2,
  halfWidths:[8.6,8.6,8.4,8.2,8.2,8.2,8.4,8.6,8.6,8.2,8.2,8.2,8.4,8.8,8.8,8.6,8.6,8.6],
  wallHalfWidthFactor:1.6,itemBoxRows:[.12,.34,.60,.83],boostPads:[.25,.53,.91],
  environment:{skyTop:0x197cc5,skyHorizon:0x6fd9df,skyBottom:0xe9fff5,fogColor:0xbbe3d8,fogDensity:.0014,sunColor:0xffefc4,sunIntensity:2.8,sunDirection:{x:.55,y:.72,z:.30},ambientSky:0x9edfe2,ambientGround:0x6c9b65,ambientIntensity:.94},
  palette:{road:0x474b4f,roadStripe:0xf8f2d8,curb:0x18b98e,curbAlt:0xf7f7f1,offroad:0x6ba85a,wall:0x2b3031,ground:0x5f9b50}
};
