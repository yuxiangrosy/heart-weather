const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../letters.js');
const moods=[{id:'sun',name:'晴天'},{id:'rain',name:'小雨'}];
const entry=(i,day='2026-10-26')=>({id:String(i),localDate:day,occurredAt:day+`T${String(i%24).padStart(2,'0')}:00:00Z`,moodType:i%2?'rain':'sun',tags:['合成'],note:'合成原话'});
test('Sunday completion; week crosses month/year; leap month; DST calendar dates',()=>{
 assert.deepEqual(L.range('week','2027-01-01'),{kind:'week',start:'2026-12-28',end:'2027-01-03',id:'week:2026-12-28'});
 assert.equal(L.range('month','2028-02-16').end,'2028-02-29');
 assert.equal(L.range('week','2026-03-08').end,'2026-03-08');
 assert.equal(L.candidates([entry(1,'2026-11-01')],[],'2026-11-01').length,0);
 assert.equal(L.candidates([entry(1,'2026-11-01')],[],'2026-11-02').length,1);
});
test('0/1/2/3/20: factual counts, sparse suppression and ties',()=>{
 const r=L.range('week','2026-10-26');
 for(const n of [0,1,2,3,20]){
  const xs=Array.from({length:n},(_,i)=>entry(i));const s=L.summarize(r,xs,moods);
  assert.equal(s.entryCount,n);assert.equal(s.dayCount,n?1:0);assert.deepEqual(s.trajectory,[]);
  if(n)assert.match(s.body,/暂时不急着分析趋势/);
 }
 const s=L.summarize(r,[entry(0),entry(1,'2026-10-27'),entry(2,'2026-10-28')],moods);
 assert.equal(s.trajectory.length,3);assert.equal(s.tags[0].count,3);
 assert.match(L.summarize(r,[entry(0),entry(1)],moods).body,/「晴天」、「小雨」/);
 assert.deepEqual(L.candidates([],[],'2026-11-02'),[]);
});
test('same period deduplicated; source includes edit/delete/date/tag changes',()=>{
 const r=L.range('week','2026-10-26'),a=entry(0),b=entry(1);
 assert.equal(L.candidates([a,b],[],'2026-11-02').length,2);
 assert.notEqual(L.source(r,[a]),L.source(r,[{...a,note:'修改'}]));
 assert.notEqual(L.source(r,[a]),L.source(r,[]));
 assert.equal(L.source(r,[a,b]),L.source(r,[b,a]));
 const old={...L.summarize(r,[a],moods),sourceHash:'a'.repeat(64),generatedAt:'2026-11-02T00:00:00Z',readAt:null};
 assert(L.valid(old));assert(!L.valid({...old,start:'2026-99-99'}));
 assert.equal(L.candidates([],[old],'2026-11-02').length,1);
});
