const w=new ListWidget()
w.backgroundColor=new Color("#171D25")
w.setPadding(14,16,14,16)
function label(p,s,n,b=false,c="#FFFFFF"){const t=p.addText(String(s));t.font=b?Font.boldSystemFont(n):Font.systemFont(n);t.textColor=new Color(c);return t}
async function get(u){const r=new Request(u);r.timeoutInterval=10;return await r.loadJSON()}
const fm=FileManager.local(),cache=fm.joinPath(fm.documentsDirectory(),"f1-classification-v2.json")
let d,stale=false
try{
 const api="https://api.openf1.org/v1/"
 const year=new Date().getUTCFullYear()
 let sessions=await get(api+"sessions?year="+year)
 function completed(list){return list.filter(s=>["Race","Sprint","Qualifying","Sprint Qualifying","Sprint Shootout"].includes(s.session_name)&&Date.parse(s.date_end)<=Date.now()).sort((a,b)=>Date.parse(b.date_end)-Date.parse(a.date_end))}
 let s=completed(sessions)[0]
 if(!s)s=completed(await get(api+"sessions?year="+(year-1)))[0]
 if(!s)throw Error("No completed event")
 const query="?session_key="+s.session_key
 const [results,drivers]=await Promise.all([get(api+"session_result"+query),get(api+"drivers"+query)])
 function gapText(value){if(Array.isArray(value))value=value.filter(x=>x!=null).pop();if(typeof value==="number")return value===0?"LEADER":"+"+value.toFixed(3);return value||"—"}
 const rows=results.slice().sort((a,b)=>(a.position??999)-(b.position??999)).map(r=>{
 const driver=drivers.find(x=>x.driver_number===r.driver_number)||{}
 return {pos:r.position??"—",name:driver.name_acronym||String(r.driver_number),color:/^[0-9a-f]{6}$/i.test(driver.team_colour)?"#"+driver.team_colour:null,laps:r.number_of_laps,gap:r.dsq?"DSQ":r.dns?"DNS":r.dnf?"DNF":gapText(r.gap_to_leader)}
 })
 if(!rows.length)throw Error("Classification pending")
 d={title:s.location+" · "+s.session_name,rows,updated:Date.now(),source:"OpenF1",end:s.date_end}
 fm.writeString(cache,JSON.stringify(d))
}catch(e){
 try{const j=await get("https://api.jolpi.ca/ergast/f1/current/last/results.json");const r=j.MRData.RaceTable.Races[0];if(!r)throw Error("No results");d={title:r.raceName,location:"Race results",rows:r.Results.map(x=>({pos:x.position,laps:x.laps,name:x.Driver.code||x.Driver.familyName,gap:x.Time?.time||x.status})),source:"Jolpica",updated:Date.now()};fm.writeString(cache,JSON.stringify(d))}catch(_){stale=true;try{d=JSON.parse(fm.readString(cache))}catch(_){}}
}
label(w,"F1  /  TIMING",15,true)
w.addSpacer(5)
if(d){
 label(w,d.title,13,true)
 label(w,(stale?"CACHED · ":"")+ "歷史賽果",9,true,"#E4AD77")
 w.addSpacer(8)
 const count=config.widgetFamily==="small"?4:8
 for(const p of d.rows.slice(0,count)){const row=w.addStack();label(row,String(p.pos).padStart(2,"0"),12,true,"#A7B6C8");row.addSpacer(10);label(row,p.name,13,true,p.color||"#FFFFFF");row.addSpacer(8);label(row,p.laps==null?"—":p.laps+" L",10);row.addSpacer();if(p.gap)label(row,p.gap,10,false,"#B9C4D1");w.addSpacer(4)}
 w.addSpacer()
 label(w,d.source+" · "+new Date(d.updated).toLocaleTimeString(),9,false,"#A7B6C8")
}else{w.addSpacer();label(w,"Timing unavailable",14);label(w,"No verified data",11)}
w.refreshAfterDate=new Date(Date.now()+15*60000)
Script.setWidget(w)
if(!config.runsInWidget)await w.presentLarge()
Script.complete()
