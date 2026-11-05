/* Deterministic, offline summaries. No network or psychological inference. */
(function(global){
  'use strict';
  const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function date(s){const [y,m,d]=s.split('-').map(Number);const x=new Date(0);x.setFullYear(y,m-1,d);x.setHours(12,0,0,0);return x;}
  function range(kind,s){
    const d=date(s);
    if(kind==='week'){d.setDate(d.getDate()-(d.getDay()+6)%7);const start=day(d);d.setDate(d.getDate()+6);return {kind,start,end:day(d),id:`week:${start}`};}
    d.setDate(1);const start=day(d);d.setMonth(d.getMonth()+1);d.setDate(0);return {kind:'month',start,end:day(d),id:`month:${start}`};
  }
  function entriesFor(r,entries){return entries.filter(e=>e.localDate>=r.start&&e.localDate<=r.end).sort((a,b)=>a.occurredAt.localeCompare(b.occurredAt)||a.id.localeCompare(b.id));}
  function source(r,entries){return JSON.stringify(entriesFor(r,entries).map(e=>[e.id,e.localDate,e.occurredAt,e.moodType,e.tags||[],e.note]));}
  function candidates(entries,reports,today){
    const map=new Map(reports.map(r=>[r.id,range(r.kind,r.start)]));
    for(const e of entries)for(const kind of ['week','month']){const r=range(kind,e.localDate);if(r.end<today)map.set(r.id,r);}
    return [...map.values()].filter(r=>r.end<today).sort((a,b)=>b.end.localeCompare(a.end)||a.kind.localeCompare(b.kind));
  }
  function summarize(r,entries,moods){
    const xs=entriesFor(r,entries),days=new Set(xs.map(e=>e.localDate)).size;
    const counts=new Map(),tags=new Map(),daily=new Map();
    for(const e of xs){counts.set(e.moodType,(counts.get(e.moodType)||0)+1);for(const t of e.tags||[])tags.set(t,(tags.get(t)||0)+1);daily.set(e.localDate,e.moodType);}
    const weather=moods.filter(m=>counts.has(m.id)).map(m=>({id:m.id,count:counts.get(m.id)}));
    const frequentTags=[...tags].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN')).slice(0,8).map(([tag,count])=>({tag,count}));
    const max=Math.max(0,...weather.map(w=>w.count));
    const top=weather.filter(w=>w.count===max).map(w=>moods.find(m=>m.id===w.id).name);
    const body=xs.length===0?'这段时间已经没有心情记录。留白的日子，也一样完整。':`这段时间，你留下了 ${xs.length} 条心情，分布在 ${days} 天。${top.length?`出现最多的天气是${top.map(n=>'「'+n+'」').join('、')}（各 ${max} 条）。`:''}\n\n${xs.length<3||days<3?'记录还比较少，我们暂时不急着分析趋势。':'下面按日期整理了每天最后一次留下的天气。它只描述记录的先后，不代表心情变好或变坏。'}\n\n每一种天气都可以被收好。愿你按自己的节奏生活，不必补记，也不必一直放晴。`;
    return {...r,entryCount:xs.length,dayCount:days,weather,tags:frequentTags,trajectory:xs.length>=3&&days>=3?[...daily].map(([day,mood])=>({day,mood})):[],quotes:xs.filter(e=>e.note).slice(-3).map(e=>({day:e.localDate,note:e.note})),body};
  }
  function valid(r){
    if(!r||!['week','month'].includes(r.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(r.start||''))return false;
    const expected=range(r.kind,r.start);
    return r.id===expected.id&&r.start===expected.start&&r.end===expected.end&&Number.isInteger(r.entryCount)&&r.entryCount>=0&&Number.isInteger(r.dayCount)&&r.dayCount>=0&&r.dayCount<=r.entryCount&&typeof r.body==='string'&&r.body.length<=10000&&typeof r.sourceHash==='string'&&/^[a-f0-9]{64}$/.test(r.sourceHash)&&typeof r.generatedAt==='string'&&Number.isFinite(Date.parse(r.generatedAt))&&(r.readAt===null||typeof r.readAt==='string'&&Number.isFinite(Date.parse(r.readAt)))&&Array.isArray(r.weather)&&r.weather.length<=16&&r.weather.every(w=>typeof w.id==='string'&&Number.isInteger(w.count)&&w.count>0)&&Array.isArray(r.tags)&&r.tags.length<=8&&r.tags.every(t=>typeof t.tag==='string'&&t.tag.length<=30&&Number.isInteger(t.count)&&t.count>0)&&Array.isArray(r.trajectory)&&r.trajectory.length<=31&&r.trajectory.every(t=>typeof t.day==='string'&&typeof t.mood==='string')&&Array.isArray(r.quotes)&&r.quotes.length<=3&&r.quotes.every(q=>typeof q.day==='string'&&typeof q.note==='string'&&q.note.length<=1000);
  }
  const api={range,source,candidates,summarize,valid};
  if(typeof module!=='undefined')module.exports=api;
  else global.WeatherLetters=api;
})(typeof globalThis==='undefined'?this:globalThis);
