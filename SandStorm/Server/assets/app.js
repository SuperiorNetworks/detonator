const $ = id => document.getElementById(id);

const state = {
  session: "demo",
  version: 0,
  audioUrl: "",
  triggers: [],
  selectedId: null,
  action: "ON",
  relayStates: Array(17).fill(false),
  zoom: 1,
  saving: false,
  simTimer: null,
  simStartMs: 0,
  simStartAudioTime: 0,
  isSimulating: false,
  lastControlCommand: "",
  simulationArmedTimer: null,
  clockOffsetMs: 0,
  startingFromSharedCommand: false,
  wavePeaks: [],
  waveLoadedUrl: "",
  waveLoading: false,
  waveDuration: 0
};

const audio = $("audio");
const timelineCanvas = $("timelineCanvas");
const tctx = timelineCanvas.getContext("2d");
const waveCanvas = $("waveCanvas");
const wctx = waveCanvas.getContext("2d");

function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }

function fmt(sec){
  sec = Math.max(0, Number(sec)||0);
  const m = Math.floor(sec/60);
  const s = Math.floor(sec%60).toString().padStart(2,"0");
  const ms = Math.floor((sec%1)*1000).toString().padStart(3,"0");
  return `${m}:${s}.${ms}`;
}

function sessionSafe(){
  return $("sessionName").value.trim().replace(/[^a-zA-Z0-9_-]/g,"_") || "demo";
}

async function api(path, data=null, form=false){
  const opts = {};
  if(data){
    opts.method = "POST";
    opts.body = form ? data : JSON.stringify(data);
    if(!form) opts.headers = {"Content-Type":"application/json"};
  }
  const r = await fetch(path, opts);
  if(!r.ok) throw new Error(await r.text());
  return await r.json();
}

function setOnline(ok, text){
  const el = $("syncStatus");
  el.className = "pill " + (ok ? "online" : "offline");
  el.innerHTML = `<span></span> ${text || (ok ? "Synced" : "Offline")}`;
}

async function loadSession(){
  state.session = sessionSafe();
  try{
    const data = await api(`api/load.php?session=${encodeURIComponent(state.session)}`);
    state.version = data.version || 0;
    state.audioUrl = data.audioUrl || "";
    state.triggers = data.triggers || [];
    if(state.audioUrl) setAudioSource(state.audioUrl);
    setOnline(true, "Synced");
    renderAll();
    loadSharedWaveform().then(found => {
      if(!found && state.audioUrl) buildRealWaveform(state.audioUrl);
    });
    pollControl();
  }catch(e){
    setOnline(false, "Load error");
    console.error(e);
  }
}

async function saveSession(){
  if(state.saving) return;
  state.saving = true;
  try{
    const data = await api("api/save.php", {
      session: state.session,
      version: state.version,
      audioUrl: state.audioUrl,
      triggers: state.triggers
    });
    state.version = data.version || state.version;
    setOnline(true, "Saved");
  }catch(e){
    setOnline(false, "Save error");
    console.error(e);
  }finally{ state.saving = false; }
}

async function poll(){
  try{
    const data = await api(`api/load.php?session=${encodeURIComponent(state.session)}&since=${state.version}`);
    if(data.changed){
      state.version = data.version || 0;
      state.audioUrl = data.audioUrl || "";
      state.triggers = data.triggers || [];
      if(state.audioUrl) setAudioSource(state.audioUrl);
      renderAll();
    }
    setOnline(true, "Synced");
  }catch(e){ setOnline(false, "Offline"); }
}
setInterval(poll, 1200);
setInterval(pollControl, 300);

function getDuration(){ return audio.duration && isFinite(audio.duration) ? audio.duration : 120; }

function audioUrlForSession(url){
  if(!url) return "";
  if(url.includes("data/uploads/") || url.endsWith("audio.mp3")){
    return `api/audio.php?session=${encodeURIComponent(state.session)}`;
  }
  return url;
}

function setAudioSource(url){
  const clean = audioUrlForSession(url);
  if(!clean) {
    audio.removeAttribute("src");
    audio.load();
    return;
  }
  audio.src = clean + (clean.includes("?") ? "&" : "?") + "v=" + state.version;
  audio.load();
}

function resizeCanvases(){
  const dpr = window.devicePixelRatio || 1;
  const tw = $("timelineWrap").clientWidth * state.zoom;
  timelineCanvas.width = Math.max(900, tw) * dpr;
  timelineCanvas.height = 170 * dpr;
  timelineCanvas.style.width = Math.max(900, tw) + "px";
  timelineCanvas.style.height = "170px";
  tctx.setTransform(dpr,0,0,dpr,0,0);

  const wb = waveCanvas.parentElement.getBoundingClientRect();
  waveCanvas.width = wb.width * dpr;
  waveCanvas.height = wb.height * dpr;
  waveCanvas.style.width = wb.width + "px";
  waveCanvas.style.height = wb.height + "px";
  wctx.setTransform(dpr,0,0,dpr,0,0);

  if(!Array.isArray(state.wavePeaks)) state.wavePeaks = [];
  drawTimeline();
  drawWave();
  saveSharedWaveform();
}

