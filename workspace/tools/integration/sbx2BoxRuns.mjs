// sbx2: run-length of message-box (y >= 122) hashes, ROM vs app, over an sbx1Sweep.py output dir; prints only differing runs.
import {readFileSync,existsSync,readdirSync} from "node:fs"; import {PNG} from "pngjs"; import {createHash} from "node:crypto";
// usage: node boxruns.mjs SWEEPDIR LABPREFIX : run-length of (oracle hash, app hash) over the whole sweep; prints only runs where they differ
const [root,lab]=[process.argv[2],process.argv[3]];
const sig=p=>{ if(!existsSync(p))return null; const png=PNG.sync.read(readFileSync(p)); const h=createHash("md5"); let dark=0;
 for(let y=122;y<png.height;y++)for(let x=0;x<png.width;x++){const i=(y*png.width+x)*4;h.update(Buffer.from([png.data[i],png.data[i+1],png.data[i+2]])); if(png.data[i]+png.data[i+1]+png.data[i+2]<300)dark++;} return {h:h.digest("hex").slice(0,5),dark};};
const rows=[];
for(const d of readdirSync(root).filter(d=>d.startsWith(lab+"-")&&d.endsWith("-d"))){
  for(const f of readdirSync(`${root}/${d}`)){const m=f.match(/^oracle-(\d+)\.png$/); if(!m)continue; const n=m[1]; rows.push([+n,sig(`${root}/${d}/${f}`),sig(`${root}/${d}/app-${n}.png`)]);}}
rows.sort((a,b)=>a[0]-b[0]);
let run=null;const out=[];
for(const [f,o,a] of rows){const key=`${o.h}/${a?.h}`; if(run&&run.key===key&&run.end===f-1)run.end=f; else {run={key,start:f,end:f,o,a};out.push(run);}}
const label=(x)=>x?`${x.h}(${x.dark})`:"-";
for(const r of out){ if(r.o.h!==r.a?.h) console.log(`${r.start}-${r.end} (${r.end-r.start+1}) ROM ${label(r.o)} APP ${label(r.a)}`);}
