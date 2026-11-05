// Runs only on an ephemeral localhost origin with synthetic diaries.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const legacy = execFileSync('git',['show','5ee5776:app.js'],{cwd:root,encoding:'utf8'});
const server = http.createServer((req,res)=>{
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/heart-weather\//,'');
  if(name==='legacy.js'){res.setHeader('Content-Type','text/javascript');return res.end(legacy);}
  const file = path.join(root,name||'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try {res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.webmanifest')?'application/manifest+json':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
async function save(page,note='合成测试：雨天也很好'){
 await page.locator('[data-tab="record"]').first().click();
 await page.locator('[data-mood="rain"]').click();
 await page.locator('[data-tag="委屈"]').click();
 await page.locator('#note').fill(note);
 const before=await page.evaluate('state.entries.length');
 await page.locator('[data-action="save-mood"]').click();
 await page.waitForFunction(n=>state.entries.length===n,before+1);
 await page.waitForSelector('#island-canvas');
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}/heart-weather/`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',acceptDownloads:true});
 let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Run the actual v0.1.2 app on this same origin, then upgrade the script in place.
 await page.route('**/app.js',r=>r.fulfill({contentType:'text/javascript',body:legacy}));
 await page.route('**/sw.js',r=>r.abort());
 await page.goto(url);await page.waitForSelector('#island-canvas');await save(page);
 const old=await page.evaluate('({entries:state.entries,growth:state.growth})');
 await page.unroute('**/app.js');await page.unroute('**/sw.js');
 await page.reload();await page.waitForSelector('#island-canvas');
 assert.deepEqual(await page.evaluate('({entries:state.entries,growth:state.growth})'),old);
 assert.equal(await page.evaluate('db.version'),1);
 await page.evaluate('navigator.serviceWorker.ready');
 await page.waitForFunction('navigator.serviceWorker.controller');
 console.log('PASS real v0.1.2 → current upgrade: notes/tags/growth/DB v1');
 // Export through UI download, mutate, select the actual file, protect, restore.
 await page.locator('[data-tab="settings"]').first().click();
 await page.locator('[data-action="confirm-backup"]').click();
 assert.match(await page.locator('.toast').innerText(),/重新导出/);
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export"]').click();
 const backup=JSON.parse(fs.readFileSync(await (await downloadPromise).path(),'utf8'));
 await page.waitForFunction("document.querySelector('.toast')?.textContent.includes('备份已生成')");
 assert.equal(await page.evaluate('state.settings.lastBackupConfirmedAt'),null);
 await page.evaluate("(async()=>{await commitMoodMutation('put',{...state.entries[0],note:'已编辑'});await reload();render()})()");
 await page.locator('[data-action="confirm-backup"]').click();await page.waitForFunction("document.querySelector('.toast')?.textContent.includes('重新导出')");assert.match(await page.locator('.toast').innerText(),/重新导出/);
 await page.evaluate("(async()=>{await commitMoodMutation('delete',state.entries[0].id);await reload();await syncGrowth();render()})()");
 await page.locator('[data-action="confirm-backup"]').click();await page.waitForFunction("document.querySelector('.toast')?.textContent.includes('重新导出')");assert.match(await page.locator('.toast').innerText(),/重新导出/);
 await page.locator('#backup-file').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
 assert.equal(await page.locator('[data-action="restore"]').isDisabled(),true);
 const protection=page.waitForEvent('download');await page.locator('[data-action="protect"]').click();await protection;
 await page.locator('#confirm-protect').check();
 page.once('dialog',d=>d.accept());await page.locator('[data-action="restore"]').click();
 await page.waitForSelector('#island-canvas');
 assert.deepEqual(await page.evaluate('state.entries'),backup.data.moodEntries);
 assert.deepEqual(await page.evaluate('state.growth'),backup.data.islandEvents);
 const corrupt=structuredClone(backup);corrupt.data.moodEntries[0].note='tampered';
 assert.equal(await page.evaluate(async b=>{try{await parseBackup(new File([JSON.stringify(b)],'bad.json'));return false}catch{return true}},corrupt),true);
 console.log('PASS real downloaded file → file input → guarded restore; edit/delete invalidate export; checksum');
 // Close all pages, disconnect, open a fresh page: cached shell + persisted real IDB.
 await context.setOffline(true);await page.close();page=await context.newPage();
 await page.goto(url);await page.waitForSelector('#island-canvas');
 assert.deepEqual(await page.evaluate('state.entries'),backup.data.moodEntries);
 await save(page,'合成离线记录');
 await context.setOffline(false);await page.reload();await page.waitForSelector('#island-canvas');
 assert.equal(await page.evaluate('state.entries.length'),2);
 console.log('PASS offline fresh-page cold start + offline save + reconnect persistence');
 await page.evaluate(`(async()=>{for(let i=1;i<=34;i++){const d=localDate(addDays(new Date(),-i));const e={...state.entries[0],id:'synthetic-'+i,localDate:d,occurredAt:d+'T02:00:00.000Z'};await commitMoodMutation('put',e)}await reload();await syncGrowth();render()})()`);
 assert.equal(await page.evaluate('islandPageEvents().length'),30);
 await page.locator('[data-action="island-page"][data-step="1"]').click();assert.equal(await page.evaluate('islandPageEvents().length'),5);
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate('render()');assert.equal(await page.evaluate('islandFrameId'),0);
 await page.locator('[data-tab="calendar"]').first().click();assert.equal(await page.evaluate('islandFrameId'),0);
 assert.deepEqual(errors,[]);console.log('PASS 35 landscapes pagination + reduced motion + tab animation cancellation');
 await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
