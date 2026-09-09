/** RC Rush lightweight procedural soundtrack. Softer, less repetitive synth-pop loops. */
import type { MusicTrack } from '../core/types';
import { midiToFreq } from './synth';

interface Song { bpm:number; chords:number[][]; bass:number[]; melody:number[]; gain:number; }
const SONGS:Record<'menu'|'race'|'finalLap'|'results',Song>={
 menu:{bpm:88,chords:[[57,61,64],[54,57,61],[50,54,57],[52,57,61]],bass:[38,35,31,33],melody:[69,73,76,73,66,69,73,69],gain:.30},
 race:{bpm:126,chords:[[55,59,62],[52,55,59],[48,52,55],[50,54,57]],bass:[43,40,36,38],melody:[74,79,76,71,72,76,74,69],gain:.34},
 finalLap:{bpm:136,chords:[[55,59,62],[52,55,59],[48,52,55],[50,54,57]],bass:[43,40,36,38],melody:[79,83,81,76,77,81,79,74],gain:.36},
 results:{bpm:96,chords:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]],bass:[36,33,29,31],melody:[72,76,79,76,69,72,74,71],gain:.30}
};
class SoftLoop{
 readonly output:GainNode;private timer:ReturnType<typeof setInterval>|null=null;private step=0;private stopped=false;private readonly beat:number;
 constructor(private ctx:AudioContext,private dest:AudioNode,private song:Song){this.output=ctx.createGain();this.output.gain.value=0;this.output.connect(dest);this.beat=60/song.bpm;}
 start(at:number,fade:number){const now=this.ctx.currentTime;this.output.gain.setValueAtTime(.0001,now);this.output.gain.exponentialRampToValueAtTime(1,Math.max(now+.02,at)+Math.max(.05,fade));this.timer=setInterval(()=>this.tick(),this.beat*500);this.tick();}
 private tone(note:number,when:number,dur:number,vol:number,type:OscillatorType='triangle'){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();o.type=type;o.frequency.value=midiToFreq(note);f.type='lowpass';f.frequency.value=type==='sine'?1200:2100;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(vol*this.song.gain,when+.025);g.gain.exponentialRampToValueAtTime(.0001,when+dur);o.connect(f);f.connect(g);g.connect(this.output);o.start(when);o.stop(when+dur+.03);o.onended=()=>{o.disconnect();f.disconnect();g.disconnect();};}
 private tick(){if(this.stopped)return;const now=this.ctx.currentTime+.025,s=this.step++,bar=Math.floor(s/8)%4,pos=s%8;if(pos===0){for(const n of this.song.chords[bar])this.tone(n,now,this.beat*3.7,.11,'triangle');this.tone(this.song.bass[bar],now,this.beat*1.7,.18,'sine');}if(pos===4)this.tone(this.song.bass[bar]+7,now,this.beat*1.5,.11,'sine');if(pos%2===0)this.tone(this.song.melody[pos],now,this.beat*.72,.075,'triangle');}
 stop(fade:number){if(this.stopped)return;this.stopped=true;if(this.timer)clearInterval(this.timer);const now=this.ctx.currentTime;this.output.gain.cancelScheduledValues(now);this.output.gain.setValueAtTime(Math.max(.0001,this.output.gain.value),now);this.output.gain.exponentialRampToValueAtTime(.0001,now+Math.max(.05,fade));setTimeout(()=>this.output.disconnect(),fade*1000+500);}
 dispose(){this.stop(.02);}
}
export class MusicPlayer{private current:SoftLoop|null=null;private currentTrack:MusicTrack='none';constructor(private ctx:AudioContext,private dest:AudioNode){}get track():MusicTrack{return this.currentTrack;}play(track:MusicTrack){if(track===this.currentTrack)return;if(track==='none'){this.stop();return;}const key=(track==='menu'||track==='race'||track==='finalLap'||track==='results'?track:'menu') as keyof typeof SONGS;const next=new SoftLoop(this.ctx,this.dest,SONGS[key]);if(this.current)this.current.stop(.8);next.start(this.ctx.currentTime+.05,.8);this.current=next;this.currentTrack=track;}stop(){if(this.current)this.current.stop(.8);this.current=null;this.currentTrack='none';}dispose(){if(this.current)this.current.dispose();this.current=null;this.currentTrack='none';}}
export function warmMusic(_ctx:AudioContext):void{}