async function saveSharedWaveform(){
  if(!state.wavePeaks || !state.wavePeaks.length) return;

  try{
    await api("api/save_waveform.php", {
      session: state.session,
      duration: state.waveDuration || getDuration(),
      peaks: state.wavePeaks
    });
    console.log("Shared waveform saved:", state.wavePeaks.length);
  }catch(e){
    console.warn("Could not save shared waveform:", e);
  }
}

async function loadSharedWaveform(){
  try{
    const data = await api(`api/load_waveform.php?session=${encodeURIComponent(state.session)}&v=${Date.now()}`);
    if(data && data.has_waveform && Array.isArray(data.peaks) && data.peaks.length){
      state.wavePeaks = data.peaks;
      state.waveDuration = data.duration || 0;
      console.log("Shared waveform loaded:", state.wavePeaks.length);
      drawWave();
      return true;
    }
  }catch(e){
    console.warn("No shared waveform yet:", e);
  }
  return false;
}

async function decodeArrayBufferToPeaks(arrayBuffer, sourceLabel="MP3"){
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if(!AudioCtx) throw new Error("Web Audio API not supported");

  const ctx = new AudioCtx();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

  const channels = [];
  for(let c=0; c<audioBuffer.numberOfChannels; c++){
    channels.push(audioBuffer.getChannelData(c));
  }

  const sampleCount = audioBuffer.length;
  const peakCount = 2400;
  const blockSize = Math.max(1, Math.floor(sampleCount / peakCount));
  const rawPeaks = [];
  let globalAbs = 0;

  for(let i=0; i<peakCount; i++){
    const startSample = i * blockSize;
    let min = 1;
    let max = -1;
    let sum = 0;
    let count = 0;

    for(let j=0; j<blockSize && startSample+j<sampleCount; j++){
      let v = 0;
      for(let c=0; c<channels.length; c++){
        v += channels[c][startSample+j];
      }
      v = v / channels.length;

      if(v < min) min = v;
      if(v > max) max = v;
      sum += v * v;
      count++;
    }

    if(min === 1 && max === -1){
      min = 0;
      max = 0;
    }

    globalAbs = Math.max(globalAbs, Math.abs(min), Math.abs(max));
    rawPeaks.push({min, max, rms: Math.sqrt(sum / Math.max(1,count))});
  }

  const gain = globalAbs > 0 ? Math.min(16, 0.95 / globalAbs) : 1;

  state.wavePeaks = rawPeaks.map(p => ({
    min: Math.max(-1, Math.min(1, p.min * gain)),
    max: Math.max(-1, Math.min(1, p.max * gain)),
    rms: Math.max(0, Math.min(1, p.rms * gain))
  }));

  state.waveDuration = audioBuffer.duration;

  if(ctx.close) ctx.close();

  console.log("REAL waveform loaded", {
    source: sourceLabel,
    duration: audioBuffer.duration,
    channels: audioBuffer.numberOfChannels,
    sampleRate: audioBuffer.sampleRate,
    peaks: state.wavePeaks.length,
    globalAbs,
    gain
  });

  drawWave();
}

async function buildWaveformFromFile(file){
  if(!file) return;

  state.waveLoading = true;
  state.wavePeaks = [];
  drawWaveMessage("Decoding selected MP3...");

  try{
    const arrayBuffer = await file.arrayBuffer();
    await decodeArrayBufferToPeaks(arrayBuffer, file.name || "uploaded file");
  }catch(e){
    console.error("Selected file waveform failed:", e);
    drawWaveMessage("Selected MP3 decode failed");
  }finally{
    state.waveLoading = false;
  }
}

