(()=>{
 const tables=new Map();
 const stores={contains:n=>tables.has(n)};
 const db={
 objectStoreNames:stores,
 createObjectStore(n){tables.set(n,new Map());return {createIndex(){}}},
 transaction(names,mode){
  const t={oncomplete:null,onerror:null,onabort:null};let pending=0,queued=false;
  function finish(){if(!pending&&!queued){queued=true;setTimeout(()=>{queued=false;if(!pending)t.oncomplete?.()},0)}}
  function action(fn){pending++;const r={onsuccess:null,onerror:null,result:undefined,error:null};setTimeout(()=>{try{r.result=fn();r.onsuccess?.({target:r})}catch(e){r.error=e;r.onerror?.({target:r});t.onerror?.({target:t})}pending--;finish()},0);return r}
  t.objectStore=name=>{const map=tables.get(name); if(!map)throw Error('no store:'+name);return {
   getAll:()=>action(()=>[...map.values()].map(x=>structuredClone(x))),
   get:key=>action(()=>map.has(key)?structuredClone(map.get(key)):undefined),
   put:item=>action(()=>{map.set(item.id??item.key,structuredClone(item));return item.id??item.key}),
   delete:key=>action(()=>map.delete(key)),
   clear:()=>action(()=>map.clear())
  }};setTimeout(()=>{if(!pending)finish()},0);return t;
 }
 };
 Object.defineProperty(window,'indexedDB',{value:{open(name,version){const req={result:db,onupgradeneeded:null,onsuccess:null,onerror:null};setTimeout(()=>{req.onupgradeneeded?.();req.onsuccess?.()},0);return req}},configurable:true});
})();
