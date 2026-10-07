/* =========================================================
   VHP · Vape House Pilar · Lógica de la tienda
   Los datos (productos, precios, WhatsApp) están en js/productos.js
   ========================================================= */
(function () {
  "use strict";

  if (!window.VHP_PRODUCTOS || !window.VHP_CONFIG) {
    var cat = document.getElementById("catalog");
    if (cat) cat.innerHTML = '<li class="empty"><p>No pudimos cargar los productos. Revisá tu conexión y recargá la página.</p>' +
      '<button class="btn ghost" type="button" onclick="location.reload()">Recargar</button></li>';
    var g = document.getElementById("age");
    var y = document.getElementById("age-yes");
    if (g && y) { y.onclick = function () { g.close(); }; g.showModal(); }
    return;
  }
  var CFG = window.VHP_CONFIG;
  var BRAND_COLOR = window.VHP_MARCAS;
  var PRODUCTS = window.VHP_PRODUCTOS.map(function (p, i) {
    p.id = "p" + i;
    p.order = i;
    return p;
  });
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
  function tint(p) { return p.color || brandColor(p); }

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
    // Si falta la versión chica (-sm), se usa la foto grande antes de rendirse.
    if (el.hasAttribute("srcset")) { el.removeAttribute("srcset"); el.src = el.getAttribute("src"); return; }
    noPhoto[pid] = true;
    el.outerHTML = drawing(byId[pid]);
  }, true);

  // sizes: ancho con el que se muestra la foto, para que el navegador elija la versión justa.
  var CARD_SIZES = "(min-width: 1080px) 260px, (min-width: 860px) 31vw, 46vw";
  function art(p, sizes, eager) {
    var src = p.id && !noPhoto[p.id] ? photoOf(p) : "";
    if (!src) return drawing(p);
    var set = p.img ? "" : ' srcset="' + esc(src.replace(/\.webp$/, "-sm.webp")) + " 400w, " + esc(src) + ' 600w" sizes="' + (sizes || CARD_SIZES) + '"';
    return '<img src="' + esc(src) + '"' + set + ' width="600" height="720" alt="' + esc(p.marca + " " + p.nombre) + '" data-photo="' + p.id + '" loading="' + (eager ? "eager" : "lazy") + '" decoding="async">';
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
      return l && byId[l.pid] && typeof l.flavor === "string" && l.qty > 0;
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

  // ---------- analíticas (GoatCounter) ----------
  // Cuenta visitas sin cookies. Las ve solo el dueño, desde el panel secreto.
  function track(path, title) {
    if (window.goatcounter && window.goatcounter.count) {
      try { window.goatcounter.count({ path: path, title: title || path, event: true }); } catch (e) {}
    }
  }
  if (CFG.goatcounter) {
    // Se carga cuando la página ya terminó, para no competir con lo que ve el cliente.
    var loadGc = function () {
      var gc = document.createElement("script");
      gc.async = true;
      gc.src = "https://gc.zgo.at/count.js";
      gc.setAttribute("data-goatcounter", "https://" + CFG.goatcounter + ".goatcounter.com/count");
      document.head.appendChild(gc);
    };
    if (document.readyState === "complete") loadGc();
    else window.addEventListener("load", function () { setTimeout(loadGc, 300); });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-wa]");
    if (a) track("consulta-whatsapp", "Consulta por WhatsApp");
  });

  // Acceso secreto al panel: 5 toques seguidos en la firma del pie.
  (function () {
    var credit = $(".credit"), taps = 0, timer;
    if (!credit || !CFG.panel) return;
    credit.addEventListener("click", function () {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(function () { taps = 0; }, 1500);
      if (taps >= 5) location.href = CFG.panel;
    });
  })();
  $("#year").textContent = new Date().getFullYear();
  $("#stat-models").textContent = PRODUCTS.length;
  $("#stat-brands").textContent = BRANDS.length;

  // ---------- hero ----------
  (function heroArt() {
    var byName = {};
    PRODUCTS.forEach(function (p) { byName[norm(p.marca + " " + p.nombre)] = p; });
    var first = (CFG.portada || []).map(function (n) { return byName[norm(n)]; }).filter(Boolean);
    // Orden de rotación: primero los de la portada, después el resto del catálogo.
    var order = first.concat(PRODUCTS.filter(function (p) { return first.indexOf(p) < 0; }));
    var slots = ["#hero-v1", "#hero-v2", "#hero-v3"].map(function (s) { return $(s); });
    var pos = 0;
    function show(start, animate) {
      slots.forEach(function (el, i) {
        var p = order[(start + i) % order.length];
        var put = function () {
          el.style.setProperty("--pc", tint(p));
          el.innerHTML = art(p, i === 1 ? "200px" : "160px", true);
          el.setAttribute("data-hero", p.id);
        };
        if (!animate) return put();
        setTimeout(function () {
          el.classList.add("swap");
          setTimeout(function () {
            put();
            var img = $("img", el);
            var reveal = function () { el.classList.remove("swap"); };
            if (img && !img.complete) { img.onload = reveal; img.onerror = reveal; setTimeout(reveal, 900); } else reveal();
          }, 450);
        }, i * 140);
      });
    }
    show(0, false);
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || order.length <= 3) return;
    var heroEl = $(".hero"), visible = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(heroEl);
    }
    setInterval(function () {
      if (document.hidden || !visible) return;
      pos = (pos + 3) % order.length;
      show(pos, true);
    }, 5500);
  })();

  // ---------- cinta con fotos ----------
  (function ticker() {
    var track = $(".ticker-track");
    if (!track) return;
    var items = PRODUCTS.map(function (p) {
      return '<button class="tk" type="button" data-pick="' + p.id + '" tabindex="-1" style="--pc:' + tint(p) + '">' +
        '<span class="tk-img">' + art(p, "60px") + "</span>" +
        '<span class="tk-name"><small>' + esc(p.marca) + "</small>" + esc(p.nombre) + "</span></button>";
    }).join('<span class="tk-sep">✦</span>');
    // Dos copias seguidas para que la cinta no tenga cortes.
    track.innerHTML = items + '<span class="tk-sep">✦</span>' + items + '<span class="tk-sep">✦</span>';
    track.classList.add("with-photos");
    track.style.animationDuration = PRODUCTS.length * 4.5 + "s";
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
    return '<li class="card" style="--c:' + brandColor(p) + ";--pc:" + tint(p) + ";--i:" + i + '" data-card="' + p.id + '">' +
      '<button class="card-art" type="button" data-pick="' + p.id + '" aria-label="Agregar ' + esc(name) + '">' +
      art(p) + puffTag + tag + '<span class="badge-slot">' + badge(p.id) + "</span></button>" +
      '<div class="card-body">' +
      '<p class="card-brand">' + esc(p.marca) + "</p>" +
      '<h3 class="card-name">' + esc(p.nombre) + "</h3>" +
      '<p class="card-meta">' + meta + "</p>" +
      '<div class="card-row"><span class="price">' + fmt(p.precio) + "</span>" +
      '<button class="add" type="button" data-pick="' + p.id + '" aria-label="Agregar ' + esc(name) + ' al pedido">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Agregar</span></button>' +
      "</div></div></li>";
  }

  function renderCatalog() {
    var list = visibleProducts();
    var grid = $("#catalog"), before = {};
    var animate = grid.children.length && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Guardamos dónde estaba cada tarjeta para deslizarla a su nuevo lugar.
    if (animate) $$("[data-card]", grid).forEach(function (c) { before[c.getAttribute("data-card")] = c.getBoundingClientRect(); });
    grid.innerHTML = list.length
      ? list.map(card).join("")
      : '<li class="empty"><p>No encontramos productos con esa búsqueda.</p><button class="btn ghost" type="button" data-reset>Ver todos</button></li>';
    $("#result-count").textContent = list.length === 1 ? "1 producto" : list.length + " productos";
    if (!animate) return;
    var fresh = 0;
    $$("[data-card]", grid).forEach(function (c) {
      var old = before[c.getAttribute("data-card")];
      if (!old) {
        c.style.animation = "none";
        c.animate([{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }],
          { duration: 380, delay: 120 + fresh++ * 40, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" });
        return;
      }
      var now = c.getBoundingClientRect();
      var dx = old.left - now.left, dy = old.top - now.top;
      c.style.animation = "none";
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      c.animate([{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }],
        { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
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
    $(".pick-head", pickDlg).style.setProperty("--pc", tint(p));
    $("#pick-art").innerHTML = art(p, "100px");
    $("#pick-brand").textContent = p.marca;
    $("#pick-title").textContent = p.nombre;
    $("#pick-meta").textContent = p.pitadas ? num(p.pitadas) + " pitadas · Descartable" : "Descartable";
    $("#pick-price").innerHTML = fmt(p.precio) + " <small>c/u</small>";
    $("#flavor-pref").value = "";
    updatePick();
    openDlg(pickDlg);
    document.dispatchEvent(new CustomEvent("vhp:open", { detail: { pid: pid, trigger: trigger } }));
    $("#pick-add").focus({ preventScroll: true });
    $(".sheet-in", pickDlg).scrollTop = 0;
    track("visto/" + slugOf(p), "Visto: " + p.marca + " " + p.nombre);
    track("embudo/vio-producto", "Embudo: vio un producto");
    // La dirección pasa a ser el link directo de este vape (para copiar o compartir).
    try { history.replaceState(null, "", "#" + slugOf(p)); } catch (e) {}
  }

  // ---------- links directos: vapehpilar.github.io/#elfbar-summer ----------
  function slugOf(p) { return slug(p.marca + " " + p.nombre); }
  function linkOf(p) { return location.origin + location.pathname + "#" + slugOf(p); }
  function pidFromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    for (var i = 0; i < PRODUCTS.length; i++) if (slugOf(PRODUCTS[i]) === h) return PRODUCTS[i].id;
    return null;
  }
  function openFromHash(fromLink) {
    var pid = pidFromHash();
    if (!pid || pickDlg.open) return;
    var gateEl = $("#age");
    if (gateEl.open) {
      gateEl.addEventListener("close", function once() { gateEl.removeEventListener("close", once); openFromHash(fromLink); });
      return;
    }
    if (filter.brand !== "Todos" || filter.q) {
      filter.brand = "Todos"; filter.q = ""; $("#q").value = "";
      renderChips(); renderCatalog();
    }
    var card = $('[data-card="' + pid + '"]');
    if (card) card.scrollIntoView({ block: "center", behavior: "instant" });
    if (fromLink) track("link-directo/" + slugOf(byId[pid]), "Link directo: " + byId[pid].marca + " " + byId[pid].nombre);
    openPick(pid, card ? $(".add", card) : null);
  }
  window.addEventListener("hashchange", function () { openFromHash(true); });
  pickDlg.addEventListener("close", function () {
    if (pidFromHash()) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  });

  $("#pick-share").addEventListener("click", function () {
    var p = byId[pick.pid], url = linkOf(p);
    var title = p.marca + " " + p.nombre + " · " + CFG.tienda;
    track("compartido/" + slugOf(p), "Compartido: " + p.marca + " " + p.nombre);
    if (navigator.share) {
      navigator.share({ title: title, text: title + " " + fmt(p.precio), url: url }).catch(function () {});
      return;
    }
    // El aviso va sobre el mismo botón: la ventana tapa los avisos comunes.
    var btn = $("#pick-share");
    var done = function () {
      btn.classList.add("copied");
      btn.setAttribute("aria-label", "Link copiado");
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.classList.remove("copied"); btn.setAttribute("aria-label", "Compartir este vape"); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { prompt("Copiá el link:", url); });
    else prompt("Copiá el link:", url);
  });

  // El botón "Agregar" de la tarjeta se transforma en un ✓ por un momento.
  function confirmAdd(pid) {
    var b = $('[data-card="' + pid + '"] .add');
    if (!b) return;
    var label = $("span", b), icon = $("svg path", b);
    b.classList.add("done");
    if (label) label.textContent = "Agregado";
    if (icon) icon.setAttribute("d", "M5 12.5l4.5 4.5L19 7.5");
    clearTimeout(b._t);
    b._t = setTimeout(function () {
      b.classList.remove("done");
      if (label) label.textContent = "Agregar";
      if (icon) icon.setAttribute("d", "M12 5v14M5 12h14");
    }, 1500);
  }

  function updatePick() {
    var p = byId[pick.pid];
    $("#pick-qty").textContent = pick.qty;
    $("#pick-dec").disabled = pick.qty <= 1;
    $("#pick-sum").textContent = fmt(p.precio * pick.qty);
  }

  $("#pick-dec").addEventListener("click", function () { if (pick.qty > 1) { pick.qty--; updatePick(); } });
  $("#pick-inc").addEventListener("click", function () { pick.qty++; updatePick(); });

  $("#pick-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var flavor = $("#flavor-pref").value.trim();
    var p = byId[pick.pid];
    addLine(pick.pid, flavor, pick.qty);
    closeDlg(pickDlg);
    confirmAdd(pick.pid);
    renderCart();
    refreshBadges();
    bump();
    track("agregado/" + slugOf(p), "Agregado: " + p.marca + " " + p.nombre);
    track("embudo/agrego", "Embudo: agregó al pedido");
    document.dispatchEvent(new CustomEvent("vhp:add", { detail: { pid: p.id, color: tint(p) } }));
    toast(pick.qty + " × " + p.marca + " " + p.nombre + (flavor ? " · " + flavor : ""), brandColor(p));
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  });

  // ---------- carrito ----------
  var cartDlg = $("#cart");

  function itemHtml(l, i) {
    var p = byId[l.pid];
    return '<li class="item" style="--c:' + brandColor(p) + ";--pc:" + tint(p) + '">' +
      '<div class="item-art">' + art(p, "60px") + "</div>" +
      '<div><p class="item-name">' + esc(p.marca + " " + p.nombre) + "</p>" +
      '<p class="item-flavor">' + (l.flavor ? "Sabor: " + esc(l.flavor) : "Sabor a confirmar") + "</p></div>" +
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
      '<li><button class="add-more" type="button" data-more>+ Agregar otro vape</button></li>';
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
  ["c-name", "c-addr"].forEach(function (id) { if (saved[id]) $("#" + id).value = saved[id]; });
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
    return m;
  }

  function message() {
    var items = lines.map(function (l) {
      var p = byId[l.pid];
      return "• " + l.qty + " × " + p.marca + " " + p.nombre + " — " + (l.flavor ? "sabor " + l.flavor : "sabor a confirmar") + " (" + fmt(l.qty * p.precio) + ")";
    });
    var note = val("#note");
    var tt = totals();
    return "Hola! Quiero hacer este pedido en " + CFG.tienda + ":\n\n" +
      "*Pedido*\n" + items.join("\n") + "\n\n" +
      "*Total: " + fmt(tt.t) + "* (" + tt.n + (tt.n === 1 ? " vape" : " vapes") + ")\n\n" +
      "*Datos*\nNombre: " + val("#c-name") +
      "\nEntrega: " + entrega() +
      (entrega() === "Envío" ? "\nDirección: " + val("#c-addr") : "") +
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
      "c-name": val("#c-name"), "c-addr": val("#c-addr"), entrega: entrega()
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
      return;
    }
    var tt = totals();
    track("pedido-enviado", "Pedido enviado por WhatsApp");
    track("pedido-unidades/" + tt.n, "Pedido de " + tt.n + (tt.n === 1 ? " vape" : " vapes"));
    track("pedido-monto/" + tt.t, "Pedido de " + fmt(tt.t));
    lines.forEach(function (l) { track("pedido-producto/" + slugOf(byId[l.pid]), "Pedido: " + byId[l.pid].marca + " " + byId[l.pid].nombre); });
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
  function toast(text, color, raw) {
    var t = $("#toast");
    t.innerHTML = '<i style="background:' + (color || "var(--violet)") + '"></i><span></span>';
    $("span", t).textContent = raw ? text : "Agregado: " + text;
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

  var top = $("#top"), fab = $(".fab"), hero = $(".hero"), heroH = hero.offsetHeight;
  window.addEventListener("resize", function () { heroH = hero.offsetHeight; }, { passive: true });
  function onScroll() {
    top.classList.toggle("scrolled", window.scrollY > 8);
    // El botón flotante aparece recién después de la portada (ahí ya hay botones de WhatsApp).
    fab.classList.toggle("away", window.scrollY < heroH * 0.6);
  }
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
  openFromHash(true);
})();
