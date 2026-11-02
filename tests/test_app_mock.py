from playwright.sync_api import sync_playwright
from pathlib import Path
import hashlib
p=Path(__file__).resolve().parents[1]
with sync_playwright() as w:
 browser=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,accept_downloads=True)
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.expose_function('testSha256',lambda text: hashlib.sha256(text.encode('utf-8')).hexdigest())
 page.set_content('<html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app" class="app-shell">LOADING</div></body></html>')
 page.add_style_tag(content=(p/'styles.css').read_text())
 page.add_script_tag(content=(p/'tests/mock-idb.js').read_text())
 page.add_script_tag(content=(p/'app.js').read_text())
 page.evaluate('() => {sha256 = async text => await window.testSha256(text); return true;}')
 page.wait_for_selector('canvas#island-canvas',timeout=8000)
 print('loaded:',page.locator('.page-title').first.inner_text())
 page.locator('[data-tab="record"]').first.click();page.locator('[data-mood="rain"]').first.click()
 page.fill('#note','今天下雨了，我有点累，<b>测试转义</b>')
 page.locator('[data-action="save-mood"]').click()
 page.wait_for_function('document.querySelector(".scene-bottom")?.innerText.includes("1 处")')
 print('save and growth:',page.locator('.scene-bottom').inner_text()[:100])
 # UI snapshots are generated separately during the release process
 # multiple entries same day
 page.locator('[data-tab="record"]').first.click();page.locator('[data-mood="sun"]').first.click();page.fill('#note','第二次，今天心情放晴啦！')
 page.locator('[data-action="save-mood"]').click()
 page.wait_for_function('document.querySelector(".scene-bottom")?.innerText.includes("1 处")')
 assert page.evaluate('state.entries.length')==2
 assert page.evaluate('state.growth.length')==1
 page.locator('[data-tab="calendar"]').first.click()
 assert page.locator('.record-card').count()==2
 assert page.locator('.day.today .symbols').inner_text()=='☀️', page.locator('.day.today .symbols').inner_text()
 assert page.locator('.record-card').first.locator('.text').inner_text()=='第二次，今天心情放晴啦！'
 assert page.locator('.record-card').last.locator('.text').inner_text()=='今天下雨了，我有点累，<b>测试转义</b>'
 print('calendar correct latest weather, markup escaped')
 page.locator('[data-action="edit"]').first.click();page.fill('#edit-note','编辑完成 🌻');page.locator('[data-action="save-edit"]').click()
 page.wait_for_function('document.querySelector(".record-card .text")?.innerText.includes("编辑完成")',timeout=8000)
 print('edited okay')
 page.locator('[data-tab="review"]').first.click()
 assert '2 条' in page.locator('.stat-grid').inner_text()
 assert '1 天' in page.locator('.stat-grid').inner_text()
 print('week review counts correct')
 page.locator('[data-tab="settings"]').first.click()
 result=page.evaluate('''async()=>{const b=await makeBackup();const {checksum,...payload}=b;const parsed=await parseBackup(new File([JSON.stringify(b)],'backup.moodbackup.json',{type:'application/json'}));return {entries:parsed.data.moodEntries.length,events:parsed.data.islandEvents.length,hash:checksum===(await sha256(JSON.stringify(payload)))}}''')
 print('backup SHA256',result)
 assert result=={'entries':2,'events':1,'hash':True}
 # Full restore into modified DB: delete one record then restore backup
 res=page.evaluate('''async()=>{const backup=await makeBackup(); const id=state.entries[0].id;await txDelete('moods',id);await reload();await syncGrowth();return {payload:backup,now:state.entries.length}}''')
 assert res['now']==1
 # Clicking restore requires confirm, spy on browser confirm
 page.on('dialog',lambda dialog: dialog.accept())
 page.evaluate('''async b=>{state.importData=b;state.protectConfirmed=true;await restoreBackup()}''',res['payload'])
 page.wait_for_function('state.entries.length===2')
 print('restore okay')
 page.locator('[data-tab="calendar"]').first.click()
 page.locator('[data-action="delete"]').first.click();page.wait_for_function('state.entries.length===1')
 assert page.evaluate('state.growth.length')==1
 print('delete okay')
 print('browser JS errors:',errors)
 assert not errors
 browser.close()