async function buildRealWaveform(url){
  if(!url || state.waveLoading) return;

  if(await loadSharedWaveform()) return;

  state.waveLoading = true;
  state.waveLoadedUrl = url;
  state.wavePeaks = [];

  try{
    drawWaveMessage("Building real waveform...");

    const decodeUrl = `api/audio.php?session=${encodeURIComponent(state.session)}&full=1&wave=${Date.now()}`;

    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(), 20000);

    const res = await fetch(decodeUrl, {
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if(!res.ok) throw new Error("Audio fetch failed: " + res.status);

    const arrayBuffer = await res.arrayBuffer();
    if(arrayBuffer.byteLength < 1000) throw new Error("Audio file too small or empty");

    await decodeArrayBufferToPeaks(arrayBuffer, "server MP3");

  }catch(e){
    console.error("Server waveform failed:", e);
    state.wavePeaks = [];
    drawWaveMessage("Waveform unavailable - re-upload MP3");
  }finally{
    state.waveLoading = false;
  }
}

function drawWaveMessage(msg){
  const w = waveCanvas.clientWidth || 600;
  const h = waveCanvas.clientHeight || 120;

  wctx.clearRect(0,0,w,h);
  wctx.fillStyle = "#081321";
  wctx.fillRect(0,0,w,h);

  wctx.fillStyle = "#9fb0c7";
  wctx.font = "14px system-ui";
  wctx.fillText(msg, 18, h/2);
}

function drawWave(){
  if(!Array.isArray(state.wavePeaks)) state.wavePeaks = [];

  const w = waveCanvas.clientWidth || 600;
  const h = waveCanvas.clientHeight || 120;

  wctx.clearRect(0,0,w,h);
  wctx.fillStyle = "#081321";
  wctx.fillRect(0,0,w,h);

  if(!state.wavePeaks.length){
    if(state.waveLoading){
      drawWaveMessage("Building real waveform...");
    }else{
      drawWaveMessage("Upload MP3 to show waveform");
    }
    return;
  }

  const peaks = state.wavePeaks;
  const mid = h / 2;
  const scale = h * 0.45;
  const step = peaks.length / w;

  const grad = wctx.createLinearGradient(0,0,w,0);
  grad.addColorStop(0,"#8b45ff");
  grad.addColorStop(.50,"#417cff");
  grad.addColorStop(1,"#19d4ff");

  wctx.beginPath();
  for(let x=0; x<w; x++){
    const p = peaks[Math.floor(x * step)] || {rms:0};
    const amp = Math.max(0.025, p.rms) * scale;
    const y = mid - amp;
    if(x === 0) wctx.moveTo(x, y);
    else wctx.lineTo(x, y);
  }
  for(let x=w-1; x>=0; x--){
    const p = peaks[Math.floor(x * step)] || {rms:0};
    const amp = Math.max(0.025, p.rms) * scale;
    const y = mid + amp;
    wctx.lineTo(x, y);
  }
  wctx.closePath();
  wctx.fillStyle = grad;
  wctx.fill();

  wctx.strokeStyle = "rgba(255,255,255,.45)";
  wctx.lineWidth = 1;
  for(let x=0; x<w; x++){
    const p = peaks[Math.floor(x * step)] || {min:0,max:0};
    const y1 = mid + p.min * scale;
    const y2 = mid + p.max * scale;
    wctx.beginPath();
    wctx.moveTo(x, y1);
    wctx.lineTo(x, y2);
    wctx.stroke();
  }

  wctx.strokeStyle = "rgba(255,255,255,.15)";
  wctx.beginPath();
  wctx.moveTo(0, mid);
  wctx.lineTo(w, mid);
  wctx.stroke();

  wctx.fillStyle = "rgba(255,255,255,.85)";
  wctx.font = "11px system-ui";
  wctx.fillText("REAL MP3 WAVEFORM", 10, 18);

  $("wavePlayhead").style.left = ((audio.currentTime/getDuration())*100) + "%";
}

function drawTimeline(){
  const w = timelineCanvas.clientWidth, h = 170, dur = getDuration();
  tctx.clearRect(0,0,w,h);
  tctx.fillStyle = "#081321";
  tctx.fillRect(0,0,w,h);

  const left = 28, right = 28, y = 114;
  const usable = w-left-right;

  tctx.strokeStyle = "#63758b";
  tctx.lineWidth = 1;
  tctx.beginPath(); tctx.moveTo(left,y); tctx.lineTo(w-right,y); tctx.stroke();

  const step = dur <= 90 ? 5 : 10;
  for(let s=0;s<=dur;s+=step){
    const x = left + (s/dur)*usable;
    const major = s % (step*2) === 0;
    tctx.strokeStyle = major ? "#8b9bb0" : "#40556c";
    tctx.beginPath(); tctx.moveTo(x,y); tctx.lineTo(x,y+(major?12:6)); tctx.stroke();
    if(major){
      tctx.fillStyle = "#dce8ff";
      tctx.font = "13px system-ui";
      tctx.fillText(fmt(s).replace(".000",""), x-13, y+30);
    }
  }

  const nowX = left + (audio.currentTime/dur)*usable;
  tctx.strokeStyle = "#ff4d4d";
  tctx.lineWidth = 2;
  tctx.beginPath(); tctx.moveTo(nowX,30); tctx.lineTo(nowX,y+10); tctx.stroke();
  tctx.fillStyle = "#ff4d4d";
  tctx.beginPath(); tctx.arc(nowX,28,5,0,Math.PI*2); tctx.fill();

  state.triggers.forEach(tr=>{
    const x = left + (tr.time/dur)*usable;
    const color = tr.action === "ON" ? "#23c552" : "#ffb020";
    tctx.strokeStyle = color;
    tctx.lineWidth = 3;
    tctx.beginPath(); tctx.moveTo(x,54); tctx.lineTo(x,y); tctx.stroke();
    tctx.fillStyle = "#081321";
    tctx.beginPath(); tctx.arc(x,y,6,0,Math.PI*2); tctx.fill();
    tctx.strokeStyle = color; tctx.stroke();

    tctx.fillStyle = tr.id === state.selectedId ? "#7c3cff" : color;
    roundRect(tctx, x-24, 44, 48, 26, 6, true);
    tctx.fillStyle = "white";
    tctx.font = "bold 12px system-ui";
    tctx.textAlign = "center";
    tctx.fillText(`${tr.relay} ${tr.action}`, x, 61);
    tctx.textAlign = "left";
  });
}

function roundRect(ctx,x,y,w,h,r,fill){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r);
  if(fill) ctx.fill(); else ctx.stroke();
}

