// Errata site: theme switch, copy buttons, report filters, and the hero slip (a replay of a real Kane run).
(function () {
  // ── theme: light / dark / system
  const root = document.documentElement;
  function setTheme(t) {
    try { t === "system" ? localStorage.removeItem("theme") : localStorage.setItem("theme", t); } catch (e) {}
    if (t === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", t);
    document.querySelectorAll(".theme button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
  }
  let cur = "system";
  try { cur = localStorage.getItem("theme") || "system"; } catch (e) {}
  document.querySelectorAll(".theme button").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.t === cur));
    b.addEventListener("click", () => setTheme(b.dataset.t));
  });

  // ── copy buttons
  document.querySelectorAll("[data-copy]").forEach((b) =>
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.setAttribute("aria-label", "Copied"); b.classList.add("done"); setTimeout(() => b.classList.remove("done"), 1400); } catch (e) {}
    }),
  );

  // ── segmented tabs (install) and filters (report)
  document.querySelectorAll(".seg[data-target]").forEach((seg) => {
    const target = document.querySelector(seg.dataset.target);
    seg.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        if (seg.dataset.mode === "panes") {
          target.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.v));
        } else {
          let i = 0;
          target.querySelectorAll("[data-status]").forEach((r) => {
            const show = b.dataset.v === "all" || r.dataset.status.split(" ").includes(b.dataset.v);
            r.hidden = !show;
            if (show) r.style.setProperty("--i", i++);
          });
          const empty = target.querySelector(".empty-filter");
          if (empty) empty.hidden = i > 0;
        }
      }),
    );
  });

  // ── the slip: replays a recorded Kane run, step by step
  const slip = document.querySelector("[data-slip]");
  const dataEl = document.getElementById("slip-data");
  if (!slip || !dataEl) return;
  const data = JSON.parse(dataEl.textContent);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rows = [...slip.querySelectorAll(".erratum")];
  const trailEl = slip.querySelector(".trail");
  const tallyEl = slip.querySelector(".tally");
  const live = slip.querySelector("[aria-live]");
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce ? 0 : ms));
  const ICON_OK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const ICON_NO = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  const st = (row, html) => (row.querySelector(".st").innerHTML = html);
  const PEND = '<span class="tick" aria-hidden="true"></span>';
  const SPIN = '<span class="spin" aria-hidden="true"></span>';
  let token = 0;

  function reset() {
    rows.forEach((r) => { r.classList.remove("struck", "open"); st(r, PEND); });
    tallyEl.innerHTML = "";
    trailEl.textContent = "";
  }
  async function say(lines, my) {
    for (const l of (lines || []).slice(0, 5)) {
      if (my !== token) return;
      trailEl.textContent = "kane · " + l;
      await wait(520);
    }
  }
  async function play() {
    const my = ++token;
    reset();
    await wait(900);
    for (let i = 0; i < data.steps.length; i++) {
      if (my !== token) return;
      const s = data.steps[i], row = rows[i];
      if (s.status === "skipped") { st(row, '<span class="pill neutral">skip</span>'); await wait(500); continue; }
      st(row, SPIN);
      await say(s.literal, my);
      if (s.status === "accurate") { st(row, `<span class="tick ok">${ICON_OK}</span>`); live.textContent = `Step ${s.n} accurate`; await wait(450); continue; }
      row.classList.add("struck");
      st(row, s.status === "broken" ? SPIN : '<span class="pill warn">drifted</span>');
      await wait(900);
      await say(s.goal, my);
      if (s.status === "broken") { st(row, '<span class="pill no">broken</span>'); row.classList.add("open"); live.textContent = `Step ${s.n} broken`; await wait(1500); continue; }
      row.classList.add("open");
      await wait(1300);
      await say(s.proof, my);
      st(row, '<span class="pill ok">fixed</span>');
      live.textContent = `Step ${s.n} drifted, rewritten and proven`;
      await wait(1400);
    }
    trailEl.textContent = "";
    const t = data.totals;
    tallyEl.innerHTML = `<span class="pill ok">${t.accurate} accurate</span><span class="pill warn">${t.drifted} drifted · ${t.fixed} fixed</span><span class="pill no">${t.broken} broken</span>`;
    await wait(7000);
    if (!reduce && my === token) play();
  }
  if (reduce) {
    // final state, no motion
    data.steps.forEach((s, i) => {
      const r = rows[i];
      if (s.status === "accurate") st(r, `<span class="tick ok">${ICON_OK}</span>`);
      if (s.status === "skipped") st(r, '<span class="pill neutral">skip</span>');
      if (s.status === "drifted") { r.classList.add("struck", "open"); st(r, '<span class="pill ok">fixed</span>'); }
      if (s.status === "broken") { r.classList.add("struck", "open"); st(r, '<span class="pill no">broken</span>'); }
    });
    const t = data.totals;
    tallyEl.innerHTML = `<span class="pill ok">${t.accurate} accurate</span><span class="pill warn">${t.drifted} drifted · ${t.fixed} fixed</span><span class="pill no">${t.broken} broken</span>`;
  } else {
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.3 });
    io.observe(slip);
  }
  void ICON_NO;
})();
