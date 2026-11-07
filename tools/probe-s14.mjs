import fs from 'node:fs';
const key = fs.readFileSync('.fullcup-key','utf8').trim(); const B='https://qa-api.fullcup.ai/v1';
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json','utf8'));
async function go(purpose, method, ep, body, file){ const t0=Date.now(); const r=await fetch(B+ep,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}); const ms=Date.now()-t0; const txt=await r.text(); let j=null; try{j=JSON.parse(txt)}catch{}
 const h={}; const all={}; for(const [k,v] of r.headers){ all[k]=v; if(/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k]=v; }
 fs.writeFileSync(`qa/s14-probes/${file}.json`, txt); fs.writeFileSync(`qa/s14-probes/${file}.h`, JSON.stringify({status:r.status,headers:all},null,1));
 const e={at:new Date(t0).toISOString(),purpose,method,endpoint:ep,model:body?.model??null,status:r.status,ms,usage:j?.usage||null,cost:j?.usage?.cost??null,headers:h,error:r.ok?null:j}; log.push(e); console.log(JSON.stringify({purpose,status:r.status,ms,h,body:txt.slice(0,400)})); }
await go('sprint14-probe:models','GET','/models',null,'models');
await go('sprint14-probe:receipt-api','GET','/receipts/01M6RC6FD4G7PHA1CC7H3R1JZZ',null,'receipt');
await go('sprint14-probe:disallowed-model','POST','/chat/completions',{model:'@cf/meta/llama-3.3-70b-instruct-fp8-fast',messages:[{role:'user',content:'hi'}],max_tokens:5},'disallowed');
fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(log,null,1));