function renderEditor(){
  const tr = state.triggers.find(t=>t.id===state.selectedId);
  if(tr){
    $("timeInput").value = Number(tr.time).toFixed(3);
    $("relayInput").value = tr.relay;
    $("labelInput").value = tr.label || "";
    setAction(tr.action);
  }
}

function getDeviceName(){
  let device = $("espUrl") ? $("espUrl").value.trim() : "tdisplay1";
  if(!device || device.includes(".") || device.includes("/") || device.includes(":")){
    device = "tdisplay1";
    if($("espUrl")) $("espUrl").value = device;
  }
  return device;
}

async function sendManualRelay(relay, on){
  relay = Number(relay);
  state.relayStates[relay] = !!on;
  renderRelayGrid();

  try{
    const res = await api("api/manual_relay.php", {
      session: state.session,
      device: getDeviceName(),
      command: "relay",
      relay: relay,
      state: on ? 1 : 0
    });

    $("deviceStatus").textContent = `Manual relay ${relay} ${on ? "ON" : "OFF"}`;
  }catch(e){
    $("deviceStatus").textContent = "Manual relay failed";
    alert("Manual relay failed: " + e.message);
  }
}

async function allRelaysOff(){
  state.relayStates = Array(17).fill(false);
  renderRelayGrid();

  try{
    const res = await api("api/manual_relay.php", {
      session: state.session,
      device: getDeviceName(),
      command: "all_off"
    });

    $("deviceStatus").textContent = "All relays OFF";
  }catch(e){
    $("deviceStatus").textContent = "All off failed";
    alert("All relays off failed: " + e.message);
  }
}

function renderRelayGrid(){
  const grid = $("relayGrid");
  grid.innerHTML = "";
  const scheduled = new Set(state.triggers.map(t=>Number(t.relay)));

  for(let i=1;i<=16;i++){
    const on = state.relayStates[i];
    const div = document.createElement("div");
    div.className = "relay " + (on ? "on " : "") + (!on && scheduled.has(i) ? "scheduled" : "");
    div.dataset.relay = i;
    div.title = "Click to manually toggle relay " + i;
    div.innerHTML = `<div class="num">${i}</div><div class="state">${on ? "ON" : "OFF"}</div><div class="zap">⚡</div>`;
    div.onclick = () => {
      div.classList.add("manual-flash");
      setTimeout(()=>div.classList.remove("manual-flash"), 400);
      sendManualRelay(i, !state.relayStates[i]);
    };
    grid.appendChild(div);
  }
}


function renderRows(){
  const rows = $("triggerRows");
  const sorted = [...state.triggers].sort((a,b)=>a.time-b.time);
  $("triggerCount").textContent = `(${sorted.length})`;
  rows.innerHTML = sorted.map((tr,idx)=>`
    <tr>
      <td>${idx+1}</td>
      <td>${Number(tr.time).toFixed(3)}</td>
      <td><span class="badge">${tr.relay}</span></td>
      <td><span class="badge ${tr.action.toLowerCase()}">${tr.action}</span></td>
      <td>${escapeHtml(tr.label || "")}</td>
      <td class="row-actions">
        <button class="small-btn" onclick="selectTrigger('${tr.id}')">✎</button>
        <button class="small-btn" onclick="deleteTrigger('${tr.id}')">🗑</button>
      </td>
    </tr>`).join("");
}

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

function renderAll(){
  renderEditor();
  renderRelayGrid();
  renderRows();
  resizeCanvases();
}

function selectTrigger(id){ state.selectedId = id; renderAll(); }

function setAction(action){
  state.action = action;
  $("onBtn").classList.toggle("active", action === "ON");
  $("offBtn").classList.toggle("active", action === "OFF");
}

function saveTrigger(){
  const time = Math.max(0, Number($("timeInput").value) || 0);
  const relay = Math.min(16, Math.max(1, Number($("relayInput").value) || 1));
  const label = $("labelInput").value.trim();
  let tr = state.triggers.find(t=>t.id===state.selectedId);
  if(!tr){
    tr = { id: uid(), time, relay, action: state.action, label };
    state.triggers.push(tr);
    state.selectedId = tr.id;
  }else{
    Object.assign(tr,{time,relay,action:state.action,label});
  }
  state.triggers.sort((a,b)=>a.time-b.time);
  saveSession();
  renderAll();
}

