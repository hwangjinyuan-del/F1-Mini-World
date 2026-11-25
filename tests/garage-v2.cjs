const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

async function run() {
  const source = fs.readFileSync(path.join(__dirname, "../pit-garage.js"), "utf8");
  let checks = 0;
  async function execute({ cached = true, widget = false, failDownload = false, wide = false } = {}) {
    const drawings = [], widgets = [], pages = [], calls = [];
    class Size { constructor(width, height) { this.width = width; this.height = height; } }
    class Rect { constructor(x,y,width,height) { Object.assign(this,{x,y,width,height}); } }
    class Color { static white() { return new Color(); } }
    class DrawContext {
      constructor() { this.images = []; drawings.push(this); }
      setFillColor() {}
      fillRect() {}
      drawImageInRect(image, rect) { this.images.push({image,rect}); }
      getImage() { return {size:this.size,images:this.images}; }
    }
    class Widget {
      constructor() { this.texts = []; }
      setPadding() {}
      addSpacer() {}
      addText(value) { this.texts.push(value); return {}; }
      async presentLarge() {}
      async presentExtraLarge() {}
    }
    const image = {size:new Size(1536,1024)};
    const manager = {
      documentsDirectory:()=>"/docs",joinPath:(base,name)=>base+"/"+name,
      fileExists:()=>cached,readImage:()=>image,
      read:()=>({toBase64String:()=>"ZmFrZQ=="}),write:()=>calls.push("write")
    };
    const context = {
      console, Date, Size, Rect, Color, DrawContext, ListWidget:Widget,
      FileManager:{local:()=>manager},
      config:{runsInWidget:widget,widgetFamily:wide?"extraLarge":"large"},
      args:{widgetParameter:""},URLScheme:{forRunningScript:()=>"scriptable:///run"},
      Font:{boldSystemFont:()=>{},mediumSystemFont:()=>{},systemFont:()=>{}},
      Script:{setWidget:value=>widgets.push(value),complete(){}},
      Image:{fromData:()=>image},
      Request:class{
        constructor(url){calls.push(url);this.response={statusCode:200};}
        async load(){if(failDownload)throw Error("offline");return{toBase64String:()=>"dGFtcGVyZWQ="};}
      },
      WebView:class{async loadHTML(value){pages.push(value);}async present(){}}
    };
    const result = await vm.runInNewContext("(async()=>{"+source+"\nreturn {drawStage};})()",context);
    return {result,drawings,widgets,pages,calls,image};
  }
  const app = await execute();
  assert.equal(app.calls.length,0);
  assert(app.pages[0].includes("data:image/png;base64,ZmFrZQ=="));
  assert(app.pages[0].includes("四階段圖像播放"));
  checks++;
  const offline = await execute({cached:false,widget:true});
  assert.equal(offline.calls.length,0);
  assert(offline.widgets[0].texts.includes("點擊開啟，下載維修區素材"));
  checks++;
  for(const wide of [false,true]){
    const widget=await execute({widget:true,wide});
    assert.equal(widget.pages.length,0);
    assert(widget.widgets[0].backgroundImage);
  }
  checks++;
  for(const stage of [0,1,2,3]){
    for(const width of [680,1200]){
      const image=app.result.drawStage(app.image,stage,width,680);
      const fit=image.images[0].rect;
      assert(fit.x>=0&&fit.y>=0);
      assert(fit.x+fit.width<=width&&fit.y+fit.height<=680);
      const crop=image.images[0].image.images[0].rect;
      assert.equal(crop.x,-(stage%2)*fit.width);
      assert.equal(crop.y,-Math.floor(stage/2)*fit.height);
      assert.equal(crop.width,fit.width*2);
      assert.equal(crop.height,fit.height*2);
    }
  }
  checks++;
  await assert.rejects(execute({cached:false}),/素材驗證失敗/);
  await assert.rejects(execute({cached:false,failDownload:true}),/offline/);
  checks++;
  const script=app.pages[0].split("<script>")[1].split("</script>")[0];
  const controls=Object.fromEntries(["scene","stage","pause","restart","next"].map(name=>[name,{style:{}}]));
  const buttons=Array.from({length:4},()=>({setAttribute(key,value){this[key]=value;}}));
  let timer=null,visibility;
  const context={
    document:{hidden:false,getElementById:name=>controls[name],querySelectorAll:()=>buttons,
      addEventListener:(type,callback)=>{visibility=callback;}},
    setInterval:callback=>{timer=callback;return 1;},clearInterval:()=>{timer=null;}
  };
  vm.createContext(context);vm.runInContext(script,context);
  assert.equal(controls.stage.textContent,"準備進站");
  timer();assert.equal(controls.stage.textContent,"拆卸舊胎");
  controls.pause.onclick();assert.equal(timer,null);
  controls.next.onclick();assert.equal(controls.stage.textContent,"裝上新胎");
  controls.restart.onclick();assert.equal(controls.stage.textContent,"準備進站");
  buttons[3].onclick();assert.equal(controls.stage.textContent,"換胎完成");
  assert.equal(buttons[3]["aria-pressed"],"true");
  checks++;
  controls.restart.onclick();context.document.hidden=true;visibility();assert.equal(timer,null);
  context.document.hidden=false;visibility();assert.equal(typeof timer,"function");
  checks++;
  console.log("PASS "+checks+" garage v2 checks");
}
module.exports=run;
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
