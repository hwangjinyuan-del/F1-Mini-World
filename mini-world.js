const w=new ListWidget()
w.backgroundColor=new Color("#202832")
w.setPadding(18,18,18,18)
const fm=FileManager.local()
const cache=fm.joinPath(fm.documentsDirectory(),"f1-world-data.json")
const base="https://raw.githubusercontent.com/hwangjinyuan-del/F1-Mini-World/main/"
async function get(url){const r=new Request(url);r.timeoutInterval=10;return await r.loadJSON()}
function label(p,s,n,b=false){const t=p.addText(String(s));t.font=b?Font.boldSystemFont(n):Font.systemFont(n);t.textColor=Color.white();return t}
let data,stale=false
try{
 const j=await get("https://api.jolpi.ca/ergast/f1/current.json?limit=100")
 const table=j.MRData.RaceTable
 const end=r=>Date.parse(r.date+"T"+(r.time||"23:59:59Z"))+4*3600000
 let race=table.Races.find(r=>end(r)>Date.now())
 if(!race){const next=await get("https://api.jolpi.ca/ergast/f1/"+(Number(table.season)+1)+".json?limit=100");race=next.MRData.RaceTable.Races[0]}
 if(!race)throw Error("Calendar unavailable")
 const l=race.Circuit.Location
 const weather=await get("https://api.open-meteo.com/v1/forecast?latitude="+l.lat+"&longitude="+l.long+"&current=temperature_2m,weather_code&timezone=auto")
 data={race,weather,updated:Date.now()}
 fm.writeString(cache,JSON.stringify(data))
}catch(e){stale=true;try{data=JSON.parse(fm.readString(cache))}catch(_){}}
if(data){
 const {race,weather}=data
 const h=w.addStack(),left=h.addStack();left.layoutVertically()
 label(left,race.Circuit.Location.locality,21,true)
 const df={string(d){const shifted=new Date(d.getTime()+Number(weather.utc_offset_seconds||0)*1000);const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return days[shifted.getUTCDay()]+", "+months[shifted.getUTCMonth()]+" "+shifted.getUTCDate()+" · "+String(shifted.getUTCHours()).padStart(2,"0")+":"+String(shifted.getUTCMinutes()).padStart(2,"0")}}
 label(left,df.string(new Date()),12)
 h.addSpacer()
 const right=h.addStack();right.layoutVertically()
 label(right,Math.round(weather.current.temperature_2m)+"°C",22,true)
 const c=weather.current.weather_code
 label(right,c===0?"Clear":c<=3?"Cloudy":c<=48?"Fog":c<=67?"Rain":c<=77?"Snow":c<=86?"Showers":"Storm",12)
 w.addSpacer()
 let scene=false
 try{const m=await get(base+"assets/manifest.json");const entry=m.circuits[race.Circuit.circuitId];if(entry&&entry.image){const wide=config.widgetFamily==="extraLarge"||args.widgetParameter==="wide";const path=(wide?entry.wide:entry.square)||entry.image;const img=await new Request(base+path).loadImage();w.backgroundImage=img;scene=true}}catch(e){}
 if(!scene){label(w,race.raceName,22,true);label(w,race.Circuit.circuitName,13);label(w,"Circuit artwork pending",12)}
 w.addSpacer()
 const start=new Date(race.date+"T"+(race.time||"23:59:59Z"))
 label(w,"RACE · "+race.date,12,true)
 if(start>new Date()){const d=w.addDate(start);d.applyTimerStyle();d.font=Font.mediumSystemFont(20);d.textColor=Color.white()}
 label(w,(stale?"Cached · ":"Updated · ")+df.string(new Date(data.updated)),10)
}else{label(w,"F1 MINI WORLD",22,true);w.addSpacer();label(w,"Data unavailable",14)}
w.refreshAfterDate=new Date(Date.now()+15*60000)
Script.setWidget(w)
if(!config.runsInWidget){if(args.widgetParameter==="wide")await w.presentExtraLarge();else await w.presentLarge()}
Script.complete()