function deleteTrigger(id=state.selectedId){
  if(!id) return;
  state.triggers = state.triggers.filter(t=>t.id!==id);
  state.selectedId = null;
  saveSession();
  renderAll();
}

function newTrigger(){
  state.selectedId = null;
  $("timeInput").value = Number(audio.currentTime||0).toFixed(3);
  $("relayInput").value = 1;
  $("labelInput").value = "";
  setAction("ON");
  renderAll();
}

function addAtTime(time){
  const tr = { id: uid(), time, relay: Number($("relayInput").value)||1, action: state.action, label: "" };
  state.triggers.push(tr);
  state.selectedId = tr.id;
  saveSession();
  renderAll();
}

function updatePlaybackUI(){
  $("currentTime").textContent = fmt(audio.currentTime);
  $("selectedTime").textContent = fmt(Number($("timeInput").value)||0);
  $("wavePlayhead").style.left = ((audio.currentTime/getDuration())*100) + "%";
  drawTimeline();
}

function applyRelayStatesAt(timeSeconds){
  state.relayStates = Array(17).fill(false);
  state.triggers
    .filter(t => Number(t.time) <= timeSeconds)
    .sort((a,b) => Number(a.time) - Number(b.time))
    .forEach(t => { state.relayStates[Number(t.relay)] = t.action === "ON"; });
  renderRelayGrid();
}

function clearArmedSimulation(){
  if(state.simulationArmedTimer){
    clearTimeout(state.simulationArmedTimer);
    state.simulationArmedTimer = null;
  }
}

function stopSimulation(){
  clearArmedSimulation();
  if(state.simTimer){
    clearInterval(state.simTimer);
    state.simTimer = null;
  }
  state.isSimulating = false;
  $("simulateBtn").textContent = "▶ Sync Simulate Timeline";
}

function simulateTimeline(forcedStartTime=null){
  if(state.isSimulating){
    if(!state.startingFromSharedCommand) stopSharedSimulation();
    else stopSimulation();
    return;
  }

  if(!state.triggers.length){
    alert("Add at least one trigger first.");
    return;
  }

  state.triggers.sort((a,b)=>Number(a.time)-Number(b.time));

  const firstTriggerTime = forcedStartTime === null
    ? Math.max(0, Number(state.triggers[0].time) - 1)
    : Math.max(0, Number(forcedStartTime));

  const hasAudio = !!audio.getAttribute("src");
  if(hasAudio){
    try { audio.currentTime = firstTriggerTime; } catch(e) {}
  }

  state.relayStates = Array(17).fill(false);
  applyRelayStatesAt(firstTriggerTime);

  state.isSimulating = true;
  $("simulateBtn").textContent = "■ Stop Simulation";

  if(audio.getAttribute("src")) audio.play().catch(() => {});

  state.simStartMs = performance.now();
  state.simStartAudioTime = firstTriggerTime;

  state.simTimer = setInterval(() => {
    let t;
    if(audio.src && !audio.paused && isFinite(audio.currentTime)){
      t = audio.currentTime;
    }else{
      t = state.simStartAudioTime + ((performance.now() - state.simStartMs) / 1000);
      if(audio.getAttribute("src")){
        try { audio.currentTime = Math.min(t, getDuration()); } catch(e) {}
      }
    }

    $("currentTime").textContent = fmt(t);
    applyRelayStatesAt(t);
    drawTimeline();

    const lastTrigger = state.triggers[state.triggers.length - 1];
    if(t > Number(lastTrigger.time) + 2 || t >= getDuration()){
      stopSimulation();
    }
  }, 50);
}

async function uploadAudio(file){
  const fd = new FormData();
  fd.append("session", state.session);
  fd.append("audio", file);

  // Decode the selected local file first. This is the most reliable way to
  // build an accurate waveform because it avoids server/range/cache issues.
  buildWaveformFromFile(file);

  try{
    const res = await api("api/upload_audio.php", fd, true);
    state.audioUrl = res.audioUrl;
    state.version = Date.now();
    setAudioSource(state.audioUrl);
    $("fileName").textContent = file.name;
    await saveSession();

    setTimeout(()=>{
      if(!state.wavePeaks || !state.wavePeaks.length){
        buildRealWaveform(state.audioUrl);
      }
    }, 1000);

  }catch(e){
    alert("Upload failed: " + e.message);
  }
}


async function getControl(){
  return await api(`api/control.php?session=${encodeURIComponent(state.session)}`);
}

async function sendControl(action, extra={}){
  return await api("api/control.php", { session: state.session, action, ...extra });
}

