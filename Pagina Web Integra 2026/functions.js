/* ==========================================================
   Huellas en el Alma · Fundación Mujer Linda Cats
   Lógica del sitio. Todo lo editable está en CONFIG y DATA.
   ========================================================== */
(function () {
  "use strict";

  /* ---------- CONFIGURACIÓN (editar aquí) ---------- */
  var CONFIG = {
    kitPrice: 45000,          // PLACEHOLDER: precio real del Kit (COP)
    weeksPerKit: 2,           // semanas de arena sanitaria que financia cada kit donado
    donationAmounts: [20000, 50000, 100000],
    minDonation: 5000,
    metricsUrl: "https://script.google.com/macros/s/AKfycbyps_oJP59cajjqRNlAl4iMjqD1p8tEVwy9xIqgGXWNGoNGZKFxWoRYEKJOBJyflafP/exec",           // URL de tu API (JSON) con las métricas reales. Ver loadMetrics()
    endpoints: {              // Cuando tengas backend, pon aquí las URLs (POST JSON)
      order: "https://script.google.com/macros/s/AKfycbyps_oJP59cajjqRNlAl4iMjqD1p8tEVwy9xIqgGXWNGoNGZKFxWoRYEKJOBJyflafP/exec",
      adoption: "https://script.google.com/macros/s/AKfycbyps_oJP59cajjqRNlAl4iMjqD1p8tEVwy9xIqgGXWNGoNGZKFxWoRYEKJOBJyflafP/exec",
      volunteer: "https://script.google.com/macros/s/AKfycbyps_oJP59cajjqRNlAl4iMjqD1p8tEVwy9xIqgGXWNGoNGZKFxWoRYEKJOBJyflafP/exec"
    },
    // DATOS DE DEMOSTRACIÓN: reemplazar por cifras reales o por la respuesta de metricsUrl
    metrics: { cats: 0, adopted: 0, kitsDelivered: 0, goalKits: 85, goalDone: 0, updated: "" }
  };

  /* ---------- DATOS (reemplazar por los gatos y campañas reales) ---------- */
  var CATS = [
    { id: 1, name: "Rocky", age: "adulto", ageLabel: "Adulto · 6 años", act: "tranquilo", compat: ["ninos", "gatos", "apto"], special: false, urgent: true,  img: "Images/Cuidalo6.jpg", bio: "Cariñoso y observador. Disfruta de las siestas. Ideal para un hogar sereno." },
    { id: 2, name: "Chester", age: "joven",  ageLabel: "Joven · 1 año",  act: "energico", compat: ["ninos", "gatos", "perros"], special: false, urgent: true,  img: "Images/Juega.jpg", bio: "Juguetón y curioso. Necesita espacio para trepar y una familia con ganas de jugar." },
    { id: 3, name: "Sombra", age: "cachorro", ageLabel: "Sombra · 4 meses", act: "energico", compat: ["ninos", "gatos", "apto"], special: false, urgent: false, img: "Images/Sombra.jpg", bio: "Pequeño explorador, ya come solo y usa su arenero. Aprende rápido y busca mimos." },
    { id: 4, name: "Rolo", age: "senior", ageLabel: "Senior · 9 años", act: "tranquilo", compat: ["apto"], special: true,  urgent: true,  img: "Images/Salva34.png", bio: "Un caballero sereno que requiere control veterinario constante. Entrega un amor profundo y paciente." },
    { id: 5, name: "Pelusa", age: "adulto", ageLabel: "Adulto · 5 años", act: "moderado", compat: ["gatos", "perros", "apto"], special: false, urgent: false, img: "Images/Pelusa.jpeg", bio: "Equilibrado y sociable. Convive bien con otros animales y se adapta fácil a rutinas." },
    { id: 6, name: "Mailo", age: "joven",  ageLabel: "Joven · 2 años", act: "moderado", compat: ["ninos", "apto"], special: true, urgent: false, img: "Images/ADOPTA5.jpg", bio: "Se recupera de una condición manejable con medicación sencilla. Merece un hogar paciente." }
  ];

  var CAMPAIGNS = [
    { title: "Operación Arenero Limpio", img: "Images/Hazlo%20parte%20de%20tu%20familia8.jpg", goal: 3000000, raised: 0, text: "Arena sanitaria y desinfección para todo el refugio durante el trimestre." },
    { title: "Salud para los senior", img: "Images/Dormir.jpg", goal: 2000000, raised: 0, text: "Chequeos y tratamientos para los gatos mayores en espera de hogar." }
  ];

  var POSTS = [
    { cat: "Cuidado felino", title: "Cómo preparar tu casa para un gato recién adoptado", text: "Primeros días: espacio seguro, rutina y paciencia." },
    { cat: "Cuidado Animal", title: "Higiene: qué sí y qué no", text: "Guía práctica para cuidar el pelaje y la piel de tu mascota." },
    { cat: "Fundación", title: "Así rendimos cuentas cada mes", text: "Dónde va cada peso y cómo puedes verlo." }
  ];

  /* ---------- UTILIDADES ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var cop = function (n) { return "$" + Math.round(n).toLocaleString("es-CO"); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function track(name, data) {            // Mide los KPIs: conecta GA4/GTM leyendo dataLayer
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, detail: data || {} });
  }

  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("show"); }, 3200);
  }

  function save(key, record) {            // Respaldo local mientras no exista backend
    try {
      var list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push(record);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) { /* almacenamiento no disponible */ }
  }

  function send(endpoint, key, record) {
  save(key, record);
  if (!endpoint) return Promise.resolve({ local: true });
  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ tipo: key }, record))
  })
  .then(function (r) { return r.json(); })
  .then(function (j) { if (!j.ok) throw new Error(j.error || "error"); return j; });
}

  function validate(scope) {
    var first = null;
    $$("input, select, textarea", scope).forEach(function (el) {
      if (el.closest("[hidden]") && el.closest("[hidden]") !== scope) { el.removeAttribute("aria-invalid"); return; }
      var ok = el.checkValidity();
      el.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok && !first) first = el;
    });
    if (first) { first.focus(); toast("Revisa los campos marcados"); }
    return !first;
  }

  /* ---------- NAVEGACIÓN ---------- */
  function initNav() {
    var btn = $("#navToggle"), nav = $("#mainNav");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open);
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });
    $$("a", nav).forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); });
    });
    // Resalta la sección visible
    var links = $$(".main-nav a[href^='#']:not(.btn)");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    links.forEach(function (l) { var s = $(l.getAttribute("href")); if (s) io.observe(s); });
  }

  /* ---------- MÉTRICAS EN VIVO ---------- */
  function countTo(el, target) {
    if (reduceMotion || target === 0) { el.textContent = target.toLocaleString("es-CO"); return; }
    var start = performance.now(), dur = 1200;
    (function step(now) {
      var p = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("es-CO");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  function renderMetrics(m) {
    var seen = false;
    function run() {
      if (seen) return; seen = true;
      countTo($("#mCats"), m.cats); countTo($("#mAdopted"), m.adopted); countTo($("#mKits"), m.kitsDelivered);
      var pct = m.goalKits ? Math.min(100, Math.round(m.goalDone / m.goalKits * 100)) : 0;
      $("#goalText").textContent = m.goalDone + " / " + m.goalKits + " kits";
      var bar = $("#goalBar");
      bar.setAttribute("aria-valuenow", pct);
      setTimeout(function () { $("span", bar).style.width = pct + "%"; }, 150);
    }
    $("#impactUpdated").textContent = m.updated || new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long" });
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { run(); io.disconnect(); } }, { threshold: .3 });
    io.observe($(".impact-strip"));
  }

  function loadMetrics() {
    if (!CONFIG.metricsUrl) return renderMetrics(CONFIG.metrics);
    fetch(CONFIG.metricsUrl).then(function (r) { return r.json(); })
      .then(function (m) { renderMetrics(Object.assign({}, CONFIG.metrics, m)); })
      .catch(function () { renderMetrics(CONFIG.metrics); });
  }

  /* ---------- IMPACTO ---------- */
  function impactText(mode, qty) {
    if (mode === "donate") {
      var w = qty * CONFIG.weeksPerKit;
      return "Con tu aporte financias <strong>" + w + " semanas de arena sanitaria</strong> para el refugio. Recibirás reporte de entrega.";
    }
    return "Cuidas la higiene de tu mascota y <strong>apoyas el trabajo del refugio</strong> con cada compra.";
  }
  function donationImpact(amount) {
    var w = Math.floor(amount / CONFIG.kitPrice * CONFIG.weeksPerKit);
    return w >= 1
      ? "Tu aporte equivale a <strong>" + w + (w === 1 ? " semana" : " semanas") + " de arena sanitaria</strong> para el refugio."
      : "Cada aporte suma al <strong>cuidado diario</strong> de los gatos del refugio.";
  }

  /* ---------- ESTADO DE LA ORDEN ---------- */
  var order = { type: "kit", mode: "personal", qty: 1, amount: 0, recurring: false, label: "" };

  function orderTotal() { return order.type === "kit" ? order.qty * CONFIG.kitPrice : order.amount; }

  function renderOrder() {
    var total = orderTotal();
    var rows = "";
    if (order.type === "kit") {
      rows += "<dt>Kit de Aseo × " + order.qty + "</dt><dd>" + cop(total) + "</dd>";
      rows += "<dt>Destino</dt><dd>" + (order.mode === "donate" ? "Donación al refugio" : "Para tu Mascota") + "</dd>";
    } else {
      rows += "<dt>" + esc(order.label) + (order.recurring ? " (mensual)" : "") + "</dt><dd>" + cop(total) + "</dd>";
    }
    rows += '<dt class="total">Total</dt><dd class="total">' + cop(total) + "</dd>";
    $("#orderSummary").innerHTML = rows;
    $("#orderImpact").innerHTML = order.type === "kit" ? impactText(order.mode, order.qty) : donationImpact(total);
    $("#payBtn").textContent = total ? "Pagar " + cop(total) + (order.recurring ? " / mes" : "") : "Pagar";
    // La dirección solo se pide si el kit es para uso personal
    var ship = order.type === "kit" && order.mode === "personal";
    $("#shippingFields").hidden = !ship;
    $("#coAddr").required = ship; $("#coCity").required = ship;
  }

  /* ---------- TIENDA ---------- */
  function setKitMode(mode) {
    order.mode = mode;
    var r = $('input[name="kitMode"][value="' + mode + '"]');
    if (r) r.checked = true;
    refreshShop();
  }

  function refreshShop() {
    order.type = "kit"; order.label = "Kit de Aseo Solidario";
    $("#qtyValue").textContent = order.qty;
    $("#subtotal").textContent = cop(order.qty * CONFIG.kitPrice);
    $("#impactCalc").innerHTML = impactText(order.mode, order.qty);
    $("#goCheckout").textContent = order.mode === "donate" ? "Dona un Kit de Aseo hoy" : "Continuar al pago";
    renderOrder();
  }

  function initShop() {
    $("#unitPrice").textContent = cop(CONFIG.kitPrice);
    $$('input[name="kitMode"]').forEach(function (r) { r.addEventListener("change", function () { setKitMode(r.value); track("kit_modo", { mode: r.value }); }); });
    $("#qtyMinus").addEventListener("click", function () { order.qty = Math.max(1, order.qty - 1); refreshShop(); });
    $("#qtyPlus").addEventListener("click", function () { order.qty = Math.min(50, order.qty + 1); refreshShop(); });
    $("#goCheckout").addEventListener("click", function () { refreshShop(); });
    $$("[data-kit-mode]").forEach(function (a) { a.addEventListener("click", function () { setKitMode(a.getAttribute("data-kit-mode")); }); });

    // Showcase del Home con toggle de impacto
    var mode = "personal";
    function showcase() {
      $$("#showToggle button").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.mode === mode); });
      $("#showImpact").innerHTML = impactText(mode, 1);
      $("#showCta").textContent = mode === "donate" ? "Dona un Kit de Aseo hoy" : "Comprar para mi mascota";
    }
    $$("#showToggle button").forEach(function (b) { b.addEventListener("click", function () { mode = b.dataset.mode; setKitMode(mode); showcase(); }); });
    $("#showCta").addEventListener("click", function () { setKitMode(mode); });
    showcase();
    refreshShop();
  }

  /* ---------- DONACIÓN MONETARIA ---------- */
  function initDonation() {
    var wrap = $("#amounts"), custom = $("#customAmount"), amount = CONFIG.donationAmounts[1];
    wrap.innerHTML = CONFIG.donationAmounts.map(function (a) {
      return '<button type="button" role="radio" aria-checked="' + (a === amount) + '" data-a="' + a + '">' + cop(a) + "</button>";
    }).join("");
    function paint() {
      $$("#amounts button").forEach(function (b) { b.setAttribute("aria-checked", Number(b.dataset.a) === amount && !custom.value); });
      $("#donImpact").innerHTML = donationImpact(amount);
    }
    wrap.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      amount = Number(b.dataset.a); custom.value = ""; paint();
    });
    custom.addEventListener("input", function () { var v = Number(custom.value); if (v >= CONFIG.minDonation) amount = v; paint(); });
    $("#donBtn").addEventListener("click", function () {
      if (custom.value && Number(custom.value) < CONFIG.minDonation) { custom.setAttribute("aria-invalid", "true"); custom.focus(); toast("El mínimo es " + cop(CONFIG.minDonation)); return; }
      order = { type: "donation", mode: "donate", qty: 1, amount: amount, recurring: $("#recurring").checked, label: "Donación" };
      renderOrder(); track("donacion_checkout", { amount: amount, recurring: order.recurring });
      $("#checkout").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
    $("#recurBtn").addEventListener("click", function () { $("#recurring").checked = true; });
    $("#sponsorBtn").addEventListener("click", function () {
      order = { type: "donation", mode: "donate", qty: 1, amount: 60000, recurring: true, label: "Apadrinamiento" };
      renderOrder(); track("apadrinar_checkout");
      $("#checkout").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
    paint();
  }

  /* ---------- CHECKOUT ---------- */
  var lastReceipt = null;

  function initCheckout() {
    var form = $("#checkoutForm");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var total = orderTotal();
      if (!total) { toast("Elige un producto o un valor"); return; }
      var fd = new FormData(form);
      var rec = {
        id: "HEA-" + Date.now().toString(36).toUpperCase(),
        date: new Date().toISOString(),
        order: JSON.parse(JSON.stringify(order)), total: total,
        name: fd.get("name"), email: fd.get("email"), phone: fd.get("phone"), doc: fd.get("doc"),
        address: fd.get("address") || "", city: fd.get("city") || "", pay: fd.get("pay")
      };
      var btn = $("#payBtn"); btn.disabled = true; btn.textContent = "Procesando…";
      // INTEGRACIÓN DE PASARELA: aquí se crea la transacción con tu proveedor (PSE/Nequi/Daviplata/Tarjeta)
      // y solo al recibir "aprobado" se muestra la confirmación. Mientras tanto se registra la orden.
      send(CONFIG.endpoints.order, "huellas_pedidos", rec).then(function () {
        lastReceipt = rec;
        var isKit = rec.order.type === "kit";
        $("#payMsg").textContent = "Recibimos tu pedido, " + String(rec.name).split(" ")[0] + ". Te escribiremos a " + rec.email + " para confirmar el pago. Referencia: " + rec.id + ".";
        $("#payImpact").innerHTML = isKit ? impactText(rec.order.mode, rec.order.qty) : donationImpact(rec.total);
        $("#payDialog").showModal();
        track("compra_completada", { id: rec.id, total: total, type: rec.order.type, mode: rec.order.mode });
        form.reset(); refreshShop();
      }).catch(function () {
        toast("No pudimos registrar el pago. Intenta de nuevo.");
      }).then(function () { btn.disabled = false; renderOrder(); });
    });

    $("#receiptBtn").addEventListener("click", function () {
      if (!lastReceipt) return;
      var r = lastReceipt;
      var desc = r.order.type === "kit"
        ? "Kit de Aseo Solidario × " + r.order.qty + " (" + (r.order.mode === "donate" ? "donación al refugio" : "uso personal") + ")"
        : r.order.label + (r.order.recurring ? " mensual" : "");
      var html = '<!DOCTYPE html><html lang="es"><meta charset="utf-8"><title>Recibo ' + esc(r.id) + '</title>' +
        '<body style="font-family:Arial,sans-serif;max-width:640px;margin:40px auto;color:#3B1B32">' +
        '<h1 style="color:#60712C">Huellas en el Alma</h1><p>Fundación Mujer Linda Cats · Bogotá</p><hr>' +
        '<h2>Recibo / Certificado de aporte</h2>' +
        "<p><strong>Referencia:</strong> " + esc(r.id) + "</p>" +
        "<p><strong>Fecha:</strong> " + new Date(r.date).toLocaleString("es-CO") + "</p>" +
        "<p><strong>Aportante:</strong> " + esc(r.name) + " · Doc. " + esc(r.doc) + "</p>" +
        "<p><strong>Concepto:</strong> " + esc(desc) + "</p>" +
        "<p><strong>Valor:</strong> " + cop(r.total) + " COP</p>" +
        "<p><strong>Medio de pago:</strong> " + esc(r.pay) + "</p><hr>" +
        "<p>Gracias por dejar tu huella.</p></body></html>";
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      a.download = "recibo-" + r.id + ".html";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  }

  /* ---------- ADOPCIÓN ---------- */
  var COMPAT_LABEL = { ninos: "Niños", gatos: "Otros gatos", perros: "Perros", apto: "Apartamento" };
  var ACT_LABEL = { tranquilo: "Tranquilo", moderado: "Moderado", energico: "Enérgico" };
  var currentCat = null;

  function catCard(c) {
    var tags = '<span class="tag">' + esc(c.ageLabel) + '</span><span class="tag">' + ACT_LABEL[c.act] + "</span>";
    if (c.urgent) tags += '<span class="tag tag-urgent">Busca hogar pronto</span>';
    if (c.special) tags += '<span class="tag tag-special">Cuidados especiales</span>';
    return '<article class="cat-card"><img src="' + esc(c.img) + '" alt="' + esc(c.name) + ', gato en adopción" loading="lazy" width="400" height="220">' +
      '<div class="cat-body"><h3>' + esc(c.name) + '</h3><div class="tags">' + tags + "</div>" +
      "<p>" + esc(c.bio.split(".")[0]) + ".</p>" +
      '<button class="btn btn-outline btn-sm" data-cat="' + c.id + '">Conocer a ' + esc(c.name) + "</button></div></article>";
  }

  function renderCats() {
    var age = $("#fAge").value, act = $("#fAct").value, compat = $("#fCompat").value, special = $("#fSpecial").checked;
    var list = CATS.filter(function (c) {
      return (!age || c.age === age) && (!act || c.act === act) && (!compat || c.compat.indexOf(compat) > -1) && (!special || c.special);
    });
    $("#catGrid").innerHTML = list.map(catCard).join("");
    $("#emptyState").hidden = list.length > 0;
    $("#resultsCount").textContent = list.length + (list.length === 1 ? " peludito disponible" : " peluditos disponibles");
  }

  function openProfile(id) {
    currentCat = CATS.filter(function (c) { return c.id === id; })[0]; if (!currentCat) return;
    var c = currentCat;
    $("#pImg").src = c.img; $("#pImg").alt = c.name + ", gato en adopción";
    $("#pTitle").textContent = c.name;
    $("#pTags").innerHTML = '<span class="tag">' + esc(c.ageLabel) + '</span><span class="tag">' + ACT_LABEL[c.act] + "</span>" +
      c.compat.map(function (k) { return '<span class="tag">' + COMPAT_LABEL[k] + "</span>"; }).join("");
    $("#pBio").textContent = c.bio;
    $("#profileDialog").showModal();
    track("perfil_gato", { id: c.id });
  }

  var step = 1;
  function showStep(n) {
    step = n;
    $$("#adoptForm fieldset").forEach(function (f) { f.hidden = Number(f.dataset.step) !== n; });
    $$("#adoptSteps li").forEach(function (li, i) { li.classList.toggle("on", i < n); });
    $("#aPrev").hidden = n === 1; $("#aNext").hidden = n === 3; $("#aSend").hidden = n !== 3;
  }

  function initAdopt() {
    $("#urgentGrid").innerHTML = CATS.filter(function (c) { return c.urgent; }).slice(0, 3).map(catCard).join("");
    renderCats();
    ["fAge", "fAct", "fCompat", "fSpecial"].forEach(function (id) { $("#" + id).addEventListener("change", renderCats); });
    $("#filters").addEventListener("reset", function () { setTimeout(renderCats, 0); });
    $("#filters").addEventListener("submit", function (e) { e.preventDefault(); });

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]"); if (b) openProfile(Number(b.dataset.cat));
    });

    $("#pAdopt").addEventListener("click", function () {
      $("#profileDialog").close();
      $("#aSub").textContent = "Solicitud para: " + currentCat.name;
      $("#adoptForm").hidden = false; $("#adoptDone").hidden = true;
      showStep(1); $("#adoptDialog").showModal();
    });
    $("#aNext").addEventListener("click", function () {
      if (validate($('#adoptForm fieldset[data-step="' + step + '"]'))) showStep(step + 1);
    });
    $("#aPrev").addEventListener("click", function () { showStep(step - 1); });

    $("#adoptForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate($('#adoptForm fieldset[data-step="3"]'))) return;
      var fd = new FormData(e.target), rec = { cat: currentCat.name, catId: currentCat.id, date: new Date().toISOString() };
      fd.forEach(function (v, k) { rec[k] = v; });
      $("#aSend").disabled = true;
      send(CONFIG.endpoints.adoption, "huellas_solicitudes", rec).then(function () {
        e.target.hidden = true; $("#adoptDone").hidden = false;
        $("#adoptDoneMsg").textContent = "Gracias, " + String(rec.name).split(" ")[0] + ". Revisaremos tu solicitud para " + currentCat.name + " y te escribiremos a " + rec.email + ".";
        e.target.reset(); track("adopcion_enviada", { cat: currentCat.id });
      }).catch(function () { toast("No pudimos enviar tu solicitud. Intenta de nuevo."); })
        .then(function () { $("#aSend").disabled = false; });
    });
  }

  /* ---------- CAMPAÑAS Y BLOG ---------- */
  function initContent() {
    $("#campGrid").innerHTML = CAMPAIGNS.map(function (c) {
      var pct = Math.min(100, Math.round(c.raised / c.goal * 100));
      return '<article class="camp-card"><img src="' + esc(c.img) + '" alt="" loading="lazy" width="400" height="190">' +
        '<div class="camp-body"><h3>' + esc(c.title) + "</h3><p>" + esc(c.text) + "</p>" +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Avance de ' + esc(c.title) + '"><span style="width:' + pct + '%"></span></div>' +
        '<div class="camp-nums"><span><strong>' + cop(c.raised) + "</strong> recaudados</span><span>Meta " + cop(c.goal) + "</span></div>" +
        '<a href="#donar" class="btn btn-coral btn-sm">Aportar a esta campaña</a></div></article>';
    }).join("");
    $("#blogGrid").innerHTML = POSTS.map(function (p) {
      return '<article class="blog-card"><span class="cat">' + esc(p.cat) + "</span><h4>" + esc(p.title) + "</h4><p>" + esc(p.text) + "</p></article>";
    }).join("");
  }

  /* ---------- VOLUNTARIADO + DIÁLOGOS ---------- */
  function initDialogs() {
    document.addEventListener("click", function (e) {
      var o = e.target.closest("[data-open]"); if (o) $("#" + o.dataset.open).showModal();
      var c = e.target.closest("[data-close]"); if (c) c.closest("dialog").close();
      if (e.target.tagName === "DIALOG") e.target.close();   // clic en el fondo
    });
    $("#volForm").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(e.target)) return;
      var rec = { date: new Date().toISOString() };
      new FormData(e.target).forEach(function (v, k) { rec[k] = v; });
      send(CONFIG.endpoints.volunteer, "huellas_voluntarios", rec).then(function () {
        $("#volMsg").textContent = "¡Gracias! Te contactaremos pronto.";
        track("voluntario_enviado"); e.target.reset();
        setTimeout(function () { $("#volDialog").close(); $("#volMsg").textContent = ""; }, 1800);
      }).catch(function () { $("#volMsg").textContent = "No se pudo enviar. Intenta de nuevo."; });
    });
  }

  /* ---------- SEGUIMIENTO DE CTAs ---------- */
  function initTracking() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-track]"); if (t) track(t.dataset.track);
    });
  }

  /* ---------- INICIO ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initNav(); loadMetrics(); initShop(); initDonation(); initCheckout();
    initAdopt(); initContent(); initDialogs(); initTracking();
  });
})();
