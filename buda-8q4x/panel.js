/* =========================================================
   VHP · Panel privado de analíticas
   Los datos vienen de la API de GoatCounter y solo se pueden leer
   con la clave del dueño, que se guarda únicamente en su navegador.
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.VHP_CONFIG || {};
  var CODE = CFG.goatcounter;
  var API = "https://" + CODE + ".goatcounter.com/api/v0";
  var KEY_STORE = "vhp-panel-key";
  var SINCE = "2026-10-01T00:00:00Z"; // desde cuándo cuenta el "total histórico"

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var nf = new Intl.NumberFormat("es-AR");
  var fmt = function (n) { return nf.format(n || 0); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v, keep) {
      try { (keep ? localStorage : sessionStorage).setItem(k, v); } catch (e) {}
    },
    del: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  };

  var key = store.get(KEY_STORE);
  var days = 30;

  // ---------- API ----------
  var queue = Promise.resolve();
  function api(path, params) {
    // La API permite pocas consultas por segundo: las hacemos de a una.
    var run = function () {
      var qs = params ? "?" + Object.keys(params).map(function (k) {
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
    queue = p.then(function () { return wait(280); }, function () { return wait(280); });
    return p;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- fechas ----------
  function hourFloor(d) { d = new Date(d); d.setMinutes(0, 0, 0); return d; }
  function iso(d) { return d.toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function range(n, offset) {
    var end = hourFloor(new Date());
    end.setHours(end.getHours() + 1);
    var start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (n - 1) - (offset || 0));
    if (offset) { end = new Date(start); end.setDate(end.getDate() + n); }
    return { start: iso(start), end: iso(end) };
  }
  var dayFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
  var longFmt = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
  function parseDay(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // ---------- acceso ----------
  function showLogin(msg) {
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
      try { localStorage.setItem("skipgc", "t"); skip.checked = true; } catch (e2) {}
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
  $("#refresh").addEventListener("click", load);

  // ---------- carga de datos ----------
  var loading = 0;
  function busy(on) {
    loading += on ? 1 : -1;
    $("#loading").hidden = loading <= 0;
    $("#refresh").classList.toggle("spin", loading > 0);
  }

  function load() {
    if (!key) return showLogin();
    var r = range(days), prev = range(days, days);
    $("#range-label").textContent = "Últimos " + days + " días · " + dayFmt.format(new Date(r.start)) + " al " + dayFmt.format(new Date());
    busy(true);

    var main = api("/stats/total", r).then(function (d) {
      var visits = Math.max(0, (d.total || 0) - (d.total_events || 0));
      $("#t-visits").textContent = fmt(visits);
      var stats = d.stats || [];
      var today = stats.length ? stats[stats.length - 1].daily : 0;
      $("#t-today").textContent = fmt(today);
      drawChart(stats);
      return visits;
    });

    var before = api("/stats/total", prev).then(function (d) {
      return Math.max(0, (d.total || 0) - (d.total_events || 0));
    }).catch(function () { return null; });

    Promise.all([main, before]).then(function (v) {
      var now = v[0], old = v[1], el = $("#t-delta");
      if (old == null) { el.textContent = ""; return; }
      if (old === 0) { el.textContent = now ? "Primeros " + days + " días con datos" : ""; return; }
      var pct = Math.round(((now - old) / old) * 100);
      el.innerHTML = "";
      var s = document.createElement("span");
      s.className = pct >= 0 ? "up" : "down";
      s.textContent = (pct >= 0 ? "▲ +" : "▼ ") + pct + "%";
      el.appendChild(s);
      el.appendChild(document.createTextNode(" vs. los " + days + " días anteriores"));
    }).catch(fail);

    api("/stats/total", { start: SINCE, end: r.end }).then(function (d) {
      $("#t-all").textContent = fmt(Math.max(0, (d.total || 0) - (d.total_events || 0)));
    }).catch(function () { $("#t-all").textContent = "–"; });

    api("/stats/hits", { start: r.start, end: r.end, limit: 100 }).then(function (d) {
      var hits = d.hits || [], orders = 0, wa = 0, adds = 0, products = [];
      hits.forEach(function (h) {
        var path = String(h.path || "").replace(/^\//, "");
        if (path === "pedido-enviado") orders += h.count;
        else if (path === "consulta-whatsapp") wa += h.count;
        else if (path.indexOf("agregado/") === 0) {
          adds += h.count;
          products.push({ name: String(h.title || path).replace(/^Agregado:\s*/, ""), count: h.count });
        }
      });
      $("#t-orders").textContent = fmt(orders);
      $("#t-wa").textContent = fmt(wa);
      $("#t-adds").textContent = fmt(adds);
      products.sort(function (a, b) { return b.count - a.count; });
      rank("#l-products", products.slice(0, 6), "Todavía nadie agregó productos en este período.");
    }).catch(fail);

    [["toprefs", "#l-refs", "Sin datos de origen todavía."],
     ["locations", "#l-locations", "Sin datos de ubicación todavía."],
     ["systems", "#l-systems", "Sin datos de dispositivos todavía."]].forEach(function (x) {
      api("/stats/" + x[0], { start: r.start, end: r.end, limit: 6 }).then(function (d) {
        rank(x[1], (d.stats || []).map(function (s) {
          return { name: s.name || (x[0] === "toprefs" ? "Directo / sin origen" : "Desconocido"), count: s.count };
        }), x[2]);
      }).catch(fail);
    });

    queue.then(function () {
      busy(false);
      $("#updated").textContent = "Actualizado " + new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date()) +
        " · Los números pueden tardar unos minutos en aparecer.";
    });
  }

  function fail(err) {
    if (err && err.auth) { store.del(KEY_STORE); key = null; showLogin("Tu clave venció o fue borrada. Ingresala de nuevo."); }
  }

  // ---------- listas con barra ----------
  function rank(sel, items, emptyMsg) {
    var ol = $(sel);
    ol.innerHTML = "";
    if (!items.length) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="empty"></span>';
      li.firstChild.textContent = emptyMsg;
      ol.appendChild(li);
      return;
    }
    var max = Math.max.apply(null, items.map(function (i) { return i.count; })) || 1;
    items.forEach(function (it, i) {
      var li = document.createElement("li");
      var n = document.createElement("span"); n.className = "name"; n.textContent = it.name; n.title = it.name;
      var c = document.createElement("span"); c.className = "num"; c.textContent = fmt(it.count);
      var m = document.createElement("span"); m.className = "meter";
      var bar = document.createElement("i");
      bar.style.width = Math.max(3, (it.count / max) * 100) + "%";
      bar.style.animationDelay = i * 60 + "ms";
      m.appendChild(bar);
      li.appendChild(n); li.appendChild(c); li.appendChild(m);
      ol.appendChild(li);
    });
  }

  // ---------- gráfico de barras ----------
  var lastStats = [];
  function niceMax(v) {
    if (v <= 4) return 4;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return n * p;
  }

  function drawChart(stats) {
    lastStats = stats;
    var box = $("#chart"), tip = $("#tip");
    tip.hidden = true;
    var total = stats.reduce(function (s, d) { return s + d.daily; }, 0);
    if (!stats.length || !total) {
      box.innerHTML = '<div class="chart-empty">Todavía no hay visitas en este período.<br>Apenas entre alguien a la tienda, aparece acá.</div>';
      fillTable(stats);
      return;
    }
    var W = box.clientWidth || 600, H = box.clientHeight || 240;
    var padL = 34, padR = 6, padT = 18, padB = 26;
    var cw = W - padL - padR, ch = H - padT - padB;
    var max = niceMax(Math.max.apply(null, stats.map(function (d) { return d.daily; })));
    var band = cw / stats.length;
    var bw = Math.max(2, Math.min(24, band - 2));
    var y = function (v) { return padT + ch - (v / max) * ch; };
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("aria-hidden", "true");

    // Líneas guía y valores del eje
    [0, 0.5, 1].forEach(function (f) {
      var v = max * f, yy = Math.round(y(v)) + 0.5;
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", padL); l.setAttribute("x2", W - padR); l.setAttribute("y1", yy); l.setAttribute("y2", yy);
      l.setAttribute("class", "gridline");
      svg.appendChild(l);
      var t = document.createElementNS(NS, "text");
      t.setAttribute("x", padL - 8); t.setAttribute("y", yy + 4); t.setAttribute("text-anchor", "end");
      t.setAttribute("class", "tick");
      t.textContent = fmt(v);
      svg.appendChild(t);
    });

    // Fechas del eje X (algunas, para que no se pisen)
    var every = Math.ceil(stats.length / Math.max(2, Math.floor(cw / 64)));
    var peak = 0;
    stats.forEach(function (d, i) { if (d.daily > stats[peak].daily) peak = i; });

    stats.forEach(function (d, i) {
      var cx = padL + band * i + band / 2;
      var h = d.daily ? Math.max(2, (d.daily / max) * ch) : 0;
      var x0 = cx - bw / 2, top = padT + ch - h, r = Math.min(4, bw / 2, h);

      var hit = document.createElementNS(NS, "rect");
      hit.setAttribute("x", padL + band * i); hit.setAttribute("y", padT);
      hit.setAttribute("width", band); hit.setAttribute("height", ch);
      hit.setAttribute("class", "hit");
      hit.setAttribute("tabindex", "0");
      hit.setAttribute("data-i", i);
      svg.appendChild(hit);

      var bar = document.createElementNS(NS, "path");
      bar.setAttribute("class", "bar");
      // Punta redondeada arriba, recta en la base
      bar.setAttribute("d", h ? "M" + x0 + "," + (padT + ch) + "V" + (top + r) + "Q" + x0 + "," + top + " " + (x0 + r) + "," + top +
        "H" + (x0 + bw - r) + "Q" + (x0 + bw) + "," + top + " " + (x0 + bw) + "," + (top + r) + "V" + (padT + ch) + "Z" : "");
      svg.appendChild(bar);

      if (i === peak && d.daily) {
        var pt = document.createElementNS(NS, "text");
        pt.setAttribute("x", cx); pt.setAttribute("y", top - 6); pt.setAttribute("text-anchor", "middle");
        pt.setAttribute("class", "peak");
        pt.textContent = fmt(d.daily);
        svg.appendChild(pt);
      }
      if (i % every === 0 || i === stats.length - 1) {
        if (i === stats.length - 1 && i % every !== 0 && (i % every) < every / 2) return;
        var t = document.createElementNS(NS, "text");
        t.setAttribute("x", cx); t.setAttribute("y", H - 6); t.setAttribute("text-anchor", "middle");
        t.setAttribute("class", "tick");
        t.textContent = i === stats.length - 1 ? "Hoy" : dayFmt.format(parseDay(d.day));
        svg.appendChild(t);
      }
    });

    box.innerHTML = "";
    box.appendChild(svg);
    box.setAttribute("aria-label", "Gráfico de visitantes por día. Total " + fmt(total) + ". Máximo " + fmt(stats[peak].daily) + " el " + longFmt.format(parseDay(stats[peak].day)) + ".");

    function show(e) {
      var el = e.target.closest && e.target.closest(".hit");
      if (!el) return;
      var i = +el.getAttribute("data-i"), d = stats[i];
      $$(".chart .bar.on").forEach(function (b) { b.classList.remove("on"); });
      if (el.nextSibling) el.nextSibling.classList.add("on");
      tip.innerHTML = "<strong></strong><span></span>";
      tip.firstChild.textContent = fmt(d.daily) + (d.daily === 1 ? " visitante" : " visitantes");
      tip.lastChild.textContent = longFmt.format(parseDay(d.day));
      var br = box.getBoundingClientRect(), pr = box.parentNode.getBoundingClientRect();
      var scale = br.width / W;
      var cx = (padL + band * i + band / 2) * scale;
      var top = (padT + ch - (d.daily / max) * ch) * scale;
      tip.hidden = false;
      var half = tip.offsetWidth / 2;
      var left = Math.min(Math.max(br.left - pr.left + cx, half + 4), pr.width - half - 4);
      tip.style.left = left + "px";
      tip.style.top = (br.top - pr.top + top - 10) + "px";
    }
    function hide() {
      tip.hidden = true;
      $$(".chart .bar.on").forEach(function (b) { b.classList.remove("on"); });
    }
    svg.addEventListener("pointermove", show);
    svg.addEventListener("pointerdown", show);
    svg.addEventListener("focusin", show);
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("focusout", hide);
    fillTable(stats);
  }

  function fillTable(stats) {
    var tb = $("#table-body");
    tb.innerHTML = "";
    stats.slice().reverse().forEach(function (d) {
      var tr = document.createElement("tr");
      var a = document.createElement("td"), b = document.createElement("td");
      a.textContent = longFmt.format(parseDay(d.day));
      b.textContent = fmt(d.daily);
      tr.appendChild(a); tr.appendChild(b);
      tb.appendChild(tr);
    });
  }

  $("#toggle-table").addEventListener("click", function () {
    var w = $("#table-wrap"), open = w.hidden;
    w.hidden = !open;
    this.setAttribute("aria-expanded", String(open));
    this.textContent = open ? "Ocultar tabla" : "Ver tabla";
  });

  var rz;
  addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () { if (!$("#dash").hidden && lastStats.length) drawChart(lastStats); }, 150);
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
