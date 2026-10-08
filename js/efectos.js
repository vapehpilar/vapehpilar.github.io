/* =========================================================
   VHP · Efectos y animaciones
   Independiente de la tienda: si este archivo falla, la tienda
   sigue funcionando igual.
   ========================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- Portada: título palabra por palabra ----------
  var hero = $(".hero");
  // El título ya viene separado en palabras desde el HTML (así se pinta de entrada).
  if (hero) requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add("ready"); }); });

  // ---------- Vapor que sube ----------
  if (hero && !reduce) {
    var puffs = document.createElement("div");
    puffs.className = "puffs";
    puffs.setAttribute("aria-hidden", "true");
    var n = finePointer ? 14 : 8;
    for (var i = 0; i < n; i++) {
      var p = document.createElement("i");
      var s = 60 + Math.random() * 140;
      p.style.cssText = "--s:" + s + "px;--x:" + (Math.random() * 100) + "%;--d:" + (12 + Math.random() * 14) + "s;--dl:-" +
        (Math.random() * 20) + "s;--dx:" + (Math.random() * 160 - 80) + "px";
      puffs.appendChild(p);
    }
    hero.appendChild(puffs);
  }

  // ---------- Números de la portada que cuentan ----------
  function countUp(el, to, prefix, suffix) {
    if (reduce) return;
    var start = null, dur = 1400;
    function step(t) {
      if (!start) start = t;
      var k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = prefix + Math.round(to * e) + suffix;
      if (k < 1) requestAnimationFrame(step);
    }
    el.textContent = prefix + "0" + suffix;
    setTimeout(function () { requestAnimationFrame(step); }, 800);
  }
  $$(".stats strong").forEach(function (el) {
    var m = el.textContent.match(/^(\D*)(\d+)(\D*)$/);
    if (m) countUp(el, +m[2], m[1], m[3]);
  });

  // ---------- Barra de progreso + parallax ----------
  var bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var floats = $$(".hero-art .float");
  var wide = window.matchMedia("(min-width: 860px)");
  wide.addEventListener && wide.addEventListener("change", function () {
    if (!wide.matches) floats.forEach(function (f) { f.style.translate = ""; });
  });
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? scrollY / h : 0) + ")";
      // Parallax solo en pantallas anchas: en celular los vapes están debajo del texto
      // y, si suben, lo tapan.
      if (!reduce && floats.length && wide.matches && scrollY < innerHeight * 1.2) {
        floats.forEach(function (f, i) { f.style.translate = "0 " + (-scrollY * (0.12 + i * 0.07)) + "px"; });
      }
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Los vapes de la portada siguen un poco al mouse
  var art = $(".hero-art");
  if (art && finePointer && !reduce) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      floats.forEach(function (f, i) {
        var d = (i + 1) * 10;
        f.style.marginLeft = (x * d) + "px";
        f.style.marginTop = (y * d) + "px";
      });
      var orb = $(".orb", art);
      if (orb) orb.style.transform = "translate(" + (x * -14) + "px," + (y * -14) + "px)";
    });
  }

  // ---------- Tarjetas: brillo y leve inclinación (solo mouse) ----------
  if (finePointer && !reduce) {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".card");
      $$(".card.lit").forEach(function (c) { if (c !== card) reset(c); });
      if (!card) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty("--mx", x * 100 + "%");
      card.style.setProperty("--my", y * 100 + "%");
      card.classList.add("lit", "tilt");
      card.style.transform = "perspective(800px) translateY(-4px) rotateX(" + ((0.5 - y) * 6) + "deg) rotateY(" + ((x - 0.5) * 8) + "deg)";
    });
    document.addEventListener("pointerleave", function () { $$(".card.lit").forEach(reset); });
  }
  function reset(c) {
    c.classList.remove("lit", "tilt");
    c.style.transform = "";
  }

  // ---------- Halo que sigue al cursor ----------
  if (finePointer && !reduce) {
    var halo = document.createElement("div");
    halo.className = "halo";
    halo.setAttribute("aria-hidden", "true");
    document.body.appendChild(halo);
    var hx = 0, hy = 0, tx = 0, ty = 0, running = false;
    document.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      halo.classList.add("on");
      if (!running) { running = true; requestAnimationFrame(follow); }
    });
    document.addEventListener("pointerleave", function () { halo.classList.remove("on"); });
    var follow = function () {
      hx += (tx - hx) * 0.15; hy += (ty - hy) * 0.15;
      halo.style.transform = "translate(" + hx + "px," + hy + "px)";
      if (Math.abs(tx - hx) + Math.abs(ty - hy) > 0.5) requestAnimationFrame(follow);
      else running = false;
    };
  }

  // ---------- Ondas al tocar ----------
  if (!reduce) {
    document.addEventListener("pointerdown", function (e) {
      var b = e.target.closest && e.target.closest(".btn, .add, .bar-btn, .chip, .cart-btn");
      if (!b) return;
      var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
      var rip = document.createElement("span");
      rip.className = "ripple";
      rip.style.cssText = "width:" + d + "px;height:" + d + "px;left:" + (e.clientX - r.left - d / 2) + "px;top:" + (e.clientY - r.top - d / 2) + "px";
      b.appendChild(rip);
      setTimeout(function () { rip.remove(); }, 650);
    });
  }

  // ---------- Al agregar: el producto vuela al carrito ----------
  document.addEventListener("vhp:add", function (e) {
    var target = $("#open-cart");
    var count = $("#count");
    if (count) { count.classList.remove("pop"); void count.offsetWidth; count.classList.add("pop"); }
    if (reduce || !target) return;
    var src = $('[data-card="' + e.detail.pid + '"] .card-art img, [data-card="' + e.detail.pid + '"] .card-art svg');
    if (!src) return;
    var a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) {
      // Si la tarjeta no está a la vista, sale desde el centro de la pantalla
      a = { left: innerWidth / 2 - 50, top: innerHeight / 2 - 60, width: 100, height: 120 };
    }
    var fly = document.createElement("div");
    fly.className = "fly";
    fly.style.cssText = "left:" + a.left + "px;top:" + a.top + "px;width:" + a.width + "px;height:" + a.height + "px";
    fly.appendChild(src.cloneNode(true));
    document.body.appendChild(fly);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var anim = fly.animate([
      { transform: "translate(0,0) scale(1) rotate(0)", opacity: 1 },
      { transform: "translate(" + dx * 0.35 + "px," + (dy * 0.35 - 80) + "px) scale(.7) rotate(-12deg)", opacity: 1, offset: 0.45 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.12) rotate(-30deg)", opacity: 0.4 }
    ], { duration: 850, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = function () {
      fly.remove();
      burst(b.left + b.width / 2, b.top + b.height / 2, e.detail.color);
    };
  });

  // ---------- Al abrir un producto: la foto sale de la tarjeta y se agranda ----------
  document.addEventListener("vhp:open", function (e) {
    if (reduce) return;
    var card = e.detail.trigger && e.detail.trigger.closest && e.detail.trigger.closest(".card");
    var src = card && $(".card-art img, .card-art svg", card);
    var dlg = $("#pick"), dest = $("#pick-art");
    if (!src || !dlg || !dest) return;
    var a = src.getBoundingClientRect();
    if (!a.width || a.bottom < 0 || a.top > innerHeight) return;
    // La ventana aparece en su lugar (con un fundido) y la foto viaja desde la tarjeta.
    // El recorte va dentro de la ventana porque la ventana siempre queda por encima de todo.
    dlg.style.animation = "none";
    var target = $("img, svg", dest);
    var b = (target || dest).getBoundingClientRect();
    if (!b.width) { dlg.style.animation = ""; return; }
    var inner = $(".sheet-in", dlg);
    if (inner) inner.animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "ease-out" });
    var clone = document.createElement("div");
    clone.className = "zoom-clone";
    clone.style.cssText = "left:" + a.left + "px;top:" + a.top + "px;width:" + a.width + "px;height:" + a.height + "px;transform-origin:0 0";
    clone.appendChild(src.cloneNode(true));
    dlg.appendChild(clone);
    dest.classList.add("zooming");
    var sx = b.width / a.width, sy = b.height / a.height;
    var anim = clone.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(" + (b.left - a.left) + "px," + (b.top - a.top) + "px) scale(" + sx + "," + sy + ")" }
    ], { duration: 440, easing: "cubic-bezier(.2,.8,.2,1)" });
    function cleanup() { clone.remove(); dest.classList.remove("zooming"); }
    anim.onfinish = anim.oncancel = cleanup;
    dlg.addEventListener("close", function done() {
      cleanup();
      dlg.style.animation = "";
      dlg.removeEventListener("close", done);
    });
  });

  function burst(x, y, color) {
    for (var i = 0; i < 12; i++) {
      var s = document.createElement("i");
      var ang = (Math.PI * 2 * i) / 12, dist = 26 + Math.random() * 26;
      s.className = "spark";
      s.style.cssText = "left:" + (x - 4) + "px;top:" + (y - 4) + "px;--tx:" + Math.cos(ang) * dist + "px;--ty:" + Math.sin(ang) * dist + "px;--c:" +
        (i % 2 ? (color || "#c7bbf0") : "#e59bd0");
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 750);
    }
  }

  // ---------- Revelado de títulos y pasos ----------
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    $$(".sec-head").forEach(function (el) { io.observe(el); });
  } else {
    $$(".sec-head").forEach(function (el) { el.classList.add("in"); });
  }
})();
