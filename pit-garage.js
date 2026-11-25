// F1 Pit Garage · self-contained Scriptable scene
const view = new WebView()
await view.loadHTML("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>*{margin:0}canvas{width:100vw;height:100vh;display:block}</style><canvas></canvas><script>function draw(t) {\n const c=document.querySelector('canvas'), g=c.getContext('2d');\n const W=c.width,H=c.height,S=Math.min(W/720,H/520);\n g.setTransform(1,0,0,1,0,0);\n const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#141c24');sky.addColorStop(1,'#33434c');g.fillStyle=sky;g.fillRect(0,0,W,H);\n g.translate(W/2,H*.57);g.scale(S,S);\n const pt=(x,y,z)=>[(x-y)*1.05,(x+y)*.49-z];\n function face(points,color){g.beginPath();points.forEach(([x,y,z],i)=>g[i?'lineTo':'moveTo'](...pt(x,y,z)));g.closePath();g.fillStyle=color;g.fill()}\n function box(x,y,z,a,b,h,top,side='#36444f',front='#24343f'){\n face([[x+a,y,z],[x+a,y+b,z],[x+a,y+b,z+h],[x+a,y,z+h]],side);\n face([[x,y+b,z],[x+a,y+b,z],[x+a,y+b,z+h],[x,y+b,z+h]],front);\n face([[x,y,z+h],[x+a,y,z+h],[x+a,y+b,z+h],[x,y+b,z+h]],top)}\n function ball(x,y,z,rx,ry,color){let [a,b]=pt(x,y,z);g.beginPath();g.ellipse(a,b,rx,ry,0,0,7);g.fillStyle=color;g.fill()}\n box(-162,-118,-12,324,236,12,'#647078');\n for(let i=-160;i<160;i+=32)box(i,-118,0,.65,236,.4,'#475761');\n box(-162,-118,0,324,5,70,'#96a2a6');box(-162,-118,0,5,236,70,'#8c999f');\n box(-157,-112,58,310,2,3,'#ffdd9d','#ffe5af','#ffe5af');\n for(let i=-120;i<128;i+=52){box(i,-107,0,44,22,32,'#718089');for(let k=8;k<32;k+=8)box(i+4,-85,k,35,1,1,'#95a0a4')}\n box(54,-99,32,38,3,21,'#888','#202e37','#75b5ba');\n const motion=(1-Math.cos(t*2*Math.PI))/2;\n box(-75,-17,8,120,34,11,'#ad5444','#71362f','#723c35');box(-40,-13,19,42,26,10,'#c97558');\n ball(6,0,22,12,7,'#1a242b');ball(7,0,26,6,6,'#d6b47c');\n box(33,-6,12,55,12,6,'#cb846e');box(81,-27,8,10,54,4,'#38434c');\n box(-75,-27,26,9,54,4,'#43515c');\n for(const x of [-52,54])for(const s of [-1,1]){\n const y=s*(23+15*motion);ball(x,y,12,15,13,'#141b20');ball(x+3,y+3,12,8,8,'#42505a');ball(x+3,y+3,12,3,3,'#b5a789');\n const ty=s*(54+8*motion);box(x-6,ty-5,0,12,11,17,'#64767d');ball(x,ty,25,8,11,'#657780');ball(x,ty,37,8,8,'#c4a473');ball(x+3,ty+2,38,5,3,'#29343a');\n box(x,Math.min(ty,y),14,3,Math.abs(ty-y),3,'#a4afb1')}\n for(let i=0;i<3;i++)ball(-130,52,8+i*8,19,8,'#222b30');\n}\nfunction render(t,w,h){const c=document.querySelector('canvas');c.width=w;c.height=h;draw(t)}\nfunction loop(ms){render(ms/4000,innerWidth*devicePixelRatio,innerHeight*devicePixelRatio);requestAnimationFrame(loop)}</script>")
if (config.runsInWidget) {
 const wide = config.widgetFamily === "extraLarge"
 const phase = (Math.floor(Date.now()/900000)%4)/4
 const png = await view.evaluateJavaScript("render("+phase+","+(wide?1200:680)+",680);document.querySelector('canvas').toDataURL('image/png').split(',')[1]")
 const widget = new ListWidget()
 widget.backgroundImage = Image.fromData(Data.fromBase64String(png))
 widget.url = URLScheme.forRunningScript()
 widget.setPadding(18,18,18,18)
 const title = widget.addText("F1  /  PIT GARAGE")
 title.font = Font.boldSystemFont(14)
 title.textColor = Color.white()
 widget.addSpacer()
 widget.refreshAfterDate = new Date(Date.now()+900000)
 Script.setWidget(widget)
} else {
 await view.evaluateJavaScript("requestAnimationFrame(loop); true")
 await view.present(true)
}
Script.complete()
