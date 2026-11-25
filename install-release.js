// Run in Scriptable to install the reviewed snapshot beside your existing loader.
const release = "25ee41d677ef1a4ee56ec90f6a7c9e330666bb4f"
const hashes = {
  "mini-world.js": "e8dd730bfed9f8873ad488b68a6716852139245f",
  "live-timing.js": "59916a99a06714e4a8aacbe6c17b396a715375c7",
  "pit-garage.js": "7577125741de499ff2b2ac2e7a8e9a946cb308dc"
}
const fm = FileManager.iCloud()
const jobs = []
for (const [name, hash] of Object.entries(hashes)) {
 const req = new Request("https://raw.githubusercontent.com/hwangjinyuan-del/F1-Mini-World/"+release+"/"+name)
 req.timeoutInterval = 20
 const data = await req.load()
 if(req.response.statusCode!==200)throw Error("Download failed: "+name)
 const view = new WebView()
 await view.loadHTML("<meta charset=utf-8>")
 const base64 = data.toBase64String()
 const actual = await view.evaluateJavaScript(`(async()=>{
 try {
 const body=Uint8Array.from(atob(${JSON.stringify(base64)}),c=>c.charCodeAt(0))
 const header=new TextEncoder().encode("blob "+body.length+String.fromCharCode(0))
 const input=new Uint8Array(header.length+body.length)
 input.set(header);input.set(body,header.length)
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-1",input))
 completion(Array.from(digest,x=>x.toString(16).padStart(2,"0")).join(""))
 }catch(e){completion("Verification unavailable")}
 })()`,true)
 if(actual!==hash)throw Error("Integrity check failed: "+name)
 jobs.push({name,data})
}
for(const {name,data} of jobs){
 const dest=fm.joinPath(fm.documentsDirectory(),"F1-"+release.slice(0,7)+"-"+name)
 fm.write(dest,data)
}
const alert=new Alert()
alert.title="三個小工具已安裝"
alert.message="回到主畫面加入 Scriptable 小工具，於 Script 選擇 F1-"+release.slice(0,7)+" 開頭的對應腳本。"
alert.addAction("完成")
await alert.presentAlert()
Script.complete()