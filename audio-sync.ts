export interface AudioCue {startMs:number;endMs:number;cue:string;performance:string}
export function timecode(ms:number) {const n=Math.max(0,Math.round(ms));const hours=Math.floor(n/3600000),minutes=Math.floor(n/60000)%60,seconds=Math.floor(n/1000)%60;return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}.${(n%1000).toString().padStart(3,'0')}`;}
export function validateAudioCues(value:unknown,durationMs:number):AudioCue[] {
  if(!Number.isInteger(durationMs)||durationMs<=0||durationMs>600000||!Array.isArray(value)||value.length>120)throw Error('Faixa ou marcações inválidas; use até dez minutos e 120 trechos.');
  let previousEnd=0;
  return value.map(c=>{
    if(!c||!Number.isInteger(c.startMs)||!Number.isInteger(c.endMs)||c.startMs<previousEnd||c.endMs<=c.startMs||c.endMs>durationMs||typeof c.cue!=='string'||c.cue.length>160||typeof c.performance!=='string'||c.performance.length>160)throw Error('Revise os tempos: trechos não podem se sobrepor nem ultrapassar a faixa.');
    previousEnd=c.endMs;return {startMs:c.startMs,endMs:c.endMs,cue:c.cue.trim(),performance:c.performance.trim()};
  });
}
export function audioInstructions(cues:AudioCue[],clipStart:number,clipDuration:number):string {
  const matching=cues.filter(c=>c.endMs>clipStart && c.startMs<clipStart+clipDuration);
  if(!matching.length)return '';
  return '\nAUDIO CUE SHEET (verify against the original recording; not guaranteed lip-sync):\n'+matching.map(c=>`Clip ${timecode(Math.max(c.startMs,clipStart)-clipStart)}–${timecode(Math.min(c.endMs,clipStart+clipDuration)-clipStart)} | source ${timecode(c.startMs)}–${timecode(c.endMs)} | ${c.cue} | ${c.performance}`).join('\n')+'\nUse the original soundtrack as the timing source. Keep the same performer; do not invent extra sung words.';
}