async function startSharedSimulation(){
  if(!state.triggers.length){
    alert("Add at least one trigger first.");
    return;
  }

  state.triggers.sort((a,b)=>Number(a.time)-Number(b.time));
  const firstTriggerTime = Math.max(0, Number(state.triggers[0].time) - 1);

  const control = await sendControl("simulate_start", {
    buffer_seconds: 5,
    start_audio_time: firstTriggerTime
  });

  state.lastControlCommand = "";
  await handleControl(control);
}

async function stopSharedSimulation(){
  await sendControl("stop");
  stopSimulation();
}

async function pollControl(){
  try{
    const c = await getControl();
    await handleControl(c);
  }catch(e){}
}

async function handleControl(c){
  if(!c || !c.command_id) return;
  if(c.server_epoch_ms){
    state.clockOffsetMs = Number(c.server_epoch_ms) - Date.now();
  }
  if(c.command_id === state.lastControlCommand) return;
  state.lastControlCommand = c.command_id;

  if(c.mode === "stop"){
    stopSimulation();
    return;
  }
  if(c.mode === "simulate"){
    armSharedSimulation(c);
  }

  if(c.mode === "live_audio"){
    armLiveAudioStart(c);
  }
}

function armSharedSimulation(c){
  clearArmedSimulation();
  stopSimulation();

  const localStartMs = Number(c.start_epoch_ms) - state.clockOffsetMs;
  const waitMs = Math.max(0, localStartMs - Date.now());
  const startAudioTime = Math.max(0, Number(c.start_audio_time || 0));

  $("simulateBtn").textContent = `⏳ Sync start ${Math.ceil(waitMs/1000)}s`;

  const countdown = setInterval(()=>{
    const left = Math.max(0, localStartMs - Date.now());
    if(left <= 0){
      clearInterval(countdown);
    }else{
      $("simulateBtn").textContent = `⏳ Sync start ${Math.ceil(left/1000)}s`;
    }
  }, 250);

  state.simulationArmedTimer = setTimeout(()=>{
    clearInterval(countdown);
    state.startingFromSharedCommand = true;
    simulateTimeline(startAudioTime);
    state.startingFromSharedCommand = false;
  }, waitMs);
}


function armLiveAudioStart(c){
  clearArmedSimulation();

  const localStartMs = Number(c.start_epoch_ms) - state.clockOffsetMs;
  const waitMs = Math.max(0, localStartMs - Date.now());
  const startAudioTime = Math.max(0, Number(c.start_audio_time || 0));

  $("deviceStatus").textContent = `Audio starts in ${Math.ceil(waitMs/1000)}s`;

  const countdown = setInterval(()=>{
    const left = Math.max(0, localStartMs - Date.now());
    if(left <= 0){
      clearInterval(countdown);
    }else{
      $("deviceStatus").textContent = `Audio starts in ${Math.ceil(left/1000)}s`;
    }
  }, 250);

  state.simulationArmedTimer = setTimeout(()=>{
    clearInterval(countdown);
    try{
      if(audio.getAttribute("src")){
        audio.currentTime = startAudioTime;
        audio.play().catch(()=>{ $("deviceStatus").textContent = "Audio blocked: press Play"; });
        $("deviceStatus").textContent = "Live audio playing";
      }else{
        $("deviceStatus").textContent = "No MP3 loaded";
      }
    }catch(e){
      $("deviceStatus").textContent = "Audio start failed";
    }
  }, waitMs);
}


async function sendLive(){
  try{
    const payload = await api("api/live_payload.php", {
      session: state.session,
      buffer_seconds: 30
    });

    let device = $("espUrl").value.trim();

    // Cloud-poll setup uses a device name, not an IP/URL.
    if(!device || device.includes(".") || device.includes("/") || device.includes(":")){
      device = "tdisplay1";
      $("espUrl").value = device;
    }

    // esp_queue.php forces a fresh 30-second start based on queue time.
    const queued = await api("api/esp_queue.php", {
      device: device,
      buffer_seconds: 30,
      payload: payload
    });

    const correctedPayload = queued.payload || payload;

    // Start all connected browser MP3 players at the exact same corrected start time.
    const control = await sendControl("live_audio_start", {
      start_epoch_ms: correctedPayload.start_epoch_ms,
      start_audio_time: 0
    });

    state.lastControlCommand = "";
    await handleControl(control);

    $("deviceStatus").textContent = "Queued for " + device + " - 30s buffer";
    localStorage.espUrl = device;

    alert("Live timeline queued with a fresh 30-second buffer. MP3 is armed to start at the same time.");

  }catch(e){
    $("deviceStatus").textContent = "Queue failed";
    alert("Live send failed: " + e.message);
  }
}


