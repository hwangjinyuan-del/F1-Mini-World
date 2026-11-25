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

const release = "d4dc71b3f377c90e6b3744f831774fa6db4ad29d";
const hashes = {
  "mini-world.js": "989ab668f75655346941f97955dae25f1f025a91adfb514d49005de064277f8e",
  "live-timing.js": "f642779d642b776692bf5134323bad22957e798754f9976233f90aa768d8f1ce",
  "pit-garage.js": "e81d47da7c5819005332f202d92e11066f9bd33cdc8237b45763e2f72ff2d8f2"
};
const names = {
  "mini-world.js": "F1 賽道",
  "live-timing.js": "F1 賽果",
  "pit-garage.js": "F1 維修區"
};
const fm = FileManager.iCloud();
const files = [];
for (const [name, expected] of Object.entries(hashes)) {
  const request = new Request("https://raw.githubusercontent.com/hwangjinyuan-del/F1-Mini-World/" + release + "/" + name);
  request.timeoutInterval = 20;
  const data = await request.load();
  if (request.response.statusCode !== 200) throw new Error("下載失敗 · " + name);
  const actual = sha256(decodeBase64(data.toBase64String()));
  if (actual !== expected) throw new Error("檔案驗證失敗 · " + name + "\n預期 " + expected + "\n收到 " + actual);
  const filename = names[name] + " " + release.slice(0, 7) + ".js";
  const path = fm.joinPath(fm.documentsDirectory(), filename);
  if (fm.fileExists(path)) {
    await fm.downloadFileFromiCloud(path);
    if (sha256(decodeBase64(fm.read(path).toBase64String())) !== expected) {
      throw new Error("同名腳本已被修改，請先重新命名 · " + filename);
    }
  }
  files.push({ path, data });
}
// All downloads and existing filenames are checked before installation.
const created = [];
try {
  for (const file of files) {
    if (fm.fileExists(file.path)) continue;
    created.push(file.path);
    fm.write(file.path, file.data);
  }
} catch (error) {
  for (const path of created) {
    try { if (fm.fileExists(path)) fm.remove(path); } catch (cleanupError) { console.warn(String(cleanupError)); }
  }
  throw error;
}
const alert = new Alert();
alert.title = "三個小工具已安裝";
alert.message = "版本 " + release.slice(0, 7) +
  "\n\nScriptable 清單中已加入 F1 賽道、F1 賽果、F1 維修區。" +
  "\n加入主畫面後選對應腳本即可。超大型會自動使用橫向版。" +
  "\n點擊賽果可看全表，點擊維修區可播放動畫。";
alert.addAction("完成");
await alert.presentAlert();
Script.complete();
