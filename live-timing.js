const w=new ListWidget()
w.backgroundColor=new Color("#171D25")
w.setPadding(14,16,14,16)
function label(p,s,n,b=false,c="#FFFFFF"){const t=p.addText(String(s));t.font=b?Font.boldSystemFont(n):Font.systemFont(n);t.textColor=new Color(c);return t}
async function get(u){const r=new Request(u);r.timeoutInterval=10;return await r.loadJSON()}
const fm=FileManager.local(),cache=fm.joinPath(fm.documentsDirectory(),"f1-timing-cache.json")
let d,stale=false
try{
 const sessions=await get("https://api.openf1.org/v1/sessions?session_key=latest")
 const s=sessions[0];if(!s)throw Error("No session")
 const key=s.session_key
 const [positions,drivers]=await Promise.all([get("https://api.openf1.org/v1/position?session_key="+key),get("https://api.openf1.org/v1/drivers?session_key="+key)])
 const latest={}
 for(const p of positions){if(!latest[p.driver_number]||Date.parse(p.date)>Date.parse(latest[p.driver_number].date))latest[p.driver_number]=p}
 const rows=Object.values(latest).sort((a,b)=>a.position-b.position).map(p=>({pos:p.position,name:drivers.find(x=>x.driver_number===p.driver_number)?.name_acronym||String(p.driver_number),date:p.date}))
 if(!rows.length)throw Error("No positions")
 d={title:s.session_name,location:s.location,rows,updated:Date.now(),source:"OpenF1",end:s.date_end}
 fm.writeString(cache,JSON.stringify(d))
}catch(e){
 try{const j=await get("https://api.jolpi.ca/ergast/f1/current/last/results.json");const r=j.MRData.RaceTable.Races[0];if(!r)throw Error("No results");d={title:r.raceName,location:"Race results",rows:r.Results.map(x=>({pos:x.position,name:x.Driver.code||x.Driver.familyName,gap:x.Time?.time||x.status})),source:"Jolpica",updated:Date.now()};fm.writeString(cache,JSON.stringify(d))}catch(_){stale=true;try{d=JSON.parse(fm.readString(cache))}catch(_){}}
}
label(w,"F1  /  TIMING",15,true)
w.addSpacer(5)
if(d){
 label(w,d.title,13,true)
 label(w,(stale?"CACHED · ":"")+ (d.source==="OpenF1"?"SESSION DATA · NOT GUARANTEED LIVE":"FINAL RESULTS"),9,true,"#E4AD77")
 w.addSpacer(8)
 const count=config.widgetFamily==="small"?4:8
 for(const p of d.rows.slice(0,count)){const row=w.addStack();label(row,String(p.pos).padStart(2,"0"),12,true,"#A7B6C8");row.addSpacer(10);label(row,p.name,13,true);row.addSpacer();if(p.gap)label(row,p.gap,10,false,"#B9C4D1");w.addSpacer(4)}
 w.addSpacer()
 label(w,d.source+" · "+new Date(d.updated).toLocaleTimeString(),9,false,"#A7B6C8")
}else{w.addSpacer();label(w,"Timing unavailable",14);label(w,"No verified data",11)}
w.refreshAfterDate=new Date(Date.now()+15*60000)
Script.setWidget(w)
if(!config.runsInWidget)await w.presentLarge()
Script.complete()
