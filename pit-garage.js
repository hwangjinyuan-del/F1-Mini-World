// F1 Pit Garage v2 · generated miniature artwork with four illustrated stages.
// Artwork is a generic artistic scene. It does not depict a verified team's garage.
// F1 Mini World installer. Downloads an immutable release and checks SHA-256.
function sha256(bytes) {
  const constants = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const state = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const padded = bytes.slice();
  const bitLength = bytes.length * 8;
  padded.push(128);
  while (padded.length % 64 !== 56) padded.push(0);
  const high = Math.floor(bitLength / 4294967296), low = bitLength >>> 0;
  for (const word of [high, low]) for (let shift = 24; shift >= 0; shift -= 8) padded.push((word >>> shift) & 255);
  const rotate = (value, bits) => (value >>> bits) | (value << (32 - bits));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = [];
    for (let i = 0; i < 16; i++) {
      const pos = offset + i * 4;
      words[i] = (padded[pos] << 24) | (padded[pos + 1] << 16) | (padded[pos + 2] << 8) | padded[pos + 3];
    }
    for (let i = 16; i < 64; i++) {
      const x = words[i - 15], y = words[i - 2];
      words[i] = (words[i - 16] + (rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3)) +
        words[i - 7] + (rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10))) | 0;
    }
    let [a,b,c,d,e,f,g,h] = state;
    for (let i = 0; i < 64; i++) {
      const first = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
        ((e & f) ^ (~e & g)) + constants[i] + words[i]) | 0;
      const second = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) +
        ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h=g; g=f; f=e; e=(d+first)|0; d=c; c=b; b=a; a=(first+second)|0;
    }
    [a,b,c,d,e,f,g,h].forEach((value, index) => { state[index] = (state[index] + value) | 0; });
  }
  return state.map(value => (value >>> 0).toString(16).padStart(8, "0")).join("");
}

function decodeBase64(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = [];
  let bits = 0, buffer = 0;
  for (const char of value.replace(/=+$/, "")) {
    const number = alphabet.indexOf(char);
    if (number < 0) throw new Error("Invalid base64");
    buffer = (buffer << 6) | number;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 255);
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}


const BUILD = "2026.11.26.1";
const ASSET_VERSION = "487ce80c78e19e40fed27f35db5ffcfc1e9fc562";
const ASSET_NAME = "f1-pit-stages-v2.png";
const ASSET_HASH = "0690faf2afc330be2660affe5c1de4fa77ed2890a8ad7278a1a29b39abdc87e1";
const fm = FileManager.local();
const assetPath = fm.joinPath(fm.documentsDirectory(), ASSET_NAME);
const wide = config.widgetFamily === "extraLarge" || String(args.widgetParameter || "").includes("wide");
const preview = String(args.widgetParameter || "").includes("preview");
const stages = ["準備進站", "拆卸舊胎", "裝上新胎", "換胎完成"];

async function loadArtwork() {
  if (fm.fileExists(assetPath)) {
    try { return fm.readImage(assetPath); }
    catch (error) { console.warn("Artwork cache: " + error); }
  }
  // Initial download and integrity checking run in the app, avoiding widget memory spikes.
  if (config.runsInWidget) return null;
  const request = new Request("https://raw.githubusercontent.com/hwangjinyuan-del/F1-Mini-World/" +
    ASSET_VERSION + "/assets/garage/pit-stages-v2.png");
  request.timeoutInterval = 30;
  const data = await request.load();
  if (request.response.statusCode !== 200) throw new Error("維修區素材下載失敗");
  if (sha256(decodeBase64(data.toBase64String())) !== ASSET_HASH) throw new Error("維修區素材驗證失敗");
  const image = Image.fromData(data);
  fm.write(assetPath, data);
  return image;
}

function drawStage(image, stage, width, height) {
  const context = new DrawContext();
  context.size = new Size(width, height);
  context.opaque = true;
  context.respectScreenScale = false;
  context.setFillColor(new Color("#20252b"));
  context.fillRect(new Rect(0, 0, width, height));
  const frameWidth = image.size.width / 2;
  const frameHeight = image.size.height / 2;
  const scale = Math.min((width - 24) / frameWidth, (height - 100) / frameHeight);
  const panelWidth = frameWidth * scale, panelHeight = frameHeight * scale;
  const x = (width - panelWidth) / 2, y = (height - panelHeight) / 2;
  // Crop the selected atlas cell in its own drawing context before fitting it into the widget.
  const crop = new DrawContext();
  crop.size = new Size(panelWidth, panelHeight);
  crop.opaque = true;
  crop.respectScreenScale = false;
  crop.drawImageInRect(image, new Rect(-(stage % 2) * panelWidth,
    -Math.floor(stage / 2) * panelHeight, panelWidth * 2, panelHeight * 2));
  context.drawImageInRect(crop.getImage(), new Rect(x, y, panelWidth, panelHeight));
  return context.getImage();
}