function init(){
  for(let i=1;i<=16;i++){
    const o = document.createElement("option");
    o.value = i; o.textContent = i;
    $("relayInput").appendChild(o);
  }

  $("loadBtn").onclick = loadSession;
  $("playBtn").onclick = ()=>audio.play();
  $("pauseBtn").onclick = ()=>audio.pause();
  $("stopBtn").onclick = ()=>{ stopSharedSimulation(); audio.pause(); audio.currentTime = 0; applyRelayStatesAt(0); };
  $("triggerNowBtn").onclick = ()=>{ $("timeInput").value = Number(audio.currentTime||0).toFixed(3); saveTrigger(); };
  $("saveTriggerBtn").onclick = saveTrigger;
  $("deleteTriggerBtn").onclick = ()=>deleteTrigger();
  $("newTriggerBtn").onclick = newTrigger;
  $("onBtn").onclick = e=>{ e.preventDefault(); setAction("ON"); };
  $("offBtn").onclick = e=>{ e.preventDefault(); setAction("OFF"); };
  $("sortBtn").onclick = ()=>{ state.triggers.sort((a,b)=>a.time-b.time); saveSession(); renderAll(); };
  $("simulateBtn").onclick = startSharedSimulation;
  $("sendLiveBtn").onclick = sendLive;
  if($("allRelaysOffBtn")) $("allRelaysOffBtn").onclick = allRelaysOff;
  $("saveEspBtn").onclick = ()=>{ 
    let device = $("espUrl").value.trim() || "tdisplay1";
    if(device.includes(".") || device.includes("/") || device.includes(":")) device = "tdisplay1";
    $("espUrl").value = device;
    localStorage.espUrl = device;
    $("deviceStatus").textContent = "Device saved: " + device;
  };
  $("helpBtn").onclick = ()=>$("helpDialog").showModal();

  $("zoomRange").oninput = e=>{ state.zoom = Number(e.target.value); resizeCanvases(); };
  $("zoomIn").onclick = ()=>{ $("zoomRange").value = Math.min(5, Number($("zoomRange").value)+1); $("zoomRange").dispatchEvent(new Event("input")); };
  $("zoomOut").onclick = ()=>{ $("zoomRange").value = Math.max(1, Number($("zoomRange").value)-1); $("zoomRange").dispatchEvent(new Event("input")); };

  timelineCanvas.addEventListener("click", e=>{
    const rect = timelineCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const left = 28, right = 28, w = timelineCanvas.clientWidth;
    const pct = Math.min(1, Math.max(0, (x-left)/(w-left-right)));
    const time = pct * getDuration();
    $("timeInput").value = time.toFixed(3);
    addAtTime(time);
  });

  $("audioFile").onchange = e=>{ if(e.target.files[0]) uploadAudio(e.target.files[0]); };

  ["dragenter","dragover"].forEach(ev=>$("dropzone").addEventListener(ev,e=>{e.preventDefault();$("dropzone").classList.add("hover")}));
  ["dragleave","drop"].forEach(ev=>$("dropzone").addEventListener(ev,e=>{e.preventDefault();$("dropzone").classList.remove("hover")}));
  $("dropzone").addEventListener("drop",e=>{ const f=e.dataTransfer.files[0]; if(f) uploadAudio(f); });

  audio.addEventListener("timeupdate", ()=>{
    updatePlaybackUI();
    applyRelayStatesAt(audio.currentTime);
  });
  audio.addEventListener("ended", stopSimulation);
  audio.addEventListener("pause", ()=>{
    if(state.isSimulating && audio.currentTime >= getDuration() - 0.1) stopSimulation();
  });
  audio.addEventListener("loadedmetadata", renderAll);
  window.addEventListener("resize", resizeCanvases);

  let savedDevice = localStorage.espUrl || "tdisplay1";
  if(savedDevice.includes(".") || savedDevice.includes("/") || savedDevice.includes(":")) savedDevice = "tdisplay1";
  $("espUrl").value = savedDevice;

  loadSession();
}
init();async function buildRealWaveform(url){
  if(!url || state.waveLoading) return;

  if(await loadSharedWaveform()) return;

  state.waveLoading = true;
  state.waveLoadedUrl = url;
  state.wavePeaks = [];

  try{
    drawWaveMessage("Decoding MP3 waveform...");

    // Use the direct streamed session endpoint without cache version.
    // This avoids decode problems from range/cached audio URLs.
    const decodeUrl = `api/audio.php?session=${encodeURIComponent(state.session)}&full=1&wave=${Date.now()}`;

    const res = await fetch(decodeUrl, { cache: "no-store" });
    if(!res.ok) throw new Error("Audio fetch failed: " + res.status);

    const arrayBuffer = await res.arrayBuffer();
    if(arrayBuffer.byteLength < 1000) throw new Error("Audio file too small or empty");

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) throw new Error("Web Audio API not supported");

    const ctx = new AudioCtx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    const channels = [];
    for(let c=0; c<audioBuffer.numberOfChannels; c++){
      channels.push(audioBuffer.getChannelData(c));
    }

    const sampleCount = audioBuffer.length;
    const peakCount = 2400;
    const blockSize = Math.max(1, Math.floor(sampleCount / peakCount));
    const rawPeaks = [];
    let globalAbs = 0;

    for(let i=0; i<peakCount; i++){
      const startSample = i * blockSize;
      let min = 1;
      let max = -1;
      let sum = 0;
      let count = 0;

      for(let j=0; j<blockSize && startSample+j<sampleCount; j++){
        let v = 0;
        for(let c=0; c<channels.length; c++){
          v += channels[c][startSample+j];
        }
        v = v / channels.length;

        if(v < min) min = v;
        if(v > max) max = v;
        sum += v * v;
        count++;
      }

      if(min === 1 && max === -1){
        min = 0;
        max = 0;
      }

      globalAbs = Math.max(globalAbs, Math.abs(min), Math.abs(max));
      rawPeaks.push({min, max, rms: Math.sqrt(sum / Math.max(1,count))});
    }

    // Normalize so quiet MP3s still show a visible waveform.
    const gain = globalAbs > 0 ? Math.min(12, 0.95 / globalAbs) : 1;

    state.wavePeaks = rawPeaks.map(p => ({
      min: Math.max(-1, Math.min(1, p.min * gain)),
      max: Math.max(-1, Math.min(1, p.max * gain)),
      rms: Math.max(0, Math.min(1, p.rms * gain))
    }));

    state.waveDuration = audioBuffer.duration;

    if(ctx.close) ctx.close();

    console.log("REAL MP3 waveform loaded", {
      duration: audioBuffer.duration,
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      peaks: state.wavePeaks.length,
      globalAbs,
      gain
    });

    drawWave();
  }catch(e){
    console.error("Real waveform failed:", e);
    state.wavePeaks = [];
    drawWaveMessage("Waveform decode failed - open Console");
  }finally{
    state.waveLoading = false;
  }
}

