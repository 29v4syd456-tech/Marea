/* Marea · bienestar. Todo se guarda solo en este navegador (localStorage). */
const CONTACT_EMAIL = ""; // ← Añade aquí tu correo real, por ejemplo "hola@tudominio.com"

const $ = (s) => document.querySelector(s);
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const pad = (n) => String(n).padStart(2, "0");
const todayKey = () => new Date().toLocaleDateString("sv");
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toLocaleDateString("sv"); };

/* ---------- Hidratación ---------- */
const getWater = () => {
  const w = load("marea_agua", { goal: 2000, day: todayKey(), ml: 0, remind: 0 });
  if (w.day !== todayKey()) { w.day = todayKey(); w.ml = 0; }
  return w;
};
function initWater() {
  if (!$("#water-bar")) return;
  const w = getWater(); let last = 0, timer;
  const draw = () => {
    const pct = Math.min(100, Math.round((w.ml / w.goal) * 100));
    $("#water-ml").textContent = w.ml; $("#water-pct").textContent = pct + " %";
    $("#water-bar").style.width = pct + "%"; $("#water-goal").value = w.goal;
    $("#water-remind").value = w.remind; save("marea_agua", w);
  };
  document.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
    last = +b.dataset.add; w.ml += last; draw();
  }));
  $("#water-custom").addEventListener("submit", (e) => {
    e.preventDefault(); const v = parseInt($("#water-amount").value, 10);
    if (v > 0 && v <= 3000) { last = v; w.ml += v; $("#water-amount").value = ""; draw(); }
  });
  $("#water-undo").addEventListener("click", () => { w.ml = Math.max(0, w.ml - last); last = 0; draw(); });
  $("#water-reset").addEventListener("click", () => { w.ml = 0; draw(); });
  $("#water-goal").addEventListener("change", (e) => {
    const v = parseInt(e.target.value, 10);
    w.goal = v >= 250 && v <= 6000 ? v : w.goal; draw();
  });
  const setTimer = () => {
    clearInterval(timer);
    if (w.remind > 0) timer = setInterval(() => { $("#water-toast").hidden = false; }, w.remind * 60000);
  };
  $("#water-remind").addEventListener("change", (e) => { w.remind = +e.target.value; draw(); setTimer(); });
  $("#toast-close").addEventListener("click", () => { $("#water-toast").hidden = true; });
  draw(); setTimer();
}

/* ---------- Hábitos ---------- */
const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const getHabits = () => {
  const h = load("marea_habitos", null) || {
    week: weekKey(),
    list: ["Beber agua", "Moverme un rato", "Dormir a una hora regular"].map((n, i) => ({ id: i + 1, name: n, days: Array(7).fill(false) })),
  };
  if (h.week !== weekKey()) { h.week = weekKey(); h.list.forEach((x) => (x.days = Array(7).fill(false))); }
  return h;
};
function initHabits() {
  const body = $("#habit-body"); if (!body) return;
  const h = getHabits();
  const draw = () => {
    body.innerHTML = ""; let done = 0;
    h.list.forEach((x) => {
      const n = x.days.filter(Boolean).length; done += n;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${x.name.replace(/[<>&]/g, "")}</td>` +
        x.days.map((v, i) => `<td><input type="checkbox" data-h="${x.id}" data-d="${i}" ${v ? "checked" : ""} aria-label="${x.name.replace(/"/g, "")}, ${DAY_NAMES[i]}"></td>`).join("") +
        `<td>${n}/7</td><td><button class="x" data-del="${x.id}" aria-label="Eliminar hábito ${x.name.replace(/"/g, "")}">×</button></td>`;
      body.appendChild(tr);
    });
    const total = h.list.length * 7, pct = total ? Math.round((done / total) * 100) : 0;
    $("#habit-pct").textContent = pct + " %"; $("#habit-bar").style.width = pct + "%";
    $("#habit-empty").hidden = h.list.length > 0; save("marea_habitos", h);
  };
  body.addEventListener("change", (e) => {
    const t = e.target; if (t.type !== "checkbox") return;
    const x = h.list.find((y) => y.id === +t.dataset.h); x.days[+t.dataset.d] = t.checked; draw();
  });
  body.addEventListener("click", (e) => {
    const id = e.target.dataset.del; if (!id) return;
    h.list = h.list.filter((y) => y.id !== +id); draw();
  });
  $("#habit-form").addEventListener("submit", (e) => {
    e.preventDefault(); const name = $("#habit-name").value.trim().slice(0, 40);
    if (!name || h.list.length >= 10) return;
    h.list.push({ id: Date.now(), name, days: Array(7).fill(false) }); $("#habit-name").value = ""; draw();
  });
  $("#habit-reset").addEventListener("click", () => {
    if (confirm("¿Reiniciar todas las casillas de esta semana?")) { h.list.forEach((x) => (x.days = Array(7).fill(false))); draw(); }
  });
  draw();
}

/* ---------- Calculadora de sueño ---------- */
function initSleep() {
  const f = $("#sleep-form"); if (!f) return;
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const [hh, mm] = $("#wake").value.split(":").map(Number); if (isNaN(hh)) return;
    const out = $("#sleep-out"); out.innerHTML = "";
    [6, 5, 4].forEach((c) => {
      const t = (((hh * 60 + mm - c * 90 - 15) % 1440) + 1440) % 1440, mins = c * 90;
      const li = document.createElement("li");
      li.innerHTML = `<strong>${pad(Math.floor(t / 60))}:${pad(t % 60)}</strong>${c} ciclos · ${Math.floor(mins / 60)} h${mins % 60 ? " 30 min" : ""} de sueño`;
      out.appendChild(li);
    });
    $("#sleep-result").hidden = false;
  });
}

/* ---------- Inicio: resumen de hoy ---------- */
function initHome() {
  if (!$("#home-water")) return;
  const w = getWater(), h = getHabits(), tot = h.list.length * 7;
  const pct = Math.min(100, Math.round((w.ml / w.goal) * 100));
  $("#home-water").textContent = pct + " %"; $("#home-water-bar").style.width = pct + "%";
  $("#home-water-txt").textContent = `${w.ml} de ${w.goal} ml hoy`;
  const hp = tot ? Math.round((h.list.reduce((a, x) => a + x.days.filter(Boolean).length, 0) / tot) * 100) : 0;
  $("#home-habit").textContent = hp + " %"; $("#home-habit-bar").style.width = hp + "%";
}

/* ---------- Contacto ---------- */
function initContact() {
  const f = $("#contact-form"); if (!f) return;
  const status = $("#contact-status");
  $("#email-shown").textContent = CONTACT_EMAIL || "[añade tu correo real en app.js → CONTACT_EMAIL]";
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!CONTACT_EMAIL) { status.textContent = "Aún no hay un correo configurado. Añádelo en app.js (CONTACT_EMAIL)."; return; }
    const s = encodeURIComponent("Mensaje desde Marea: " + $("#c-name").value);
    const b = encodeURIComponent($("#c-msg").value + "\n\n" + $("#c-name").value);
    location.href = `mailto:${CONTACT_EMAIL}?subject=${s}&body=${b}`;
    status.textContent = "Se abrirá tu aplicación de correo para enviar el mensaje.";
  });
}

initHome(); initWater(); initHabits(); initSleep(); initContact();
