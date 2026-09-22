import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { extractPrograms } from './extract.ts';
import { verifyCases, type CaptureCase } from './compare.ts';
const capturePath=process.argv[2];
if (!capturePath) throw new Error('verify.ts capture.json[.gz] [report.json]');
const raw=readFileSync(capturePath);
const bytes=capturePath.endsWith('.gz') ? gunzipSync(raw) : raw;
const cases=(JSON.parse(bytes.toString()) as {cases:CaptureCase[]}).cases;
const resources=extractPrograms([...new Set(cases.map(c=>'Move_'+c.move))]);
const reports=verifyCases(cases,resources);
const report={schema:'animation-runtime-spike-verification/v1',captureSha256:createHash('sha256').update(bytes).digest('hex'),romSha256:resources.romSha256,
  scope:'Source/task/battler and selected OBJ transfer checks only; audio busy is an external host input; no full framebuffer, new sprites, palettes or backgrounds.',reports};
if(process.argv[3]) writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(reports.some(r=>Object.keys(r.mismatchCounts).length)) process.exitCode=1;
