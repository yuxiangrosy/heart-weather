const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.join(root,pathname==='/'?'index.html':pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',acceptDownloads:true});
 const page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),method:r.method()}));
 await page.clock.install({time:new Date('2026-11-01T16:01:00Z')});
 const url=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(url);await page.waitForSelector('#island-canvas');
 assert.equal(await page.evaluate('state.letters.length'),0);
 await page.evaluate(async()=>{
  for(let i=0;i<20;i++){
   const day='2026-10-'+String(26+i%6);
   const iso=day+'T'+String(i%24).padStart(2,'0')+':00:00.000Z';
   await commitMoodMutation('put',{id:'test-'+i,localDate:day,occurredAt:iso,moodType:i%2?'rain':'sun',tags:['合成'],note:'<b>合成原话</b>',timezone:'Asia/Shanghai',createdAt:iso,updatedAt:iso});
  }
  await reload();await syncGrowth();
 });
 // Finished cycles are discovered by the actual next boot, not a direct generator call.
 await page.reload();await page.waitForSelector('#island-canvas');
 assert.equal(await page.evaluate('state.letters.length'),2);
 const letters=await page.evaluate('state.letters');
 assert(letters.every(r=>r.entryCount===20&&r.dayCount===6));
 assert.equal(await page.locator('[data-action="letters"]').count(),1);
 await page.locator('[data-action="letters"]').click();
 assert.equal(await page.locator('.letter-card').count(),2);
 await page.locator('.letter-card').first().click();await page.waitForSelector('[data-action="close-letter"]');
 assert.equal(await page.locator('.letter-quote').count(),0);
 assert.equal(await page.evaluate('state.letters.filter(r=>r.readAt).length'),1);
 await page.locator('[data-action="letter-quotes"]').click();await page.waitForSelector('.letter-quote');
 assert.equal(await page.locator('.letter-quote').count(),3);
 assert.match(await page.locator('.letter-quote').first().innerText(),/<b>合成原话<\/b>/);
 assert.equal(await page.locator('.letter-quote b').count(),0);
 assert.equal(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
 if(process.env.HEART_WEATHER_QA_DIR){fs.mkdirSync(process.env.HEART_WEATHER_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.HEART_WEATHER_QA_DIR,'letter.png'),fullPage:true});}
 await page.locator('[data-action="tab"][data-tab="island"]').first().click();
 // Edit a historical diary via the real UI and move it into an unfinished cycle.
 await page.evaluate(()=>{state.tab='calendar';state.selectedDay='2026-10-26';state.monthOffset=-1;render()});
 await page.locator('[data-action="edit"]').first().click();
 await page.locator('#edit-time').fill('2026-11-03T10:00');
 await page.locator('#edit-note').fill('修改后的合成原话');
 await page.locator('[data-action="save-edit"]').click();
 await page.waitForFunction('state.letters.every(r=>r.entryCount===19)');
 assert.equal(await page.evaluate('state.letters.length'),2);
 assert.equal(await page.evaluate('state.letters.every(r=>r.updated&&!r.readAt)'),true);
 const backup=await page.evaluate('makeBackup()');
 assert.equal(backup.schemaVersion,1);assert.equal(backup.data.reportSnapshots.length,2);
 assert.equal(await page.evaluate('db.version'),1);
 await page.reload();await page.waitForSelector('#island-canvas');
 assert.deepEqual(await page.evaluate('state.letters'),backup.data.reportSnapshots);
 // A full file-input restore preserves reports and notes, without touching any real origin.
 await page.locator('[data-tab="settings"]').first().click();
 await page.locator('#backup-file').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 const dl=page.waitForEvent('download');await page.locator('[data-action="protect"]').click();await dl;
 await page.locator('#confirm-protect').check();page.once('dialog',d=>d.accept());await page.locator('[data-action="restore"]').click();await page.waitForSelector('#island-canvas');
 assert.deepEqual(await page.evaluate('state.letters'),backup.data.reportSnapshots);
 assert.deepEqual(await page.evaluate('state.entries'),backup.data.moodEntries.slice().sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||b.id.localeCompare(a.id)));
 // Old schemaVersion 1 backups with no reports remain accepted; no migration required.
 assert.equal(await page.evaluate(async b=>{delete b.data.reportSnapshots;const {checksum,...payload}=b;b.checksum=await sha256(JSON.stringify(payload));return Boolean(await parseBackup(new File([JSON.stringify(b)],'old.json')))},backup),true);
 assert.equal(await page.evaluate(async b=>{b.data.reportSnapshots[0].entryCount=-1;const {checksum,...payload}=b;b.checksum=await sha256(JSON.stringify(payload));try{await parseBackup(new File([JSON.stringify(b)],'bad.json'));return false}catch{return true}},backup),true);
 // Restore an actual old-format file (without reportSnapshots); bootstraps letters from notes.
 const oldBackup=await page.evaluate(async b=>{delete b.data.reportSnapshots;b.appVersion='0.2.0';const {checksum,...payload}=b;b.checksum=await sha256(JSON.stringify(payload));return b},backup);
 await page.locator('[data-tab="settings"]').first().click();
 await page.locator('#backup-file').setInputFiles({name:'old-synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(oldBackup))});
 const oldProtection=page.waitForEvent('download');await page.locator('[data-action="protect"]').click();await oldProtection;
 await page.locator('#confirm-protect').check();page.once('dialog',d=>d.accept());await page.locator('[data-action="restore"]').click();await page.waitForSelector('#island-canvas');
 assert.equal(await page.evaluate('state.letters.length'),2);
 assert.equal(await page.evaluate('state.letters.every(r=>r.entryCount===19)'),true);
 // Atomic invalidation protects deleted/edited text even before regeneration can run.
 await page.evaluate(async()=>{const e=state.entries.find(e=>e.localDate.startsWith('2026-10'));await commitMoodMutation('put',{...e,note:'原话已修改'});await reload()});
 assert.equal(await page.evaluate('state.letters.every(r=>r.stale&&r.quotes.length===0)'),true);
 await page.evaluate(async()=>{await syncLetters();render()});
 // Delete every diary: existing letters update factually to empty; no ghost quotes remain.
 await page.evaluate(async()=>{for(const e of state.entries)await commitMoodMutation('delete',e.id);await reload();await syncGrowth();await syncLetters();render()});
 assert.equal(await page.evaluate('state.letters.length'),2);
 assert.equal(await page.evaluate('state.letters.every(r=>r.entryCount===0&&r.quotes.length===0&&r.tags.length===0)'),true);
 await page.evaluate('navigator.serviceWorker.ready');await page.waitForFunction('navigator.serviceWorker.controller');
 await context.setOffline(true);await page.close();const offline=await context.newPage();await offline.goto(url);await offline.waitForSelector('#island-canvas');
 await offline.locator('[data-tab="review"]').first().click();assert.equal(await offline.locator('.letter-card').count(),2);
 await offline.locator('.letter-card').first().click();assert.match(await offline.locator('.letter').innerText(),/没有心情记录/);
 assert.deepEqual(errors,[]);assert(requests.every(r=>r.url.startsWith(url)&&r.method==='GET'));
 console.log('PASS letters: actual boot catch-up, archive/read/privacy/UI edit, backup/restore/old format, deletion/empty, offline');
 await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