function drawWaveMessage(msg){
  const w = waveCanvas.clientWidth || 600;
  const h = waveCanvas.clientHeight || 120;

  wctx.clearRect(0,0,w,h);
  wctx.fillStyle = "#081321";
  wctx.fillRect(0,0,w,h);

  wctx.fillStyle = "#9fb0c7";
  wctx.font = "14px system-ui";
  wctx.fillText(msg, 18, h/2);
}

function drawWave(){
  if(!Array.isArray(state.wavePeaks)) state.wavePeaks = [];
  const w = waveCanvas.clientWidth || 600;
  const h = waveCanvas.clientHeight || 120;

  wctx.clearRect(0,0,w,h);
  wctx.fillStyle = "#081321";
  wctx.fillRect(0,0,w,h);

  if(!state.wavePeaks.length){
    drawWaveMessage("Building real waveform...");
    return;
  }

  const peaks = state.wavePeaks;
  const mid = h / 2;
  const scale = h * 0.45;
  const step = peaks.length / w;

  const grad = wctx.createLinearGradient(0,0,w,0);
  grad.addColorStop(0,"#8b45ff");
  grad.addColorStop(.50,"#417cff");
  grad.addColorStop(1,"#19d4ff");

  // Draw mirrored RMS body first for a strong visible waveform.
  wctx.beginPath();
  for(let x=0; x<w; x++){
    const p = peaks[Math.floor(x * step)] || {rms:0};
    const amp = Math.max(0.025, p.rms) * scale;
    const y = mid - amp;
    if(x === 0) wctx.moveTo(x, y);
    else wctx.lineTo(x, y);
  }
  for(let x=w-1; x>=0; x--){
    const p = peaks[Math.floor(x * step)] || {rms:0};
    const amp = Math.max(0.025, p.rms) * scale;
    const y = mid + amp;
    wctx.lineTo(x, y);
  }
  wctx.closePath();
  wctx.fillStyle = grad;
  wctx.fill();

  // Draw peak lines over it.
  wctx.strokeStyle = "rgba(255,255,255,.45)";
  wctx.lineWidth = 1;
  for(let x=0; x<w; x++){
    const p = peaks[Math.floor(x * step)] || {min:0,max:0};
    const y1 = mid + p.min * scale;
    const y2 = mid + p.max * scale;
    wctx.beginPath();
    wctx.moveTo(x, y1);
    wctx.lineTo(x, y2);
    wctx.stroke();
  }

  wctx.strokeStyle = "rgba(255,255,255,.15)";
  wctx.beginPath();
  wctx.moveTo(0, mid);
  wctx.lineTo(w, mid);
  wctx.stroke();

  wctx.fillStyle = "rgba(255,255,255,.85)";
  wctx.font = "11px system-ui";
  wctx.fillText("REAL MP3 WAVEFORM", 10, 18);

  $("wavePlayhead").style.left = ((audio.currentTime/getDuration())*100) + "%";
}

