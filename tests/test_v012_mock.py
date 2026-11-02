from playwright.sync_api import sync_playwright
from pathlib import Path
import hashlib
p=Path(__file__).resolve().parents[1]
with sync_playwright() as w:
 browser=w.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.expose_function('testSha256',lambda text:hashlib.sha256(text.encode('utf8')).hexdigest())
 page.set_content('<html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app" class="app-shell">loading</div></body></html>')
 page.add_style_tag(content=(p/'styles.css').read_text())
 page.add_script_tag(content=(p/'tests/mock-idb.js').read_text())
 page.add_script_tag(content=(p/'app.js').read_text())
 page.evaluate('() => {sha256 = async s=>window.testSha256(s)}')
 page.wait_for_selector('canvas#island-canvas')
 assert page.evaluate('MOODS.length')==16
 page.locator('[data-tab="record"]').first.click()
 assert page.locator('.mood').count()==8
 page.screenshot(path='/mnt/data/心情天气_v0.1.2_常用天气.png',full_page=True)
 page.locator('[data-action="toggle-moods"]').click()
 assert page.locator('.mood').count()==16
 assert page.locator('.weather-group-title').count()==4
 page.screenshot(path='/mnt/data/心情天气_v0.1.2_全部天气.png',full_page=True)
 page.locator('[data-mood="downpour"]').click()
 assert page.locator('.tag-chip').count()>=6
 for tag in ('伤心','孤独','想哭','委屈'):
  page.locator(f'[data-tag="{tag}"]').first.click()
 assert page.evaluate('state.tags')==['伤心','孤独','想哭'],page.evaluate('state.tags')
 page.locator('#note').fill('今天好累，想给自己一点空间。')
 page.screenshot(path='/mnt/data/心情天气_v0.1.2_记录和标签.png',full_page=True)
 page.locator('[data-action="save-mood"]').click()
 page.wait_for_function('state.entries.length===1')
 assert page.evaluate('state.entries[0].moodType')=='downpour'
 assert page.evaluate('state.entries[0].tags')==['伤心','孤独','想哭']
 assert page.evaluate('state.growth[0].mood')=='downpour'
 assert page.evaluate('state.growth.length')==1
 page.locator('[data-tab="calendar"]').first.click()
 assert page.locator('.record-tags span').count()==3
 page.locator('[data-action="edit"]').first.click()
 page.locator('[data-tag="想哭"]').last.click()
 page.locator('[data-action="save-edit"]').click()
 page.wait_for_function('state.entries[0].tags.length===2')
 assert page.evaluate('state.entries[0].tags')==['伤心','孤独']
 page.locator('[data-tab="review"]').first.click()
 assert page.locator('.record-tags').count()==1
 assert '伤心 · 1' in page.locator('.record-tags').first.inner_text()
 b=page.evaluate('makeBackup()')
 assert b['appVersion']=='0.1.2'
 assert b['data']['moodEntries'][0]['tags']==['伤心','孤独']
 prev=page.evaluate('''async()=>{const b=await makeBackup();b.appVersion='0.1.1';delete b.data.moodEntries[0].tags;const {checksum,...rest}=b;b.checksum=await sha256(JSON.stringify(rest));return await parseBackup(new File([JSON.stringify(b)],'old.moodbackup.json',{type:'application/json'}))}''')
 assert 'tags' not in prev['data']['moodEntries'][0]
 # invalid tags should be rejected even when checksum is recalculated
 invalid=page.evaluate('''async()=>{const b=await makeBackup();b.data.moodEntries[0].tags=['1','2','3','4'];const {checksum,...rest}=b;b.checksum=await sha256(JSON.stringify(rest));try{await parseBackup(new File([JSON.stringify(b)],'bad.json',{type:'application/json'}));return false}catch{return true}}''')
 assert invalid
 # Multiple entries one day do not create extra persistent island features
 page.locator('[data-tab="record"]').first.click()
 page.locator('[data-mood="sun"]').click()
 page.locator('[data-action="save-mood"]').click()
 page.wait_for_function('state.entries.length===2')
 assert page.evaluate('state.growth.length')==1
 assert not errors,errors
 print('OK: 16 weather, quick8/expand, three tags, save/edit/report, old backups, invalid backups, one-growth-per-day; browser errors:', errors)
 browser.close()