const artwork = await loadArtwork();
if (config.runsInWidget || preview || !artwork) {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#20252b");
  widget.setPadding(16, 18, 16, 18);
  widget.url = URLScheme.forRunningScript();
  const title = widget.addText("F1  /  PIT GARAGE");
  title.font = Font.boldSystemFont(14);
  title.textColor = Color.white();
  widget.addSpacer();
  if (artwork) {
    const stage = Math.floor(Date.now() / 900000) % 4;
    widget.backgroundImage = drawStage(artwork, stage, wide ? 1200 : 680, 680);
    const caption = widget.addText(stages[stage] + " · 點擊播放");
    caption.font = Font.mediumSystemFont(11);
    caption.textColor = Color.white();
  } else {
    const message = widget.addText("點擊開啟，下載維修區素材");
    message.font = Font.systemFont(12);
    message.textColor = Color.white();
  }
  widget.refreshAfterDate = new Date(Date.now() + 900000);
  Script.setWidget(widget);
  if (!config.runsInWidget) {
    if (wide) await widget.presentExtraLarge();
    else await widget.presentLarge();
  }
} else {
  const view = new WebView();
  // Embed the verified local image so subsequent playback works offline.
  const imageURL = "data:image/png;base64," + fm.read(assetPath).toBase64String();
  const html = "<!doctype html><html lang='zh-Hant'><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>" +
    "<style>*{box-sizing:border-box}html,body{margin:0;background:#20252b;color:#eeeae2;font-family:-apple-system,sans-serif}" +
    "body{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column}" +
    "main{flex:1;display:grid;place-items:center;padding:20px 14px}" +
    "#scene{width:min(100%,calc((100dvh - 190px)*1.5));aspect-ratio:3/2;background-image:url(" + imageURL + ");background-size:200% 200%;background-repeat:no-repeat}" +
    "footer{padding:12px 20px max(18px,env(safe-area-inset-bottom));background:#191e23}" +
    ".caption{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}" +
    "small{font-size:11px;color:#b5afa5}nav{display:flex;flex-wrap:wrap;gap:8px}" +
    "button{border:1px solid #58606a;border-radius:10px;background:#2e353d;color:#eeeae2;padding:10px 16px;font-size:14px}" +
    "button[aria-pressed=true]{border-color:#b89e74;background:#504739}" +
    ".phases{display:flex;gap:6px}.phases button{padding:8px 12px;font-size:12px}" +
    "@media(max-width:600px){.caption{align-items:flex-start;flex-direction:column}#scene{width:100%}.phases button{padding:6px 9px}main{padding:10px 6px}}" +
    "</style><main><div id='scene' role='img' aria-label='精緻微縮維修區分階段場景'></div></main><footer>" +
    "<div class='caption'><strong id='stage'></strong><div class='phases'>" +
    stages.map((name, index) => "<button data-stage='" + index + "' aria-pressed='false'>" + name + "</button>").join("") +
    "</div></div><nav><button id='pause'>暫停</button><button id='restart'>重新播放</button><button id='next'>下一階段</button></nav>" +
    "<p><small>AI 微縮場景 · 四階段圖像播放</small></p></footer><script>" +
    "const stages = [\"準備進站\", \"拆卸舊胎\", \"裝上新胎\", \"換胎完成\"];\nconst positions = [\"0% 0%\", \"100% 0%\", \"0% 100%\", \"100% 100%\"];\nlet stage = 0;\nlet paused = false;\nlet interval = null;\nfunction showStage(index) {\n  stage = (index + stages.length) % stages.length;\n  document.getElementById(\"scene\").style.backgroundPosition = positions[stage];\n  document.getElementById(\"stage\").textContent = stages[stage];\n  document.querySelectorAll(\"[data-stage]\").forEach((button, index) => {\n    button.setAttribute(\"aria-pressed\", String(index === stage));\n  });\n}\nfunction stop() {\n  if (interval !== null) clearInterval(interval);\n  interval = null;\n}\nfunction play() {\n  stop();\n  if (!paused && !document.hidden) interval = setInterval(() => showStage(stage + 1), 2500);\n}\ndocument.getElementById(\"pause\").onclick = () => {\n  paused = !paused;\n  document.getElementById(\"pause\").textContent = paused ? \"繼續\" : \"暫停\";\n  play();\n};\ndocument.getElementById(\"restart\").onclick = () => {\n  paused = false;\n  document.getElementById(\"pause\").textContent = \"暫停\";\n  showStage(0);\n  play();\n};\ndocument.getElementById(\"next\").onclick = () => {\n  paused = true;\n  document.getElementById(\"pause\").textContent = \"繼續\";\n  stop();\n  showStage(stage + 1);\n};\ndocument.querySelectorAll(\"[data-stage]\").forEach((button, index) => {\n  button.onclick = () => {\n    paused = true;\n    document.getElementById(\"pause\").textContent = \"繼續\";\n    stop();\n    showStage(index);\n  };\n});\ndocument.addEventListener(\"visibilitychange\", play);\nshowStage(0);\nplay();" + "</script></html>";
  await view.loadHTML(html);
  await view.present(true);
}
Script.complete();
