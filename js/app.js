/* =========================================================
   VHP · Vape House Pilar · Lógica de la tienda
   Los datos (productos, sabores, WhatsApp) están en js/productos.js
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.VHP_CONFIG;
  var DEFAULT_FLAVORS = window.VHP_SABORES;
  var BRAND_COLOR = window.VHP_MARCAS;
  var PRODUCTS = window.VHP_PRODUCTOS.map(function (p, i) {
    p.id = "p" + i;
    p.order = i;
    return p;
  });
  var OTHER = "__otro__";
  var STORE_KEY = "vhp-pedido-v2";
  var DATA_KEY = "vhp-datos-v1";

  // ---------- utilidades ----------
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };
  var fmt = function (n) { return "$" + n.toLocaleString("es-AR"); };
  var num = function (n) { return n.toLocaleString("es-AR"); };
  var wa = function (t) { return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(t); };
  var esc = function (s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  var norm = function (s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  };
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  var BRANDS = PRODUCTS.map(function (p) { return p.marca; })
    .filter(function (b, i, a) { return a.indexOf(b) === i; });

  function brandColor(p) { return BRAND_COLOR[p.marca] || "#a899d6"; }
  function flavorsOf(p) {
    if (p.sabores && p.sabores.length) {
      return p.sabores.map(function (n) { return { nombre: n, color: flavorColor(n) }; });
    }
    return DEFAULT_FLAVORS;
  }
  function flavorColor(name) {
    var key = norm(name);
    for (var i = 0; i < DEFAULT_FLAVORS.length; i++) {
      if (norm(DEFAULT_FLAVORS[i].nombre) === key) return DEFAULT_FLAVORS[i].color;
    }
    return "";
  }

  function dot(color) { return color ? '<i style="--fc:' + color + '"></i>' : "<i></i>"; }

  // ---------- ilustración del vape ----------
  var artSeq = 0;
  var noPhoto = {};
  function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function photoOf(p) {
    if (p.img === "") return "";
    return p.img || "img/" + slug(p.marca + " " + p.nombre) + ".webp";
  }
  // Si la foto no existe (o no carga) se reemplaza por la ilustración.
  document.addEventListener("error", function (e) {
    var el = e.target, pid = el && el.getAttribute && el.getAttribute("data-photo");
    if (!pid) return;
    noPhoto[pid] = true;
    el.outerHTML = drawing(byId[pid]);
  }, true);

  function art(p) {
    var src = p.id && !noPhoto[p.id] ? photoOf(p) : "";
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(p.marca + " " + p.nombre) + '" data-photo="' + p.id + '" loading="lazy">';
    return drawing(p);
  }

  function drawing(p) {
    var c = brandColor(p), g = "g" + (++artSeq);
    var screen = p.pitadas && p.pitadas >= 30000
      ? '<rect x="25" y="70" width="30" height="16" rx="4" fill="#0b0912" opacity=".85"/>' +
        '<rect x="29" y="75" width="' + Math.round(22 * Math.min(1, p.pitadas / 50000)) + '" height="6" rx="2" fill="' + c + '"/>'
      : '<circle cx="40" cy="80" r="4" fill="#0b0912" opacity=".55"/>';
    return '<svg viewBox="0 0 80 120" aria-hidden="true">' +
      '<defs><linearGradient id="' + g + '" x1="0" x2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".8" stop-color="#000" stop-opacity=".25"/></linearGradient></defs>' +
      '<rect x="30" y="4" width="20" height="18" rx="6" fill="#2a2438"/>' +
      '<rect x="33" y="6" width="5" height="12" rx="2.5" fill="#fff" opacity=".12"/>' +
      '<rect x="16" y="18" width="48" height="96" rx="16" fill="' + c + '"/>' +
      '<rect x="16" y="18" width="48" height="96" rx="16" fill="url(#' + g + ')"/>' +
      '<rect x="22" y="26" width="5" height="62" rx="2.5" fill="#fff" opacity=".35"/>' +
      screen +
      '<rect x="16" y="100" width="48" height="2" fill="#000" opacity=".15"/>' +
      "</svg>";
  }

  // ---------- estado ----------
  var lines = sanitize(store.get(STORE_KEY));
  var filter = { brand: "Todos", q: "", sort: "rec" };

  function sanitize(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (l) {
      return l && byId[l.pid] && typeof l.flavor === "string" && l.flavor && l.qty > 0;
    }).map(function (l) { return { pid: l.pid, flavor: l.flavor, qty: Math.floor(l.qty) }; });
  }
  function save() { store.set(STORE_KEY, lines); }
  function qtyOf(pid) {
    return lines.reduce(function (s, l) { return s + (l.pid === pid ? l.qty : 0); }, 0);
  }
  function totals() {
    var n = 0, t = 0;
    lines.forEach(function (l) { n += l.qty; t += l.qty * byId[l.pid].precio; });
    return { n: n, t: t };
  }
  function addLine(pid, flavor, qty) {
    var key = norm(flavor);
    var found = lines.filter(function (l) { return l.pid === pid && norm(l.flavor) === key; })[0];
    if (found) found.qty += qty;
    else lines.push({ pid: pid, flavor: flavor, qty: qty });
    save();
  }

  // ---------- WhatsApp en links fijos ----------
  $$("[data-wa]").forEach(function (a) { a.href = wa(a.getAttribute("data-wa")); });
  $("#year").textContent = new Date().getFullYear();
  $("#stat-models").textContent = PRODUCTS.length;
  $("#stat-brands").textContent = BRANDS.length;

  // ---------- hero ----------
  (function heroArt() {
    var picks = BRANDS.map(function (b) { return PRODUCTS.filter(function (p) { return p.marca === b; })[0]; });
    ["#hero-v1", "#hero-v2", "#hero-v3"].forEach(function (sel, i) {
      var p = picks[i % picks.length];
      if (p) $(sel).innerHTML = drawing(p);
    });
  })();

  // ---------- catálogo ----------
  function renderChips() {
    var counts = {};
    PRODUCTS.forEach(function (p) { counts[p.marca] = (counts[p.marca] || 0) + 1; });
    $("#chips").innerHTML = ["Todos"].concat(BRANDS).map(function (b) {
      var dot = b === "Todos" ? "" : '<i style="--c:' + (BRAND_COLOR[b] || "#a899d6") + '"></i>';
      var n = b === "Todos" ? PRODUCTS.length : counts[b];
      return '<button class="chip" type="button" data-brand="' + esc(b) + '" aria-pressed="' + (b === filter.brand) + '">' +
        dot + esc(b) + " <small>" + n + "</small></button>";
    }).join("");
  }

  function visibleProducts() {
    var q = norm(filter.q);
    var list = PRODUCTS.filter(function (p) {
      if (filter.brand !== "Todos" && p.marca !== filter.brand) return false;
      if (q && norm(p.marca + " " + p.nombre).indexOf(q) === -1) return false;
      return true;
    });
    var by = {
      rec: function (a, b) { return a.order - b.order; },
      asc: function (a, b) { return a.precio - b.precio || a.order - b.order; },
      desc: function (a, b) { return b.precio - a.precio || a.order - b.order; },
      puffs: function (a, b) { return (b.pitadas || 0) - (a.pitadas || 0) || a.order - b.order; }
    };
    return list.sort(by[filter.sort] || by.rec);
  }

  function badge(pid) {
    var q = qtyOf(pid);
    return q ? '<span class="in-cart" aria-label="' + q + ' en tu pedido">✓ ' + q + "</span>" : "";
  }

  function card(p, i) {
    var name = p.marca + " " + p.nombre;
    var meta = p.pitadas ? num(p.pitadas) + " pitadas" : "Descartable";
    var tag = p.etiqueta ? '<span class="tag hot">' + esc(p.etiqueta) + "</span>" : "";
    var puffTag = p.pitadas ? '<span class="tag">' + Math.round(p.pitadas / 1000) + "K</span>" : "";
    return '<li class="card" style="--c:' + brandColor(p) + ";--i:" + i + '" data-card="' + p.id + '">' +
      '<button class="card-art" type="button" data-pick="' + p.id + '" aria-label="Elegir sabor de ' + esc(name) + '">' +
      art(p) + puffTag + tag + '<span class="badge-slot">' + badge(p.id) + "</span></button>" +
      '<div class="card-body">' +
      '<p class="card-brand">' + esc(p.marca) + "</p>" +
      '<h3 class="card-name">' + esc(p.nombre) + "</h3>" +
      '<p class="card-meta">' + meta + "</p>" +
      '<div class="card-row"><span class="price">' + fmt(p.precio) + "</span>" +
      '<button class="add" type="button" data-pick="' + p.id + '" aria-label="Elegir sabor y agregar ' + esc(name) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Elegir sabor</span></button>' +
      "</div></div></li>";
  }

  function renderCatalog() {
    var list = visibleProducts();
    $("#catalog").innerHTML = list.length
      ? list.map(card).join("")
      : '<li class="empty"><p>No encontramos productos con esa búsqueda.</p><button class="btn ghost" type="button" data-reset>Ver todos</button></li>';
    $("#result-count").textContent = list.length === 1 ? "1 producto" : list.length + " productos";
  }

  function refreshBadges() {
    $$("[data-card]").forEach(function (c) {
      var slot = $(".badge-slot", c);
      if (slot) slot.innerHTML = badge(c.getAttribute("data-card"));
    });
  }

  $("#q").addEventListener("input", function (e) { filter.q = e.target.value; renderCatalog(); });
  $("#sort").addEventListener("change", function (e) { filter.sort = e.target.value; renderCatalog(); });

  // ---------- diálogos ----------
  function openDlg(d) {
    if (!d.open) d.showModal();
    document.body.classList.add("lock");
  }
  function closeDlg(d) {
    if (d.open) d.close();
  }
  $$("dialog").forEach(function (d) {
    d.addEventListener("close", function () {
      if (!$$("dialog").some(function (x) { return x.open; })) document.body.classList.remove("lock");
    });
    d.addEventListener("click", function (e) {
      if (e.target === d && d.id !== "age") closeDlg(d);
      if (e.target.closest("[data-close]")) closeDlg(d);
    });
  });

  // ---------- elegir sabor ----------
  var pickDlg = $("#pick"), pick = { pid: null, qty: 1 }, lastTrigger = null;

  function openPick(pid, trigger) {
    var p = byId[pid];
    pick = { pid: pid, qty: 1 };
    lastTrigger = trigger || null;
    $(".pick-head", pickDlg).style.setProperty("--c", brandColor(p));
    $("#pick-art").innerHTML = art(p);
    $("#pick-brand").textContent = p.marca;
    $("#pick-title").textContent = p.nombre;
    $("#pick-meta").textContent = p.pitadas ? num(p.pitadas) + " pitadas · Descartable" : "Descartable";
    $("#pick-price").textContent = fmt(p.precio) + " c/u";
    $("#flavor-grid").innerHTML = flavorsOf(p).map(function (f) {
      return '<label class="flavor"><input type="radio" name="flavor" value="' + esc(f.nombre) + '">' +
        "<span>" + dot(f.color) + esc(f.nombre) + "</span></label>";
    }).join("") +
      '<label class="flavor other-opt"><input type="radio" name="flavor" value="' + OTHER + '"><span><i></i>Otro sabor</span></label>';
    $("#other").value = "";
    $("#other-wrap").hidden = true;
    $("#pick-hint").textContent = "";
    updatePick();
    openDlg(pickDlg);
    var first = $(".flavor input", pickDlg);
    if (first) first.focus({ preventScroll: true });
    $(".sheet-in", pickDlg).scrollTop = 0;
  }

  function updatePick() {
    var p = byId[pick.pid];
    $("#pick-qty").textContent = pick.qty;
    $("#pick-dec").disabled = pick.qty <= 1;
    $("#pick-sum").textContent = fmt(p.precio * pick.qty);
  }

  function chosenFlavor() {
    var r = $('input[name="flavor"]:checked', pickDlg);
    if (!r) return "";
    if (r.value === OTHER) return $("#other").value.trim();
    return r.value;
  }

  pickDlg.addEventListener("change", function (e) {
    if (e.target.name === "flavor") {
      var isOther = e.target.value === OTHER;
      $("#other-wrap").hidden = !isOther;
      $("#pick-hint").textContent = "";
      if (isOther) $("#other").focus();
    }
  });
  $("#pick-dec").addEventListener("click", function () { if (pick.qty > 1) { pick.qty--; updatePick(); } });
  $("#pick-inc").addEventListener("click", function () { pick.qty++; updatePick(); });

  $("#pick-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var flavor = chosenFlavor();
    if (!flavor) {
      var other = $('input[name="flavor"]:checked', pickDlg);
      $("#pick-hint").textContent = other ? "Escribí qué sabor querés." : "Elegí un sabor para continuar.";
      (other ? $("#other") : $(".flavor input", pickDlg)).focus();
      return;
    }
    var p = byId[pick.pid];
    addLine(pick.pid, flavor, pick.qty);
    closeDlg(pickDlg);
    renderCart();
    refreshBadges();
    bump();
    toast(pick.qty + " × " + p.marca + " " + p.nombre + " · " + flavor, flavorColor(flavor) || brandColor(p));
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  });

  // ---------- carrito ----------
  var cartDlg = $("#cart");

  function itemHtml(l, i) {
    var p = byId[l.pid], fc = flavorColor(l.flavor);
    return '<li class="item" style="--c:' + brandColor(p) + '">' +
      '<div class="item-art">' + art(p) + "</div>" +
      '<div><p class="item-name">' + esc(p.marca + " " + p.nombre) + "</p>" +
      '<p class="item-flavor">' + dot(fc) + esc(l.flavor) + "</p></div>" +
      '<p class="item-line">' + fmt(l.qty * p.precio) + "</p>" +
      '<div class="item-ctl"><div class="stepper" aria-label="Cantidad">' +
      '<button type="button" data-line="' + i + '" data-act="dec" aria-label="Quitar uno">−</button>' +
      "<output>" + l.qty + "</output>" +
      '<button type="button" data-line="' + i + '" data-act="inc" aria-label="Sumar uno">+</button></div>' +
      '<button class="rm" type="button" data-line="' + i + '" data-act="rm">Quitar</button></div></li>';
  }

  function renderCart() {
    var tt = totals();
    $("#count").textContent = tt.n;
    $("#bar").hidden = tt.n === 0;
    document.body.classList.toggle("has-bar", tt.n > 0);
    $("#bar-n").textContent = tt.n;
    $("#bar-label").textContent = "Ver pedido";
    $("#bar-total").textContent = fmt(tt.t);

    var empty = !lines.length;
    $("#cart-empty").hidden = !empty;
    $("#datos").hidden = empty;
    $("#cart-foot").hidden = empty;
    $("#cart-items").innerHTML = empty ? "" : lines.map(itemHtml).join("") +
      '<li><button class="add-more" type="button" data-more>+ Agregar otro vape o sabor</button></li>';
    $("#cart-total").textContent = fmt(tt.t);
    updateSend();
  }

  cartDlg.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (b) {
      var i = +b.getAttribute("data-line"), act = b.getAttribute("data-act"), l = lines[i];
      if (!l) return;
      if (act === "inc") l.qty++;
      if (act === "dec") l.qty--;
      if (act === "rm" || l.qty <= 0) lines.splice(i, 1);
      save();
      renderCart();
      refreshBadges();
      var again = $('[data-line="' + i + '"][data-act="' + act + '"]', cartDlg);
      (again || $("#cart-title")).focus();
      return;
    }
    if (e.target.closest("[data-more]")) goShop();
  });

  function goShop() {
    closeDlg(cartDlg);
    $("#productos").scrollIntoView({ behavior: "smooth" });
  }
  $("#go-shop").addEventListener("click", goShop);

  function openCart() {
    renderCart();
    openDlg(cartDlg);
    $("#cart-title").focus();
  }
  $("#open-cart").addEventListener("click", openCart);
  $("#bar-open").addEventListener("click", openCart);

  // ---------- datos del cliente ----------
  var saved = store.get(DATA_KEY) || {};
  ["c-name", "c-addr", "c-mail"].forEach(function (id) { if (saved[id]) $("#" + id).value = saved[id]; });
  if (saved.entrega) {
    var r = $('input[name="entrega"][value="' + saved.entrega + '"]');
    if (r) r.checked = true;
  }

  function val(id) { return $(id).value.trim(); }
  function entrega() { return $('input[name="entrega"]:checked').value; }
  function syncEntrega() { $("#addr-field").hidden = entrega() === "Retiro"; }
  syncEntrega();

  function missing() {
    var m = [];
    if (!val("#c-name")) m.push({ label: "nombre", el: $("#c-name") });
    if (entrega() === "Envío" && !val("#c-addr")) m.push({ label: "dirección", el: $("#c-addr") });
    if (!/^\S+@\S+\.\S+$/.test(val("#c-mail"))) m.push({ label: "mail", el: $("#c-mail") });
    return m;
  }

  function message() {
    var items = lines.map(function (l) {
      var p = byId[l.pid];
      return "• " + l.qty + " × " + p.marca + " " + p.nombre + " — " + l.flavor + " (" + fmt(l.qty * p.precio) + ")";
    });
    var note = val("#note");
    var tt = totals();
    return "Hola! Quiero hacer este pedido en " + CFG.tienda + ":\n\n" +
      "*Pedido*\n" + items.join("\n") + "\n\n" +
      "*Total: " + fmt(tt.t) + "* (" + tt.n + (tt.n === 1 ? " vape" : " vapes") + ")\n\n" +
      "*Datos*\nNombre: " + val("#c-name") +
      "\nEntrega: " + entrega() +
      (entrega() === "Envío" ? "\nDirección: " + val("#c-addr") : "") +
      "\nMail: " + val("#c-mail") +
      (note ? "\n\nAclaraciones: " + note : "");
  }

  function updateSend() {
    var s = $("#send");
    if (!lines.length) return;
    if (missing().length) {
      s.href = "#";
      s.setAttribute("aria-disabled", "true");
    } else {
      s.href = wa(message());
      s.removeAttribute("aria-disabled");
      $("#hint").textContent = "";
    }
  }

  $("#datos").addEventListener("input", function (e) {
    if (e.target.classList) e.target.classList.remove("bad");
    store.set(DATA_KEY, {
      "c-name": val("#c-name"), "c-addr": val("#c-addr"), "c-mail": val("#c-mail"), entrega: entrega()
    });
    syncEntrega();
    updateSend();
  });
  $("#datos").addEventListener("change", function () { syncEntrega(); updateSend(); });
  $("#datos").addEventListener("submit", function (e) { e.preventDefault(); });

  $("#send").addEventListener("click", function (e) {
    var m = missing();
    if (m.length) {
      e.preventDefault();
      m.forEach(function (x) { x.el.classList.add("bad"); });
      $("#hint").textContent = "Falta completar: " + m.map(function (x) { return x.label; }).join(", ") + ".";
      m[0].el.focus();
    }
  });

  // ---------- clicks globales ----------
  document.addEventListener("click", function (e) {
    var chip = e.target.closest("[data-brand]");
    if (chip) {
      filter.brand = chip.getAttribute("data-brand");
      renderChips();
      renderCatalog();
      return;
    }
    var pk = e.target.closest("[data-pick]");
    if (pk) { openPick(pk.getAttribute("data-pick"), pk); return; }
    if (e.target.closest("[data-reset]")) {
      filter = { brand: "Todos", q: "", sort: filter.sort };
      $("#q").value = "";
      renderChips();
      renderCatalog();
    }
  });

  // ---------- toast y efectos ----------
  var toastTimer;
  function toast(text, color) {
    var t = $("#toast");
    t.innerHTML = '<i style="background:' + (color || "var(--violet)") + '"></i><span></span>';
    $("span", t).textContent = "Agregado: " + text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function bump() {
    var b = $("#open-cart");
    b.classList.remove("bump");
    void b.offsetWidth;
    b.classList.add("bump");
  }

  var top = $("#top");
  function onScroll() { top.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + "ms";
      io.observe(el);
    });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  // ---------- verificación de edad ----------
  var gate = $("#age"), ok = false;
  try { ok = sessionStorage.getItem("vhp-18") === "1"; } catch (err) {}
  gate.addEventListener("cancel", function (e) { e.preventDefault(); });
  $("#age-yes").addEventListener("click", function () {
    try { sessionStorage.setItem("vhp-18", "1"); } catch (err) {}
    closeDlg(gate);
  });
  $("#age-no").addEventListener("click", function () {
    $("#age-ask").hidden = true;
    $("#age-denied").hidden = false;
  });

  // ---------- inicio ----------
  renderChips();
  renderCatalog();
  renderCart();
  if (!ok) openDlg(gate);
})();
