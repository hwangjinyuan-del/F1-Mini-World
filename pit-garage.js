// F1 Pit Garage · self-contained scene with four wheel-service phases.
const BUILD = "2026.11.25.2";
const wide = config.widgetFamily === "extraLarge" || String(args.widgetParameter || "").includes("wide");
const view = new WebView();
const html = "<!doctype html><html lang=\"zh-Hant\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">\n<style>\n*{box-sizing:border-box}body{margin:0;background:#141c24;color:#edf1ef;font-family:-apple-system,BlinkMacSystemFont,sans-serif}\ncanvas{display:block;width:100vw;height:calc(100dvh - 130px)}\nfooter{height:130px;padding:12px 20px max(16px,env(safe-area-inset-bottom));background:#19252e}\n.status{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}\nsmall{color:#a4b6c0}nav{display:flex;gap:10px}button{background:#344752;color:#edf1ef;border:1px solid #5b707c;border-radius:12px;padding:12px 20px;font-size:15px}\nbutton:focus-visible{outline:2px solid #e4b979}\n</style><canvas aria-label=\"微縮維修區換胎示意動畫\"></canvas><footer>\n<div class=\"status\"><strong id=\"stage\">進站舉升</strong><small>換胎流程示意</small></div>\n<nav><button id=\"pause\">暫停</button><button id=\"restart\">重新播放</button><button id=\"next\">下一階段</button></nav>\n</footer><script>function draw(t) {\n const c=document.querySelector('canvas'), g=c.getContext('2d');\n const W=c.width,H=c.height,S=Math.min(W/720,H/520);\n g.setTransform(1,0,0,1,0,0);\n const sky=g.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#141c24');sky.addColorStop(1,'#33434c');g.fillStyle=sky;g.fillRect(0,0,W,H);\n g.translate(W/2,H*.57);g.scale(S,S);\n const pt=(x,y,z)=>[(x-y)*1.05,(x+y)*.49-z];\n function face(points,color){g.beginPath();points.forEach(([x,y,z],i)=>g[i?'lineTo':'moveTo'](...pt(x,y,z)));g.closePath();g.fillStyle=color;g.fill()}\n function box(x,y,z,a,b,h,top,side='#36444f',front='#24343f'){\n face([[x+a,y,z],[x+a,y+b,z],[x+a,y+b,z+h],[x+a,y,z+h]],side);\n face([[x,y+b,z],[x+a,y+b,z],[x+a,y+b,z+h],[x,y+b,z+h]],front);\n face([[x,y,z+h],[x+a,y,z+h],[x+a,y+b,z+h],[x,y+b,z+h]],top)}\n function ball(x,y,z,rx,ry,color){let [a,b]=pt(x,y,z);g.beginPath();g.ellipse(a,b,rx,ry,0,0,7);g.fillStyle=color;g.fill()}\n box(-162,-118,-12,324,236,12,'#647078');\n for(let i=-160;i<160;i+=32)box(i,-118,0,.65,236,.4,'#475761');\n box(-162,-118,0,324,5,70,'#96a2a6');box(-162,-118,0,5,236,70,'#8c999f');\n box(-157,-112,58,310,2,3,'#ffdd9d','#ffe5af','#ffe5af');\n for(let i=-120;i<128;i+=52){box(i,-107,0,44,22,32,'#718089');for(let k=8;k<32;k+=8)box(i+4,-85,k,35,1,1,'#95a0a4')}\n box(54,-99,32,38,3,21,'#888','#202e37','#75b5ba');\n const step=((t%1)+1)%1;\n const lift=step<.12?step/.12:step>.88?(1-step)/.12:1;\n const motion=step<.25?0:step<.42?(step-.25)/.17:step<.58?1:step<.75?1-(step-.58)/.17:0;\n // A front and rear jack raise the car while the wheels are serviced.\n box(-98,-8,0,18,16,4,'#ba9e68');\n box(-88,-2,4,30,4,8*lift,'#82929d');\n box(90,-8,0,18,16,4,'#ba9e68');\n box(72,-2,4,30,4,8*lift,'#82929d');\n box(-75,-17,8+6*lift,120,34,11,'#ad5444','#71362f','#723c35');box(-40,-13,19+6*lift,42,26,10,'#c97558');\n ball(6,0,22+6*lift,12,7,'#1a242b');ball(7,0,26+6*lift,6,6,'#d6b47c');\n box(33,-6,12+6*lift,55,12,6,'#cb846e');box(81,-27,8+6*lift,10,54,4,'#38434c');\n box(-75,-27,26+6*lift,9,54,4,'#43515c');\n for(const x of [-52,54])for(const s of [-1,1]){\n const y=s*(23+22*motion);ball(x,y,12+6*lift,15,13,step<.5?'#393b38':'#141b20');ball(x+3,y+3,12+6*lift,8,8,'#42505a');ball(x+3,y+3,12+6*lift,3,3,step<.5?'#b5a789':'#cebd6e');\n const ty=s*(54+8*motion);box(x-6,ty-5,0,12,11,17,'#64767d');ball(x,ty,25,8,11,'#657780');ball(x,ty,37,8,8,'#c4a473');ball(x+3,ty+2,38,5,3,'#29343a');\n box(x,Math.min(ty,y),14,3,Math.abs(ty-y),3,'#a4afb1')}\n for(let i=0;i<3;i++)ball(-130,52,8+i*8,19,8,'#222b30');\n}\nconst stageNames=[\"進站舉升\",\"拆卸舊胎\",\"裝上新胎\",\"鎖緊並放車\"];\nlet elapsed=0,paused=false,lastFrame=null;\nfunction render(t,w,h){\n const c=document.querySelector('canvas');\n if(c.width!==w||c.height!==h){c.width=w;c.height=h}\n draw(t);\n}\nfunction frame(ms){\n if(lastFrame!==null&&!paused)elapsed+=Math.min(ms-lastFrame,100);\n lastFrame=ms;\n const t=(elapsed%8000)/8000;\n render(t,Math.round(innerWidth*Math.min(devicePixelRatio,2)),Math.round(Math.max(180,innerHeight-130)*Math.min(devicePixelRatio,2)));\n document.getElementById('stage').textContent=stageNames[Math.floor(t*4)];\n requestAnimationFrame(frame);\n}\ndocument.getElementById('pause').onclick=()=>{\n paused=!paused;document.getElementById('pause').textContent=paused?\"繼續\":\"暫停\";\n};\ndocument.getElementById('restart').onclick=()=>{\n elapsed=0;paused=false;document.getElementById('pause').textContent=\"暫停\";\n};\ndocument.getElementById('next').onclick=()=>{\n elapsed=((Math.floor(elapsed/2000)+1)%4)*2000;\n paused=true;document.getElementById('pause').textContent=\"繼續\";\n};\ndocument.addEventListener('visibilitychange',()=>{lastFrame=null});\n</script></html>";
await view.loadHTML(html);
if (config.runsInWidget || String(args.widgetParameter || "").includes("preview")) {
  const phase = (Math.floor(Date.now() / 900000) % 4) / 4;
  const png = await view.evaluateJavaScript("render(" + phase + "," + (wide ? 1200 : 680) +
    ",680);document.querySelector('canvas').toDataURL('image/png').split(',')[1]");
  const widget = new ListWidget();
  widget.backgroundImage = Image.fromData(Data.fromBase64String(png));
  widget.url = URLScheme.forRunningScript();
  widget.setPadding(16, 18, 16, 18);
  const title = widget.addText("F1  /  PIT GARAGE");
  title.font = Font.boldSystemFont(14);
  title.textColor = Color.white();
  widget.addSpacer();
  const stages = ["進站舉升", "拆卸舊胎", "裝上新胎", "鎖緊並放車"];
  const caption = widget.addText(stages[Math.floor(phase * 4)] + " · 點擊播放");
  caption.font = Font.mediumSystemFont(11);
  caption.textColor = Color.white();
  widget.refreshAfterDate = new Date(Date.now() + 900000);
  Script.setWidget(widget);
  if (!config.runsInWidget) {
    if (wide) await widget.presentExtraLarge();
    else await widget.presentLarge();
  }
} else {
  await view.evaluateJavaScript("requestAnimationFrame(frame); true");
  await view.present(true);
}
Script.complete();
