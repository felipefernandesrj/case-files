import fs from 'node:fs'; import { validateCase } from '../src/generator.js';
let ok=0, rej=0, n=0;
for (const f of fs.readdirSync('qa/m3-batch').filter(f=>/^seed-/.test(f))) { n++;
  const c=JSON.parse(fs.readFileSync('qa/m3-batch/'+f)); const v=validateCase(structuredClone(c)); if(v.ok) ok++; else console.log(f,v.reasons);
  const m=structuredClone(c); m.clues=m.clues.map(x=>x.implicates===m.culprit?{...x,implicates:null}:x); const mv=validateCase(m); if(!mv.ok) rej++; else console.log('mutant passed',f); }
console.log({n,valid:ok,unsolvableMutantsRejected:rej});
