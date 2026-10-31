(() => {
  'use strict';

  const cfg = Object.assign({ name: 'Hend', music: '', letter: '' }, window.GIFT || {});
  const $ = (s) => document.querySelector(s);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ENTRY = 450; // wait for the screen fade before starting its animation
  const HEART_PATH = 'M100 172 C 18 112, -2 62, 34 30 C 60 8, 92 20, 100 50 C 108 20, 140 8, 166 30 C 202 62, 182 112, 100 172 Z';

  document.title = 'For ' + cfg.name;
  document.querySelectorAll('[data-name]').forEach((el) => { el.textContent = cfg.name; });

  /* ---------- Screen navigation ---------- */
  const screens = {
    lock: $('#lock'),
    birthday: $('#birthday'),
    hearts: $('#hearts'),
    letter: $('#letter'),
  };
  const enter = {};
  const leave = {};
  let current = 'lock';
  let timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function go(name) {
    if (name === current) return;
    const prev = current;
    leave[prev] && leave[prev]();
    clearTimers();
    screens[prev].classList.remove('active');
    screens[prev].setAttribute('inert', '');
    current = name;
    screens[name].classList.add('active');
    screens[name].removeAttribute('inert');
    enter[name] && enter[name]();
  }

  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* ignore */ } };

  /* ---------- Music ---------- */
  const musicBtn = $('#music');
  let audio = null;
  let musicStarted = false;

  if (cfg.music) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.8;
    audio.addEventListener('error', () => { audio = null; musicBtn.hidden = true; });
    audio.src = cfg.music;
  }

  function setMusicUI(on) {
    musicBtn.classList.toggle('off', !on);
    musicBtn.setAttribute('aria-pressed', String(on));
    musicBtn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
  }

  function startMusic() {
    if (!audio || musicStarted) return;
    musicStarted = true;
    audio.play().then(() => {
      if (audio) { musicBtn.hidden = false; setMusicUI(true); }
    }).catch(() => { musicStarted = false; });
  }

  // Browsers only allow sound after a real tap/key release, so listen on those.
  ['pointerup', 'keydown'].forEach((ev) => document.addEventListener(ev, startMusic));

  musicBtn.addEventListener('click', () => {
    if (!audio) return;
    if (audio.paused) { audio.play().catch(() => {}); setMusicUI(true); }
    else { audio.pause(); setMusicUI(false); }
  });

  document.addEventListener('visibilitychange', () => {
    if (!audio || !musicStarted) return;
    if (document.hidden) audio.pause();
    else if (!musicBtn.classList.contains('off')) audio.play().catch(() => {});
  });

  /* ---------- 1. Lock screen ---------- */
  const clockEl = $('#clock');
  const dateEl = $('#date');
  function tick() {
    const d = new Date();
    clockEl.textContent = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    dateEl.textContent = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick();
  setInterval(tick, 5000);

  const runner = $('#runner');
  const unlock = $('#unlock');
  const unlockLabel = unlock.querySelector('.label');
  const LINES = ['Tap to unlock', 'Missed me', 'Not That Easy', 'Oh You Got Me!'];
  let tries = 0;
  let ox = 0;
  let oy = 0;
  let base = { x: 0, y: 0, w: 220, h: 52 };
  let lastW = innerWidth;
  let unlocking = false;

  function measureBase() {
    const prevT = runner.style.transform;
    const prevTr = runner.style.transition;
    runner.style.transition = 'none';
    runner.style.transform = 'none';
    const r = runner.getBoundingClientRect();
    base = { x: r.left, y: r.top, w: r.width, h: r.height };
    runner.style.transform = prevT;
    void runner.offsetWidth;
    runner.style.transition = prevTr;
  }

  function dodge() {
    const m = 18;
    const vw = innerWidth;
    const vh = innerHeight;
    const minY = vh * 0.52;
    const maxY = vh - base.h - m - 8;
    const curX = base.x + ox;
    const curY = base.y + oy;
    let nx;
    let ny;
    let n = 0;
    do {
      nx = m + Math.random() * Math.max(1, vw - base.w - 2 * m);
      ny = minY + Math.random() * Math.max(1, maxY - minY);
      n++;
    } while (n < 30 && Math.hypot(nx - curX, ny - curY) < 140);
    ox = nx - base.x;
    oy = ny - base.y;
    runner.style.transform = 'translate(' + ox + 'px,' + oy + 'px)';
    unlock.animate(
      [{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }],
      { duration: 480, easing: 'ease-out' }
    );
  }

  function press() {
    if (unlocking) return;
    if (tries < 2) {
      tries++;
      unlockLabel.textContent = LINES[tries];
      dodge();
      vibrate(25);
    } else {
      unlocking = true;
      unlockLabel.textContent = LINES[3];
      vibrate([30, 40, 30]);
      setTimeout(() => go('birthday'), 450);
    }
  }

  // pointerdown so the button runs the moment a finger lands; click is kept for keyboard users.
  let lastPointer = -1e9;
  unlock.addEventListener('pointerdown', (e) => { e.preventDefault(); lastPointer = performance.now(); press(); });
  unlock.addEventListener('click', () => { if (performance.now() - lastPointer > 800) press(); });

  function resetLock() {
    tries = 0;
    unlocking = false;
    ox = 0;
    oy = 0;
    runner.style.transform = '';
    unlockLabel.textContent = LINES[0];
    measureBase();
  }

  function onResize() {
    if (innerWidth !== lastW) { lastW = innerWidth; ox = 0; oy = 0; runner.style.transform = ''; }
    measureBase();
    if (current === 'hearts') rebuildLove();
  }
  let resizeT = 0;
  addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(onResize, 150); });
  addEventListener('orientationchange', () => { clearTimeout(resizeT); resizeT = setTimeout(onResize, 300); });
  addEventListener('load', measureBase);
  measureBase();

  /* ---------- 2. Heart + Happy Birthday ---------- */
  function splitInto(el, text, start) {
    let i = start;
    text.split(' ').forEach((word) => {
      const w = document.createElement('span');
      w.className = 'word';
      Array.from(word).forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--i', i++);
        s.textContent = ch;
        w.append(s);
      });
      el.append(w, ' ');
    });
    return i;
  }
  const titleEl = $('#title');
  titleEl.setAttribute('aria-label', 'Happy Birthday, ' + cfg.name);
  const nextIdx = splitInto($('#line1'), 'Happy Birthday', 0);
  splitInto($('#line2'), cfg.name, nextIdx);

  function burst() {
    const host = $('#burst');
    const colors = ['#FF5A6E', '#FFC2CC', '#F2C879'];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const size = 10 + Math.random() * 12;
      const el = document.createElement('span');
      el.className = 'mini';
      el.style.color = colors[i % colors.length];
      el.innerHTML = '<svg viewBox="8 8 184 172" width="' + size + '" height="' + (size * 0.935) + '"><path d="' + HEART_PATH + '"/></svg>';
      host.append(el);
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 110 + Math.random() * 120;
      const dx = Math.cos(a) * dist;
      const dy = Math.sin(a) * dist;
      const anim = el.animate(
        [
          { transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 },
          { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)', opacity: 0 },
        ],
        { duration: 1300 + Math.random() * 600, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
      );
      anim.onfinish = () => el.remove();
    }
  }

  enter.birthday = () => {
    const s = screens.birthday;
    const next = $('#toHearts');
    next.classList.remove('ready');
    s.classList.remove('play');
    $('#burst').textContent = '';
    if (reduceMotion) { s.classList.add('play'); next.classList.add('ready'); return; }
    later(() => { void s.offsetWidth; s.classList.add('play'); }, ENTRY);
    later(burst, ENTRY + 3000);
    later(() => next.classList.add('ready'), ENTRY + 5000);
  };
  $('#toHearts').addEventListener('click', () => go('hearts'));

  /* ---------- 3. Heart made of "I love you" ---------- */
  const LOVE = [
    'I love you', 'بحبك', 'Te amo', 'Je t\u2019aime', 'Ti amo', 'Ich liebe dich', '愛してる', 'Eu te amo',
    '사랑해', 'Я тебя люблю', 'Seni seviyorum', 'Σ\u2019αγαπώ', 'Ik hou van jou', '我爱你', 'Jag älskar dig',
    'Kocham cię', 'دوستت دارم', 'بعشقك', 'Nakupenda', 'ฉันรักเธอ', 'Anh yêu em', 'Aku cinta kamu',
    'Mahal kita', 'Rakastan sinua', 'Jeg elsker dig', 'Я тебе кохаю', 'Te iubesc', 'Miluji tě', 'Szeretlek',
    'আমি তোমাকে ভালোবাসি', 'मैं तुमसे प्यार करता हूँ', 'Të dua', 'T\u2019estimo', 'Volim te', 'Ég elska þig',
    'Mi amas vin', 'Ngiyakuthanda', 'Te quiero', 'Tá grá agam duit', 'مجھے تم سے محبت ہے',
  ];
  const CREAM_WORDS = new Set(['I love you', 'بحبك']);

  const canvas = $('#loveCanvas');
  const ctx = canvas.getContext('2d');
  const TOTAL = 4800; // ms for the sweep
  let words = [];
  let W = 0;
  let H = 0;
  let raf = 0;
  let t0 = 0;
  let loveToken = 0;

  const inside = (x, y) => { const a = x * x + y * y - 1; return a * a * a - x * x * y * y * y <= 0; };
  const BOUNDS = (() => {
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (let y = -1.6; y <= 1.6; y += 0.01) {
      for (let x = -1.6; x <= 1.6; x += 0.01) {
        if (inside(x, y)) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    return { x0, x1, y0, y1 };
  })();

  function intersect(A, B) {
    const out = [];
    A.forEach(([a0, a1]) => B.forEach(([b0, b1]) => {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      if (hi - lo > 1) out.push([lo, hi]);
    }));
    return out;
  }

  function buildLove() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const ratio = (BOUNDS.y1 - BOUNDS.y0) / (BOUNDS.x1 - BOUNDS.x0);
    const size = Math.max(260, Math.min(innerWidth - 20, 480, (innerHeight - 250) / ratio));
    W = Math.round(size);
    H = Math.round(size * ratio);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const fs = Math.max(11, Math.round(W * 0.039));
    const rowH = fs * 1.4;
    const scale = W / (BOUNDS.x1 - BOUNDS.x0);
    const toX = (px) => BOUNDS.x0 + px / scale;
    const toY = (py) => BOUNDS.y1 - py / scale;
    const fontFor = (heavy) => (heavy ? '600 ' : '500 ') + fs + 'px "DM Sans", system-ui, "Noto Sans", sans-serif';

    ctx.font = fontFor(false);
    const widthCache = {};
    const width = (t) => (widthCache[t] || (widthCache[t] = ctx.measureText(t).width));
    const minW = Math.min.apply(null, LOVE.map(width));

    const runsAt = (py) => {
      const runs = [];
      let start = -1;
      for (let px = 0; px <= W; px++) {
        const ins = inside(toX(px), toY(py));
        if (ins && start < 0) start = px;
        if (!ins && start >= 0) { runs.push([start, px]); start = -1; }
      }
      if (start >= 0) runs.push([start, W]);
      return runs;
    };

    words = [];
    let idx = 0;
    let c = 0;
    for (let py = rowH * 0.7; py < H - rowH * 0.3; py += rowH) {
      let runs = runsAt(py);
      runs = intersect(runs, runsAt(py - fs * 0.5));
      runs = intersect(runs, runsAt(py + fs * 0.5));
      runs.forEach(([a0, b0]) => {
        const a = a0 + fs * 0.2;
        const avail = b0 - fs * 0.2 - a;
        if (avail < minW) return;
        const row = [];
        let sumW = 0;
        const gap0 = fs * 0.7;
        for (let guard = 0; guard < 30; guard++) {
          let picked = -1;
          for (let k = 0; k < 14; k++) {
            const j = (idx + k) % LOVE.length;
            const need = sumW + gap0 * row.length + width(LOVE[j]);
            if (need <= avail) { picked = j; break; }
          }
          if (picked < 0) break;
          row.push(LOVE[picked]);
          sumW += width(LOVE[picked]);
          idx = picked + 1;
        }
        const n = row.length;
        if (!n) return;
        const gap = n > 1 ? Math.min((avail - sumW) / (n - 1), fs * 2.8) : 0;
        let x = a + (avail - (sumW + gap * (n - 1))) / 2;
        row.forEach((t) => {
          const w = width(t);
          const cream = CREAM_WORDS.has(t);
          words.push({
            t,
            x: x + w / 2,
            y: py,
            color: cream ? '#FFF4EA' : (c % 5 === 0 ? '#FF5A6E' : '#FFC2CC'),
            font: fontFor(cream),
            delay: 0,
          });
          x += w + gap;
          c++;
        });
      });
    }

    const cx = W / 2;
    const cy = H / 2;
    words.forEach((w) => {
      const theta = (Math.atan2(w.x - cx, w.y - cy) + Math.PI * 2) % (Math.PI * 2);
      w.delay = (theta / (Math.PI * 2)) * TOTAL + Math.random() * 120;
    });
  }

  function renderLove(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let done = true;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const p = Math.min(1, (t - w.delay) / 500);
      if (p < 1) done = false;
      if (p <= 0) continue;
      const e = 1 - Math.pow(1 - p, 3);
      ctx.globalAlpha = e;
      ctx.save();
      ctx.translate(w.x, w.y + (1 - e) * 6);
      ctx.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e);
      ctx.fillStyle = w.color;
      ctx.font = w.font;
      ctx.fillText(w.t, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return done;
  }

  function finishLove() {
    canvas.classList.add('beat');
    $('#toLetter').classList.add('ready');
  }

  function frameLove(now) {
    const done = renderLove(now - t0);
    if (done) { finishLove(); return; }
    raf = requestAnimationFrame(frameLove);
  }

  function rebuildLove() {
    cancelAnimationFrame(raf);
    buildLove();
    renderLove(Infinity);
    finishLove();
  }

  enter.hearts = async () => {
    const token = ++loveToken;
    const btn = $('#toLetter');
    btn.classList.remove('ready');
    canvas.classList.remove('beat');
    try {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
    } catch (e) { /* ignore */ }
    if (current !== 'hearts' || token !== loveToken) return;
    buildLove();
    ctx.clearRect(0, 0, W, H);
    if (reduceMotion) { renderLove(Infinity); finishLove(); return; }
    later(() => { t0 = performance.now(); raf = requestAnimationFrame(frameLove); }, ENTRY);
  };
  leave.hearts = () => { cancelAnimationFrame(raf); loveToken++; };
  $('#toLetter').addEventListener('click', () => go('letter'));

  /* ---------- 4. Letter (typewriter) ---------- */
  const letterText = $('#letterText');
  const letterScroll = $('#letterScroll');
  const replay = $('#replay');
  let chars = [];
  let pos = 0;
  let typing = false;
  let typeTimer = 0;
  let typeNode = null;
  let caret = null;

  function doneTyping() {
    typing = false;
    clearTimeout(typeTimer);
    typeNode.data = chars.join('');
    caret.className = 'caret idle';
    letterScroll.scrollTop = letterScroll.scrollHeight;
    later(() => replay.classList.add('ready'), 1200);
    later(() => { caret.className = 'caret gone'; }, 5000);
  }

  function step() {
    if (!typing) return;
    if (pos >= chars.length) { doneTyping(); return; }
    const ch = chars[pos++];
    typeNode.data += ch;
    if (pos % 6 === 0) letterScroll.scrollTop = letterScroll.scrollHeight;
    let d = 38 + Math.random() * 28;
    if (',;:'.indexOf(ch) >= 0) d += 180;
    else if ('.!?'.indexOf(ch) >= 0) d += 420;
    else if (ch === '\n') d += 260;
    typeTimer = setTimeout(step, d);
  }

  enter.letter = () => {
    replay.classList.remove('ready');
    letterText.textContent = '';
    const raw = (cfg.letter || '').replace(/\r\n/g, '\n');
    chars = Array.from(raw.length ? raw : 'Write your message in config.js.');
    typeNode = document.createTextNode('');
    caret = document.createElement('span');
    caret.className = 'caret typing';
    letterText.append(typeNode, caret);
    letterScroll.scrollTop = 0;
    pos = 0;
    typing = true;
    if (reduceMotion) { doneTyping(); return; }
    typeTimer = setTimeout(step, ENTRY + 500);
  };
  leave.letter = () => { typing = false; clearTimeout(typeTimer); };

  // Tap anywhere on the letter to skip the typing.
  screens.letter.addEventListener('pointerdown', (e) => {
    if (typing && !e.target.closest('button')) doneTyping();
  });

  replay.addEventListener('click', () => {
    resetLock();
    go('lock');
  });
})();
