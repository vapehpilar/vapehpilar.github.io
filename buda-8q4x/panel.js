/* =========================================================
   VHP · Panel privado de analíticas
   Los datos vienen de la API de GoatCounter y solo se pueden leer
   con la clave del dueño, que se guarda únicamente en su navegador.
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.VHP_CONFIG || {};
  var PRODUCTS = window.VHP_PRODUCTOS || [];
  var BRAND_COLOR = window.VHP_MARCAS || {};
  var CODE = CFG.goatcounter;
  var API = "https://" + CODE + ".goatcounter.com/api/v0";
  var KEY_STORE = "vhp-panel-key";
  var SINCE = "2026-10-01T00:00:00Z"; // desde cuándo cuenta el "total histórico"
  var AUTO_MS = 5 * 60 * 1000;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var nf = new Intl.NumberFormat("es-AR");
  var fmt = function (n) { return nf.format(Math.round(n || 0)); };
  var money = function (n) { return "$" + nf.format(Math.round(n || 0)); };
  var pct = function (n) { return (n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0).replace(".", ",") + "%"; };
  var norm = function (s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); };
  var slug = function (s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v, keep) { try { (keep ? localStorage : sessionStorage).setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  };

  // Productos del catálogo indexados por su slug (el mismo que usa la tienda en los eventos)
  var PROD = {};
  PRODUCTS.forEach(function (p) {
    PROD[slug(p.marca + " " + p.nombre)] = { name: p.marca + " " + p.nombre, color: p.color || BRAND_COLOR[p.marca] || "#a899d6" };
  });

  var key = store.get(KEY_STORE);
  var days = 30;
  var last = null; // últimos datos cargados (para exportar y redibujar)

  // ---------- API ----------
  var queue = Promise.resolve();
  function api(path, params) {
    // La API permite pocas consultas por segundo: las hacemos de a una.
    var run = function () {
      var qs = params ? "?" + Object.keys(params).filter(function (k) { return params[k] !== undefined && params[k] !== ""; }).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      }).join("&") : "";
      return fetch(API + path + qs, {
        headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" }
      }).then(function (r) {
        if (r.status === 401 || r.status === 403) { var e = new Error("auth"); e.auth = true; throw e; }
        if (r.status === 429) return wait(1200).then(run);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    };
    var p = queue.then(run, run);
    queue = p.then(function () { return wait(260); }, function () { return wait(260); });
    return p;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Trae todas las páginas del listado de páginas/eventos.
  function allHits(r) {
    var out = [], seen = [];
    function page(n) {
      return api("/stats/hits", { start: r.start, end: r.end, limit: 100, exclude_paths: seen.join(",") }).then(function (d) {
        (d.hits || []).forEach(function (h) { out.push(h); seen.push(h.path_id); });
        if (d.more && n < 5) return page(n + 1);
        return out;
      });
    }
    return page(1);
  }

  // ---------- fechas ----------
  function iso(d) { return d.toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function range(n, offset) {
    var start = new Date(); start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (n - 1) - (offset || 0));
    var end;
    if (offset) { end = new Date(start); end.setDate(end.getDate() + n); }
    else { end = new Date(); end.setMinutes(0, 0, 0); end.setHours(end.getHours() + 1); }
    return { start: iso(start), end: iso(end) };
  }
  var dayFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
  var longFmt = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
  var timeFmt = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
  function parseDay(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  var WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  var WEEK_LONG = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábados", "domingos"];

  // ---------- acceso ----------
  function showLogin(msg) {
    stopAuto();
    $("#dash").hidden = true;
    $("#top-actions").hidden = true;
    $("#login").hidden = false;
    $("#login-error").textContent = msg || "";
    if (msg) { var c = $(".login-card"); c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake"); }
    setTimeout(function () { $("#key").focus(); }, 50);
  }
  function showDash() {
    $("#login").hidden = true;
    $("#dash").hidden = false;
    $("#top-actions").hidden = false;
  }

  $("#eye").addEventListener("click", function () {
    var i = $("#key");
    i.type = i.type === "password" ? "text" : "password";
  });

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var k = $("#key").value.trim();
    if (!k) return;
    key = k;
    $("#enter").disabled = true;
    $("#login-error").textContent = "";
    api("/me").then(function () {
      store.del(KEY_STORE);
      store.set(KEY_STORE, k, $("#remember").checked);
      // En el dispositivo del dueño, sus visitas no se cuentan.
      try { localStorage.setItem("skipgc", "t"); $("#skip").checked = true; } catch (e2) {}
      $("#key").value = "";
      showDash();
      load();
    }).catch(function (err) {
      key = null;
      showLogin(err.auth ? "Esa clave no es válida." : "No se pudo conectar con GoatCounter. Probá de nuevo.");
    }).then(function () { $("#enter").disabled = false; });
  });

  $("#logout").addEventListener("click", function () {
    store.del(KEY_STORE);
    key = null;
    showLogin();
  });

  // ---------- período ----------
  $$(".ranges button").forEach(function (b) {
    b.addEventListener("click", function () {
      days = +b.getAttribute("data-days");
      $$(".ranges button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      load();
    });
  });
  $("#refresh").addEventListener("click", function () { load(); });

  // ---------- actualización automática ----------
  var autoTimer = null;
  function startAuto() {
    stopAuto();
    if ($("#auto").checked) autoTimer = setInterval(function () { if (!document.hidden) load(true); }, AUTO_MS);
  }
  function stopAuto() { if (autoTimer) clearInterval(autoTimer); autoTimer = null; }
  $("#auto").addEventListener("change", startAuto);
  try { $("#auto").checked = localStorage.getItem("vhp-panel-auto") !== "0"; } catch (e) {}
  $("#auto").addEventListener("change", function () { try { localStorage.setItem("vhp-panel-auto", $("#auto").checked ? "1" : "0"); } catch (e) {} });

  // ---------- análisis de eventos ----------
  // La tienda manda eventos con estos nombres; acá se agrupan.
  function digest(hits) {
    var d = {
      orders: 0, wa: 0, amount: 0, units: 0, views: 0, adds: 0, funnelViews: 0, funnelAdds: 0,
      products: {}, links: {}, shares: {}, ordersDaily: {}
    };
    function prod(s) {
      if (!d.products[s]) d.products[s] = { seen: 0, added: 0, ordered: 0 };
      return d.products[s];
    }
    hits.forEach(function (h) {
      var path = String(h.path || "").replace(/^\//, ""), c = h.count || 0, i = path.indexOf("/");
      var head = i < 0 ? path : path.slice(0, i), tail = i < 0 ? "" : path.slice(i + 1);
      switch (head) {
        case "pedido-enviado":
          d.orders += c;
          (h.stats || []).forEach(function (s) { d.ordersDaily[s.day] = (d.ordersDaily[s.day] || 0) + (s.daily || 0); });
          break;
        case "consulta-whatsapp": d.wa += c; break;
        case "pedido-monto": d.amount += (+tail || 0) * c; break;
        case "pedido-unidades": d.units += (+tail || 0) * c; break;
        case "visto": prod(tail).seen += c; d.views += c; break;
        case "agregado": prod(tail).added += c; d.adds += c; break;
        case "pedido-producto": prod(tail).ordered += c; break;
        case "link-directo": d.links[tail] = (d.links[tail] || 0) + c; break;
        case "compartido": d.shares[tail] = (d.shares[tail] || 0) + c; break;
        case "embudo":
          if (tail === "vio-producto") d.funnelViews += c;
          if (tail === "agrego") d.funnelAdds += c;
          break;
      }
    });
    return d;
  }
  function visitorsOf(t) { return Math.max(0, (t.total || 0) - (t.total_events || 0)); }

  // ---------- carga de datos ----------
  var loading = 0, seq = 0;
  function busy(on) {
    loading += on ? 1 : -1;
    $("#loading").hidden = loading <= 0;
    $("#refresh").classList.toggle("spin", loading > 0);
    $("#dash").classList.toggle("loading-state", loading > 0 && !last);
  }

  function load(silent) {
    if (!key) return showLogin();
    var my = ++seq;
    var r = range(days), prev = range(days, days);
    $("#range-label").textContent = days === 1 ? "Hoy, " + longFmt.format(new Date()) :
      "Últimos " + days + " días · " + dayFmt.format(new Date(r.start)) + " al " + dayFmt.format(new Date());
    if (!silent) busy(true);

    var cur = {}, old = {};
    var jobs = [
      api("/stats/total", r).then(function (d) { cur.total = d; }),
      allHits(r).then(function (h) { cur.hits = h; }),
      api("/stats/total", prev).then(function (d) { old.total = d; }).catch(function () {}),
      allHits(prev).then(function (h) { old.hits = h; }).catch(function () {}),
      api("/stats/total", { start: SINCE, end: r.end }).then(function (d) { cur.all = d; }).catch(function () {})
    ];
    var lists = {};
    ["toprefs", "locations", "systems", "browsers", "sizes"].forEach(function (k) {
      jobs.push(api("/stats/" + k, { start: r.start, end: r.end, limit: 8 }).then(function (d) { lists[k] = d.stats || []; }).catch(function () { lists[k] = []; }));
    });

    Promise.all(jobs).then(function () {
      if (my !== seq) return;
      last = { cur: cur, old: old, lists: lists, digest: digest(cur.hits || []), oldDigest: digest(old.hits || []) };
      render(last);
    }).catch(fail).then(function () {
      if (!silent) busy(false);
      $("#updated").textContent = "Actualizado a las " + timeFmt.format(new Date()) +
        ($("#auto").checked ? " · Se actualiza solo cada 5 minutos" : "") + " · Los datos pueden tardar unos minutos en aparecer.";
    });
    startAuto();
  }

  function fail(err) {
    if (err && err.auth) { store.del(KEY_STORE); key = null; showLogin("Tu clave venció o fue borrada. Ingresala de nuevo."); }
    else $("#updated").textContent = "No se pudieron traer los datos. Revisá tu conexión y tocá actualizar.";
  }

  // ---------- render ----------
  function render(L) {
    var D = L.digest, O = L.oldDigest;
    var visits = visitorsOf(L.cur.total || {}), oldVisits = L.old.total ? visitorsOf(L.old.total) : null;
    var stats = (L.cur.total && L.cur.total.stats) || [];
    var today = stats.length ? stats[stats.length - 1].daily : 0;
    var conv = visits ? D.orders / visits : 0, oldConv = oldVisits ? O.orders / oldVisits : null;
    var ticket = D.orders ? D.amount / D.orders : 0, oldTicket = O.orders ? O.amount / O.orders : null;
    var hasOld = !!L.old.total;

    setK("visits", fmt(visits), visits, oldVisits);
    $("#k-today").textContent = fmt(today);
    $("#k-all").textContent = L.cur.all ? fmt(visitorsOf(L.cur.all)) : "–";
    setK("orders", fmt(D.orders), D.orders, hasOld ? O.orders : null);
    setK("conv", visits ? pct(conv) : "–", conv, oldConv, true);
    setK("amount", money(D.amount), D.amount, hasOld ? O.amount : null);
    setK("ticket", D.orders ? money(ticket) : "–", ticket, oldTicket);
    setK("units", fmt(D.units), D.units, hasOld ? O.units : null);
    setK("wa", fmt(D.wa), D.wa, hasOld ? O.wa : null);

    drawFunnel(visits, D);
    var visitsSeries = stats.map(function (s) { return { day: s.day, v: s.daily }; });
    drawBars("#c-visits", visitsSeries, "visitante", "visitantes", false);
    fillTable("#t-visits", visitsSeries, "Visitantes");
    var orderSeries = stats.map(function (s) { return { day: s.day, v: D.ordersDaily[s.day] || 0 }; });
    drawBars("#c-orders", orderSeries, "pedido", "pedidos", true);
    fillTable("#t-orders", orderSeries, "Pedidos");
    drawHeat(stats);
    drawProducts(D);
    drawLists(L.lists, D);
    insight(visits, oldVisits, D, stats);
  }

  function setK(id, text, now, before, isRatio) {
    $("#k-" + id).textContent = text;
    var el = $("#d-" + id);
    el.innerHTML = "";
    if (before == null) return;
    var lbl = days === 1 ? " vs. ayer" : " vs. " + days + " días anteriores";
    if (!before) {
      el.textContent = now ? "Sin datos del período anterior" : "";
      return;
    }
    var change = (now - before) / before;
    var s = document.createElement("span");
    if (Math.abs(change) < 0.005) { s.className = "flat"; s.textContent = "= igual"; }
    else {
      s.className = change > 0 ? "up" : "down";
      s.textContent = (change > 0 ? "▲ +" : "▼ ") + (isRatio ? ((now - before) * 100).toFixed(1).replace(".", ",") + " pts" : Math.round(change * 100) + "%");
    }
    el.appendChild(s);
    el.appendChild(document.createTextNode(lbl));
  }

  // ---------- embudo ----------
  function drawFunnel(visits, D) {
    var steps = [
      { name: "Entraron a la tienda", n: visits },
      { name: "Vieron un vape", n: D.funnelViews },
      { name: "Agregaron al pedido", n: D.funnelAdds },
      { name: "Enviaron el pedido por WhatsApp", n: D.orders }
    ];
    var ol = $("#funnel");
    ol.innerHTML = "";
    var top = Math.max(1, visits);
    steps.forEach(function (st, i) {
      var li = document.createElement("li");
      var name = document.createElement("span"); name.className = "f-name"; name.textContent = st.name;
      var num = document.createElement("span"); num.className = "f-num"; num.textContent = fmt(st.n);
      if (i) { var sm = document.createElement("small"); sm.textContent = visits ? pct(st.n / top) : ""; num.appendChild(sm); }
      var bar = document.createElement("span"); bar.className = "f-bar";
      var fill = document.createElement("i"); fill.style.width = Math.max(st.n ? 2 : 0, Math.min(100, (st.n / top) * 100)) + "%";
      fill.style.animationDelay = i * 90 + "ms";
      bar.appendChild(fill);
      li.appendChild(name); li.appendChild(num); li.appendChild(bar);
      if (i && steps[i - 1].n) {
        var drop = document.createElement("span"); drop.className = "f-drop";
        drop.textContent = "Del paso anterior siguió el " + pct(Math.min(1, st.n / steps[i - 1].n));
        li.appendChild(drop);
      }
      ol.appendChild(li);
    });
  }

  // ---------- barras por día ----------
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  function drawBars(sel, series, one, many, alt) {
    var box = $(sel);
    var total = series.reduce(function (s, d) { return s + d.v; }, 0);
    if (!series.length || !total) {
      box.innerHTML = '<div class="chart-empty"></div>';
      box.firstChild.textContent = alt ? "Todavía no hay pedidos en este período." : "Todavía no hay visitas en este período. Apenas entre alguien a la tienda, aparece acá.";
      box.setAttribute("aria-label", "Sin datos");
      return;
    }
    var W = box.clientWidth || 600, H = box.clientHeight || 240;
    var padL = 34, padR = 6, padT = 18, padB = 26;
    var cw = W - padL - padR, ch = H - padT - padB;
    var max = niceMax(Math.max.apply(null, series.map(function (d) { return d.v; })));
    var band = cw / series.length;
    var bw = Math.max(2, Math.min(24, band - 2));
    var y = function (v) { return padT + ch - (v / max) * ch; };
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("aria-hidden", "true");
    function el(tag, attrs, text) {
      var e = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (text != null) e.textContent = text;
      svg.appendChild(e);
      return e;
    }
    [0, 0.5, 1].forEach(function (f) {
      var v = max * f, yy = Math.round(y(v)) + 0.5;
      el("line", { x1: padL, x2: W - padR, y1: yy, y2: yy, "class": "gridline" });
      el("text", { x: padL - 8, y: yy + 4, "text-anchor": "end", "class": "tick" }, fmt(v));
    });
    var every = Math.ceil(series.length / Math.max(2, Math.floor(cw / 64)));
    var peak = 0;
    series.forEach(function (d, i) { if (d.v > series[peak].v) peak = i; });
    series.forEach(function (d, i) {
      var cx = padL + band * i + band / 2;
      var h = d.v ? Math.max(2, (d.v / max) * ch) : 0;
      var x0 = cx - bw / 2, top = padT + ch - h, r = Math.min(4, bw / 2, h);
      el("rect", { x: padL + band * i, y: padT, width: band, height: ch, "class": "hit", tabindex: "0", "data-i": i });
      el("path", { "class": "bar" + (alt ? " alt" : ""), d: h ? "M" + x0 + "," + (padT + ch) + "V" + (top + r) + "Q" + x0 + "," + top + " " + (x0 + r) + "," + top +
        "H" + (x0 + bw - r) + "Q" + (x0 + bw) + "," + top + " " + (x0 + bw) + "," + (top + r) + "V" + (padT + ch) + "Z" : "" });
      if (i === peak && d.v) el("text", { x: cx, y: top - 6, "text-anchor": "middle", "class": "peak" }, fmt(d.v));
      var lastI = series.length - 1;
      if ((i % every === 0 && !(i !== lastI && lastI - i < every / 2)) || i === lastI) {
        el("text", { x: cx, y: H - 6, "text-anchor": "middle", "class": "tick" }, i === lastI ? "Hoy" : dayFmt.format(parseDay(d.day)));
      }
    });
    box.innerHTML = "";
    box.appendChild(svg);
    box.setAttribute("aria-label", "Total " + fmt(total) + " " + many + ". Máximo " + fmt(series[peak].v) + " el " + longFmt.format(parseDay(series[peak].day)) + ".");

    function show(e) {
      var hit = e.target.closest && e.target.closest(".hit");
      if (!hit) return;
      var i = +hit.getAttribute("data-i"), d = series[i];
      $$(".bar.on", svg).forEach(function (b) { b.classList.remove("on"); });
      if (hit.nextSibling) hit.nextSibling.classList.add("on");
      var br = box.getBoundingClientRect(), k = br.width / W;
      var x = br.left + (padL + band * i + band / 2) * k;
      var yy = br.top + (padT + ch - (d.v / max) * ch) * k;
      tip(fmt(d.v) + " " + (d.v === 1 ? one : many), longFmt.format(parseDay(d.day)), x, yy);
    }
    function hide() { untip(); $$(".bar.on", svg).forEach(function (b) { b.classList.remove("on"); }); }
    svg.addEventListener("pointermove", show);
    svg.addEventListener("pointerdown", show);
    svg.addEventListener("focusin", show);
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("focusout", hide);
  }

  // ---------- tooltip ----------
  function tip(title, sub, x, y) {
    var t = $("#tip");
    t.innerHTML = "<strong></strong><span></span>";
    t.firstChild.textContent = title;
    t.lastChild.textContent = sub;
    t.hidden = false;
    var half = t.offsetWidth / 2;
    t.style.left = Math.min(Math.max(x, half + 6), innerWidth - half - 6) + "px";
    t.style.top = Math.max(t.offsetHeight + 6, y - 10) + "px";
  }
  function untip() { $("#tip").hidden = true; }
  addEventListener("scroll", untip, { passive: true });

  // ---------- tablas ----------
  function fillTable(sel, series, label) {
    var wrap = $(sel);
    var rows = series.slice().reverse().map(function (d) {
      return "<tr><td>" + longFmt.format(parseDay(d.day)) + "</td><td>" + fmt(d.v) + "</td></tr>";
    }).join("");
    wrap.innerHTML = "<table><thead><tr><th scope=\"col\">Día</th><th scope=\"col\">" + label + "</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }
  $$("[data-table]").forEach(function (b) {
    b.addEventListener("click", function () {
      var w = $("#" + b.getAttribute("data-table")), open = w.hidden;
      w.hidden = !open;
      b.setAttribute("aria-expanded", String(open));
      b.textContent = open ? "Ocultar tabla" : "Ver tabla";
    });
  });

  // ---------- mapa de calor (día x hora) ----------
  function drawHeat(stats) {
    var grid = [0, 1, 2, 3, 4, 5, 6].map(function () { return new Array(24).fill(0); });
    stats.forEach(function (s) {
      var wd = (parseDay(s.day).getDay() + 6) % 7; // lunes = 0
      (s.hourly || []).forEach(function (v, h) { if (h < 24) grid[wd][h] += v || 0; });
    });
    var max = 0, best = null;
    grid.forEach(function (row, d) { row.forEach(function (v, h) { if (v > max) { max = v; best = { d: d, h: h }; } }); });
    var box = $("#heat"), html = '<span></span>';
    for (var h = 0; h < 24; h++) html += '<span class="hh">' + (h % 3 === 0 ? h : "") + "</span>";
    grid.forEach(function (row, d) {
      html += '<span class="hl">' + WEEK[d] + "</span>";
      row.forEach(function (v, hh) {
        var a = max ? 0.06 + 0.94 * (v / max) : 0.05;
        html += '<span class="cell" tabindex="0" style="--a:' + a.toFixed(3) + '" data-d="' + d + '" data-h="' + hh + '" data-v="' + v + '"></span>';
      });
    });
    box.innerHTML = html;
    $("#best-time").textContent = best && max ? "Pico: " + WEEK_LONG[best.d] + " de " + best.h + " a " + (best.h + 1) + " h" : "Todavía sin datos suficientes";
    function show(e) {
      var c = e.target.closest && e.target.closest(".cell");
      if (!c) return;
      var r = c.getBoundingClientRect(), v = +c.getAttribute("data-v"), h = +c.getAttribute("data-h");
      tip(fmt(v) + (v === 1 ? " visitante" : " visitantes"), WEEK_LONG[+c.getAttribute("data-d")] + ", de " + h + " a " + (h + 1) + " h", r.left + r.width / 2, r.top);
    }
    box.onpointermove = show; box.onpointerdown = show;
    box.onfocusin = show; box.onpointerleave = untip; box.onfocusout = untip;
  }

  // ---------- productos ----------
  function drawProducts(D) {
    var rows = Object.keys(PROD).map(function (s) {
      var d = D.products[s] || { seen: 0, added: 0, ordered: 0 };
      return { s: s, name: PROD[s].name, color: PROD[s].color, seen: d.seen, added: d.added, ordered: d.ordered };
    });
    // Productos que ya no están en el catálogo pero tienen datos
    Object.keys(D.products).forEach(function (s) {
      if (!PROD[s]) rows.push({ s: s, name: s.replace(/-/g, " "), color: "#6f6883", seen: D.products[s].seen, added: D.products[s].added, ordered: D.products[s].ordered });
    });
    rows.sort(function (a, b) { return b.ordered - a.ordered || b.added - a.added || b.seen - a.seen || a.name.localeCompare(b.name); });
    var tb = $("#products-body");
    tb.innerHTML = "";
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      if (!r.seen && !r.added && !r.ordered) tr.className = "zero";
      var td = document.createElement("td");
      var dot = document.createElement("span"); dot.className = "dot"; dot.style.background = r.color;
      td.appendChild(dot); td.appendChild(document.createTextNode(r.name));
      tr.appendChild(td);
      [fmt(r.seen), fmt(r.added), fmt(r.ordered), r.seen ? pct(Math.min(1, r.added / r.seen)) : "–"].forEach(function (v) {
        var c = document.createElement("td"); c.textContent = v; tr.appendChild(c);
      });
      tb.appendChild(tr);
    });
  }

  // ---------- listas con barra ----------
  var NAMES = { toprefs: "Directo / sin origen", locations: "Desconocida", systems: "Desconocido", browsers: "Desconocido", sizes: "Desconocido" };
  var SIZES = { "Phones": "Celular", "Large phones, small tablets": "Celular grande / tablet chica", "Tablets and small laptops": "Tablet / notebook chica", "Computer monitors": "Compu", "Computer monitors larger than HD": "Compu (pantalla grande)", "(unknown)": "Desconocido" };
  function drawLists(lists, D) {
    [["toprefs", "#l-refs", "Sin datos de origen todavía."],
     ["locations", "#l-locations", "Sin datos de ubicación todavía."],
     ["systems", "#l-systems", "Sin datos de dispositivos todavía."],
     ["browsers", "#l-browsers", "Sin datos de navegadores todavía."],
     ["sizes", "#l-sizes", "Sin datos de pantallas todavía."]].forEach(function (x) {
      rank(x[1], (lists[x[0]] || []).map(function (s) {
        var n = s.name || NAMES[x[0]];
        if (x[0] === "sizes") n = SIZES[s.name] || n;
        return { name: n, count: s.count };
      }), x[2]);
    });
    var links = [];
    Object.keys(D.links).forEach(function (s) { links.push({ name: "Abrieron link de " + (PROD[s] ? PROD[s].name : s), count: D.links[s] }); });
    Object.keys(D.shares).forEach(function (s) { links.push({ name: "Compartieron " + (PROD[s] ? PROD[s].name : s), count: D.shares[s] }); });
    links.sort(function (a, b) { return b.count - a.count; });
    rank("#l-links", links.slice(0, 8), "Nadie abrió ni compartió links directos todavía.");
  }

  function rank(sel, items, emptyMsg) {
    var ol = $(sel);
    ol.innerHTML = "";
    if (!items.length) {
      var li = document.createElement("li");
      var e = document.createElement("span"); e.className = "empty"; e.textContent = emptyMsg;
      li.appendChild(e); ol.appendChild(li);
      return;
    }
    var max = Math.max.apply(null, items.map(function (i) { return i.count; })) || 1;
    var total = items.reduce(function (s, i) { return s + i.count; }, 0) || 1;
    items.forEach(function (it, i) {
      var li = document.createElement("li");
      var n = document.createElement("span"); n.className = "name"; n.textContent = it.name; n.title = it.name;
      var c = document.createElement("span"); c.className = "num"; c.textContent = fmt(it.count);
      c.title = pct(it.count / total) + " del total de la lista";
      var m = document.createElement("span"); m.className = "meter";
      var bar = document.createElement("i");
      bar.style.width = Math.max(3, (it.count / max) * 100) + "%";
      bar.style.animationDelay = i * 60 + "ms";
      m.appendChild(bar);
      li.appendChild(n); li.appendChild(c); li.appendChild(m);
      ol.appendChild(li);
    });
  }

  // ---------- resumen en una frase ----------
  function insight(visits, oldVisits, D, stats) {
    var el = $("#insight"), parts = [];
    if (!visits) { el.hidden = true; return; }
    if (oldVisits) {
      var ch = Math.round(((visits - oldVisits) / oldVisits) * 100);
      if (Math.abs(ch) >= 5) parts.push("Las visitas " + (ch > 0 ? "subieron" : "bajaron") + " <strong>" + Math.abs(ch) + "%</strong>");
    }
    var top = null;
    Object.keys(D.products).forEach(function (s) {
      var p = D.products[s];
      if (!top || p.ordered > top.v.ordered || (p.ordered === top.v.ordered && p.added > top.v.added)) top = { s: s, v: p };
    });
    if (top && (top.v.ordered || top.v.added)) parts.push("el más pedido es <strong>" + escapeHtml(PROD[top.s] ? PROD[top.s].name : top.s) + "</strong>");
    if (D.orders) parts.push("<strong>" + pct(D.orders / visits) + "</strong> de los visitantes mandó un pedido");
    el.hidden = !parts.length;
    if (parts.length) {
      var txt = parts.join(", ");
      el.innerHTML = txt.charAt(0).toUpperCase() + txt.slice(1) + ".";
    }
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }

  // ---------- exportar ----------
  $("#export").addEventListener("click", function () {
    if (!last) return;
    var stats = (last.cur.total && last.cur.total.stats) || [], D = last.digest;
    var lines = ["Día;Visitantes;Pedidos"];
    stats.forEach(function (s) { lines.push(s.day + ";" + s.daily + ";" + (D.ordersDaily[s.day] || 0)); });
    lines.push("", "Producto;Vistos;Agregados;Pedidos");
    Object.keys(PROD).forEach(function (s) {
      var p = D.products[s] || { seen: 0, added: 0, ordered: 0 };
      lines.push(PROD[s].name + ";" + p.seen + ";" + p.added + ";" + p.ordered);
    });
    var blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vhp-analiticas-" + days + "-dias.csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  });

  var rz;
  addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (!$("#dash").hidden && last) render(last); }, 150);
  });

  // ---------- no contar mis visitas ----------
  var skip = $("#skip");
  try { skip.checked = localStorage.getItem("skipgc") === "t"; } catch (e) {}
  skip.addEventListener("change", function () {
    try {
      if (skip.checked) localStorage.setItem("skipgc", "t");
      else localStorage.removeItem("skipgc");
    } catch (e) {}
  });
  $("#gc-link").href = "https://" + CODE + ".goatcounter.com";

  // ---------- inicio ----------
  if (!CODE) {
    showLogin("Falta configurar el código de GoatCounter en js/productos.js.");
    $("#enter").disabled = true;
  } else if (key) {
    showDash();
    load();
  } else {
    showLogin();
  }
})();
