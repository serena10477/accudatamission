const scenes = [...document.querySelectorAll(".scene")];
const progress = document.getElementById("progress");
const sceneCount = document.getElementById("sceneCount");
const countdownEl = document.getElementById("countdown");
const countdownStatus = document.getElementById("countdownStatus");
let current = 0;
let attendance = "";
let agentName = "";
let countdownStarted = false;
let remainingSeconds = 120;
let countdownTimer = null;
let audioContext = null;
let ambientNodes = [];
let soundEnabled = false;
let lastAlarmSecond = -1;

function showScene(index) {
  current = Math.max(0, Math.min(index, scenes.length - 1));
  scenes.forEach((scene, i) => scene.classList.toggle("active", i === current));
  progress.style.width = `${((current + 1) / scenes.length) * 100}%`;
  sceneCount.textContent = `${String(current + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
  window.scrollTo({top: 0, behavior: "smooth"});
}
function formatTime(total) {
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
function updateCountdown() {
  countdownEl.textContent = formatTime(remainingSeconds);
  if (remainingSeconds <= 20 && remainingSeconds > 0) {
    countdownStatus.textContent = "TEMPORAL FIELD DESTABILIZING";
    document.body.classList.add("critical");
  }
  if (remainingSeconds <= 0) {
    clearInterval(countdownTimer);
    countdownStatus.textContent = "BREACH LEVEL: CRITICAL";
    countdownEl.textContent = "00:00";
    document.body.classList.add("critical");
    playAlarm(true);
    triggerGlitch();
    return;
  }
  if (remainingSeconds <= 10 && remainingSeconds !== lastAlarmSecond) {
    lastAlarmSecond = remainingSeconds;
    playAlarm(false);
    if (remainingSeconds <= 5) triggerGlitch();
  }
  remainingSeconds -= 1;
}
function startCountdown() {
  if (countdownStarted) return;
  countdownStarted = true;
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}
function triggerGlitch() {
  document.body.classList.remove("glitch-hit");
  void document.body.offsetWidth;
  document.body.classList.add("glitch-hit");
  window.setTimeout(() => document.body.classList.remove("glitch-hit"), 360);
}

function createSubmissionToken() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `tca-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Apps Script POST uses no-cors, so its response is opaque.
// A JSONP status lookup retrieves the server-assigned agent number.
function lookupRegistration(token, timeoutMs = 18000) {
  return new Promise((resolve, reject) => {
    const endpoint = window.APP_CONFIG && window.APP_CONFIG.GOOGLE_SCRIPT_URL;
    if (!endpoint) return resolve(null);
    const callbackName = `tcaCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const started = Date.now();
    let settled = false;
    let retryTimer = null;
    let timeoutTimer = null;
    let activeScript = null;

    const cleanup = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (activeScript) activeScript.remove();
      delete window[callbackName];
    };
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };
    const request = () => {
      if (settled) return;
      if (activeScript) activeScript.remove();
      activeScript = document.createElement("script");
      activeScript.src = `${endpoint}?action=lookup&token=${encodeURIComponent(token)}&callback=${callbackName}&_=${Date.now()}`;
      activeScript.onerror = () => {
        if (!settled) retryTimer = setTimeout(request, 1000);
      };
      document.body.appendChild(activeScript);
    };
    window[callbackName] = data => {
      if (data && data.ok && data.agentNumber) finish(resolve, data);
      else retryTimer = setTimeout(request, 900);
    };
    timeoutTimer = setTimeout(() => finish(reject, new Error("取得特工編號逾時")), timeoutMs);
    request();
  });
}

// All sound is synthesized locally; no external audio file or autoplay is used.
function ensureAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return true;
}
function startAmbient() {
  if (!ensureAudio() || ambientNodes.length) return;
  const master = audioContext.createGain();
  master.gain.value = 0.035;
  master.connect(audioContext.destination);
  [55, 82.41, 110.0].forEach((freq, index) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = index === 2 ? "sine" : "triangle";
    osc.frequency.value = freq;
    gain.gain.value = index === 2 ? 0.12 : 0.24;
    osc.connect(gain); gain.connect(master); osc.start();
    ambientNodes.push(osc, gain);
  });
  ambientNodes.push(master);
}
function stopAmbient() {
  ambientNodes.forEach(node => {
    try { if (node instanceof OscillatorNode) node.stop(); } catch (_) {}
    try { node.disconnect(); } catch (_) {}
  });
  ambientNodes = [];
}
function playAlarm(finalAlarm) {
  if (!soundEnabled || !ensureAudio()) return;
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(finalAlarm ? 880 : 660, now);
  osc.frequency.exponentialRampToValueAtTime(finalAlarm ? 440 : 520, now + 0.22);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(finalAlarm ? 0.11 : 0.055, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (finalAlarm ? 0.8 : 0.28));
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.start(now); osc.stop(now + (finalAlarm ? 0.85 : 0.3));
}
const soundToggle = document.getElementById("soundToggle");
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.textContent = soundEnabled ? "♫ 音效 ON" : "♫ 音效 OFF";
  if (soundEnabled) { startAmbient(); playAlarm(false); }
  else stopAmbient();
});

document.querySelectorAll(".next").forEach(button => button.addEventListener("click", () => {
  if (current === 0) startCountdown();
  if (soundEnabled && current < 3) playAlarm(false);
  if (current === 1 || current === 2) triggerGlitch();
  showScene(current + 1);
}));

document.querySelectorAll(".choice").forEach(button => {
  button.addEventListener("click", () => {
    attendance = button.dataset.choice;
    document.getElementById("formIntro").textContent =
      attendance === "願意參加"
        ? "任務接受確認。請輸入姓名，完成特工身分識別。"
        : "已收到你的回覆。仍請留下姓名，以便時空管理局完成出勤紀錄。";
    showScene(5);
    document.getElementById("agentName").focus({preventScroll:true});
  });
});

document.getElementById("agentForm").addEventListener("submit", async event => {
  event.preventDefault();
  const input = document.getElementById("agentName");
  const error = document.getElementById("formError");
  agentName = input.value.trim();
  if (!agentName) { error.textContent = "請輸入姓名後再確認入檔。"; return; }
  error.textContent = "";
  const submit = event.currentTarget.querySelector("button[type=submit]");
  submit.disabled = true;
  submit.innerHTML = "資料傳輸中…";

  const token = createSubmissionToken();
  const record = {
    timestamp: new Date().toISOString(),
    activity: "時空特勤｜ACCUDATA",
    attendance,
    name: agentName,
    submissionToken: token
  };
  let assignedNumber = "PENDING";

  try {
    if (window.APP_CONFIG && window.APP_CONFIG.GOOGLE_SCRIPT_URL) {
      await fetch(window.APP_CONFIG.GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: {"Content-Type": "text/plain;charset=utf-8"},
        body: JSON.stringify(record)
      });
      const result = await lookupRegistration(token);
      if (!result || !result.agentNumber) throw new Error("尚未取得特工編號");
      assignedNumber = result.agentNumber;
    } else {
      console.info("Google Apps Script URL not configured. Demo record:", record);
      assignedNumber = "0001";
    }

    document.getElementById("finalName").textContent = `特工姓名｜${agentName}`;
    document.getElementById("cardName").textContent = agentName;
    document.querySelectorAll(".agent-number strong, .card-data div:first-child strong").forEach(el => {
      el.textContent = assignedNumber;
    });
    document.getElementById("cardStatus").textContent =
      attendance === "願意參加" ? "MISSION ACCEPTED" : "UNAVAILABLE";
    document.getElementById("finalCopy").innerHTML =
      attendance === "願意參加"
        ? "歡迎加入時空特勤小隊。<br>時空的未來，就交給各位了。"
        : "已收到你的出勤回覆。<br>期待未來有機會與你並肩作戰。";
    if (soundEnabled) playAlarm(false);
    showScene(6);
  } catch (err) {
    error.textContent = "資料傳輸或特工編號取得失敗，請確認網路及 Google Sheet 設定後重試。";
    console.error(err);
  } finally {
    submit.disabled = false;
    submit.innerHTML = '確認入檔 <span>→</span>';
  }
});

document.getElementById("printCard").addEventListener("click", () => window.print());
document.getElementById("restart").addEventListener("click", () => showScene(0));

// Starfield: lightweight canvas animation, adapts to screen size.
(() => {
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  let w, h, stars = [], dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({length: Math.min(230, Math.floor(w*h/5500))}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      r: Math.random()*1.35+.2, a: Math.random()*.7+.15,
      speed: Math.random()*.22+.035, phase: Math.random()*6.28
    }));
  }
  let tick = 0;
  function draw() {
    ctx.clearRect(0,0,w,h); tick += .01;
    for (const s of stars) {
      s.y += s.speed; if (s.y > h) {s.y = -2; s.x = Math.random()*w;}
      const alpha = s.a * (.65 + .35*Math.sin(tick*1.8+s.phase));
      ctx.fillStyle = `rgba(190,225,255,${alpha})`;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener("resize", resize, {passive:true});
  resize(); draw();
})();
