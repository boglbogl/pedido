(() => {
  "use strict";
  const STORAGE_KEY = "boglbogl_pedido_v1";
 const productos = Array.isArray(window.PRODUCTOS)
  ? window.PRODUCTOS.filter(
      p => p.activo !== false && p.nombre.trim() !== ""
    )
  : [];
  const state = { categoria: "Todos", busqueda: "", cantidades: {}, trabajador: "", observaciones: "" };

  const $ = selector => document.querySelector(selector);
  const els = {
    trabajador: $("#trabajador"), buscador: $("#buscador"), categorias: $("#categorias"),
    lista: $("#listaProductos"), template: $("#productoTemplate"), sinResultados: $("#sinResultados"),
    resultadoConteo: $("#resultadoConteo"), tituloCatalogo: $("#tituloCatalogo"),
    contador: $("#contadorPedido"), panel: $("#panelResumen"), resumen: $("#resumenProductos"),
    observaciones: $("#observaciones"), total: $("#totalProductos"), mensaje: $("#mensajeEstado")
  };

  function cargarEstado() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved) return;
      state.cantidades = saved.cantidades || {};
      state.trabajador = saved.trabajador || "";
      state.observaciones = saved.observaciones || "";
      els.trabajador.value = state.trabajador;
      els.observaciones.value = state.observaciones;
    } catch { localStorage.removeItem(STORAGE_KEY); }
  }

  function guardarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cantidades: state.cantidades, trabajador: els.trabajador.value.trim(), observaciones: els.observaciones.value
    }));
  }

  function normalizar(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function categoriasDisponibles() {
    return ["Todos", ...new Set(productos.map(p => p.categoria).filter(Boolean))].sort((a,b) => {
      if (a === "Todos") return -1; if (b === "Todos") return 1; return a.localeCompare(b,"es");
    });
  }

  function renderCategorias() {
    els.categorias.replaceChildren();
    categoriasDisponibles().forEach(categoria => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-button" + (state.categoria === categoria ? " active" : "");
      button.textContent = categoria;
      button.addEventListener("click", () => { state.categoria = categoria; renderCategorias(); renderProductos(); });
      els.categorias.append(button);
    });
  }

  function productosFiltrados() {
    const q = normalizar(state.busqueda);
    return productos.filter(p => {
      const categoriaOk = state.categoria === "Todos" || p.categoria === state.categoria;
      const texto = normalizar(`${p.nombre} ${p.categoria} ${p.clasificacion}`);
      return categoriaOk && (!q || texto.includes(q));
    });
  }

  function setCantidad(id, value) {
    const cantidad = Math.max(0, Math.min(99, Number.parseInt(value, 10) || 0));
    if (cantidad === 0) delete state.cantidades[id]; else state.cantidades[id] = cantidad;
    guardarEstado();
    actualizarContador();
    renderResumen();
    const card = document.querySelector(`[data-product-id="${id}"]`);
    if (card) card.classList.toggle("selected", cantidad > 0);
  }

  function renderProductos() {
    const filtered = productosFiltrados();
    els.lista.replaceChildren();
    filtered.forEach(producto => {
      const fragment = els.template.content.cloneNode(true);
      const card = fragment.querySelector(".product-card");
      const input = fragment.querySelector(".quantity-input");
      card.dataset.productId = producto.id;
      card.classList.toggle("selected", Boolean(state.cantidades[producto.id]));
      fragment.querySelector(".product-category").textContent = producto.categoria;
      fragment.querySelector(".product-name").textContent = producto.nombre;
      fragment.querySelector(".product-classification").textContent = producto.clasificacion || "Producto";
      input.value = state.cantidades[producto.id] || 0;
      input.addEventListener("change", e => setCantidad(producto.id, e.target.value));
      fragment.querySelector(".increase").addEventListener("click", () => { input.value = (state.cantidades[producto.id] || 0) + 1; setCantidad(producto.id, input.value); });
      fragment.querySelector(".decrease").addEventListener("click", () => { input.value = Math.max(0, (state.cantidades[producto.id] || 0) - 1); setCantidad(producto.id, input.value); });
      els.lista.append(fragment);
    });
    els.sinResultados.hidden = filtered.length > 0;
    els.resultadoConteo.textContent = `${filtered.length} producto${filtered.length === 1 ? "" : "s"}`;
    els.tituloCatalogo.textContent = state.categoria === "Todos" ? "Todos los productos" : state.categoria;
  }

  function itemsPedido() {
    return productos.filter(p => Number(state.cantidades[p.id]) > 0).map(p => ({...p, cantidad: Number(state.cantidades[p.id])}));
  }

  function actualizarContador() {
    els.contador.textContent = itemsPedido().length;
  }

  function renderResumen() {
    const items = itemsPedido();
    els.resumen.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div"); empty.className = "summary-empty";
      empty.textContent = "Todavía no has marcado productos."; els.resumen.append(empty);
    } else {
      items.sort((a,b) => a.categoria.localeCompare(b.categoria,"es") || a.nombre.localeCompare(b.nombre,"es"));
      items.forEach(item => {
        const row = document.createElement("div"); row.className = "summary-item";
        const info = document.createElement("div");
        const name = document.createElement("p"); name.textContent = item.nombre;
        const category = document.createElement("small"); category.textContent = item.categoria;
        const quantity = document.createElement("strong"); quantity.textContent = `${item.cantidad} ${item.unidad}${item.cantidad === 1 ? "" : "s"}`;
        info.append(name, category); row.append(info, quantity); els.resumen.append(row);
      });
    }
    els.total.textContent = items.length;
  }

  function abrirResumen() { renderResumen(); els.panel.classList.add("open"); els.panel.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
  function cerrarResumen() { els.panel.classList.remove("open"); els.panel.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }

  function limpiar() {
    if (!itemsPedido().length && !els.trabajador.value && !els.observaciones.value) return;
    if (!confirm("¿Quieres borrar todo el pedido actual?")) return;
    state.cantidades = {}; state.trabajador = ""; state.observaciones = "";
    els.trabajador.value = ""; els.observaciones.value = ""; localStorage.removeItem(STORAGE_KEY);
    renderProductos(); renderResumen(); actualizarContador(); els.mensaje.textContent = "";
  }

  function descargar() {
    els.mensaje.textContent = "";
    const items = itemsPedido();
    const trabajador = els.trabajador.value.trim();
    if (!trabajador) { els.mensaje.textContent = "Escribe el nombre del trabajador antes de descargar."; els.trabajador.focus(); return; }
    if (!items.length) { els.mensaje.textContent = "Selecciona al menos un producto."; return; }
    try {
      window.PDFPedido.descargar({ trabajador, observaciones: els.observaciones.value, items });
      els.mensaje.textContent = "PDF generado correctamente.";
    } catch (error) { els.mensaje.textContent = error.message || "No fue posible generar el PDF."; }
  }

  async function copiarPedido() {

    const items = itemsPedido();

    if (!items.length) {

        els.mensaje.textContent = "No hay productos para copiar.";

        return;

    }

    const grupos = {};

    items.forEach(item => {

        if (!grupos[item.categoria]) {

            grupos[item.categoria] = [];

        }

        grupos[item.categoria].push(item);

    });

    const categorias = Object.keys(grupos).sort((a, b) =>
        a.localeCompare(b, "es")
    );

    let texto = "";

    texto += "🛒 *PEDIDO BOGL BOGL*\n\n";

    texto += `👤 *Trabajador:* ${els.trabajador.value}\n`;
    texto += `📅 *Fecha:* ${new Date().toLocaleDateString("es-CL")}\n\n`;

const iconosCategorias = {
  "ASEO": "🧹",
  "BEBIDAS": "🥤",
  "DULCES": "🍬",
  "HELADOS": "🍦",
  "CARNES": "🥩",
  "INSUMOS": "🧤",
  "POTE": "🥡",
  "POUCH": "🧃",
  "RAMEN": "🍜",
  "COCINA": "🍳",
  "VERDURAS": "🥕"
};

    categorias.forEach(categoria => {

       const icono =
  iconosCategorias[categoria.toUpperCase()] || "📦";

texto += `${icono} *${categoria.toUpperCase()}*\n`;

        grupos[categoria]
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
            .forEach(item => {

                texto += `• ${item.nombre}: ${item.cantidad} ${formatearUnidad(item.cantidad, item.unidad)}\n`;

            });

        texto += "\n";

    });

    if (els.observaciones.value.trim()) {

        texto += "📝 *OBSERVACIONES*\n";

        texto += els.observaciones.value.trim();

        texto += "\n\n";

    }

    texto += `📋 *Productos diferentes:* ${items.length}`;

    try {

        await navigator.clipboard.writeText(texto);

        els.mensaje.textContent = "Pedido copiado al portapapeles.";

    } catch (error) {

        console.error(error);

        els.mensaje.textContent = "No fue posible copiar el pedido.";

    }

}

  els.buscador.addEventListener("input", e => { state.busqueda = e.target.value; renderProductos(); });
  async function descargarImagenPedido() {
  const items = itemsPedido();
  const trabajador = els.trabajador.value.trim();

  els.mensaje.textContent = "";

  if (!trabajador) {
    els.mensaje.textContent = "Selecciona un trabajador.";
    els.trabajador.focus();
    return;
  }

  if (!items.length) {
    els.mensaje.textContent = "Selecciona al menos un producto.";
    return;
  }

  if (typeof window.html2canvas !== "function") {
    els.mensaje.textContent = "No fue posible cargar el generador de imágenes.";
    return;
  }

  try {
    const tarjeta = document.createElement("section");

    tarjeta.style.position = "fixed";
    tarjeta.style.left = "-10000px";
    tarjeta.style.top = "0";
    tarjeta.style.width = "800px";
    tarjeta.style.padding = "40px";
    tarjeta.style.background = "#ffffff";
    tarjeta.style.color = "#14213d";
    tarjeta.style.fontFamily = "Arial, sans-serif";

    const itemsOrdenados = [...items].sort(
      (a, b) =>
        a.categoria.localeCompare(b.categoria, "es") ||
        a.nombre.localeCompare(b.nombre, "es")
    );

    const grupos = itemsOrdenados.reduce((acumulador, item) => {
  if (!acumulador[item.categoria]) {
    acumulador[item.categoria] = [];
  }

  acumulador[item.categoria].push(item);

  return acumulador;
}, {});

const categoriasOrdenadas = Object.keys(grupos).sort((a, b) =>
  a.localeCompare(b, "es")
);

const productosHTML = categoriasOrdenadas
  .map(categoria => {
    const productosCategoria = grupos[categoria]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map(item => {
        const unidadFormateada = formatearUnidad(
          item.cantidad,
          item.unidad
        );

        return `
          <div style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:20px;
            padding:14px 18px;
            border-bottom:1px solid #dfe4ec;
          ">
            <div style="min-width:0;">
              <strong style="
                display:block;
                font-size:18px;
                line-height:1.3;
                color:#14213d;
              ">
                ${escaparHTML(item.nombre)}
              </strong>
            </div>

            <strong style="
              flex-shrink:0;
              color:#123c8c;
              font-size:18px;
              white-space:nowrap;
            ">
              ${item.cantidad} ${unidadFormateada}
            </strong>
          </div>
        `;
      })
      .join("");

    return `
      <section style="margin-bottom:26px;">
        <div style="
          display:inline-block;
          padding:10px 18px;
          border-radius:12px 12px 0 0;
          background:#123c8c;
          color:#ffffff;
          font-size:17px;
          font-weight:900;
          letter-spacing:0.05em;
          text-transform:uppercase;
        ">
          ${escaparHTML(categoria)}
        </div>

        <div style="
          overflow:hidden;
          border:2px solid #123c8c;
          border-radius:0 16px 16px 16px;
          background:#ffffff;
        ">
          ${productosCategoria}
        </div>
      </section>
    `;
  })
  .join("");

    const observaciones = els.observaciones.value.trim();

    tarjeta.innerHTML = `
      <div style="
        background:#123c8c;
        color:white;
        padding:28px;
        border-radius:20px;
        margin-bottom:28px;
      ">
        <div style="font-size:16px;font-weight:700;">
          BOGL BOGL
        </div>

        <div style="font-size:30px;font-weight:900;margin-top:5px;">
          Productos faltantes
        </div>

        <div style="font-size:16px;margin-top:15px;">
          Solicitado por: ${trabajador}
        </div>

        <div style="font-size:14px;margin-top:5px;">
          ${new Date().toLocaleDateString("es-CL")}
        </div>
      </div>

      ${productosHTML}

      ${
        observaciones
          ? `
            <div style="
              margin-top:25px;
              padding:18px;
              background:#f5f7fb;
              border-radius:14px;
            ">
              <strong>Observaciones</strong>
              <p style="margin:8px 0 0;">${observaciones}</p>
            </div>
          `
          : ""
      }

      <div style="
        margin-top:26px;
        font-size:16px;
        font-weight:700;
        text-align:right;
      ">
        Productos diferentes: ${items.length}
      </div>
    `;

    document.body.appendChild(tarjeta);

    const canvas = await html2canvas(tarjeta, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    });

    tarjeta.remove();

    const enlace = document.createElement("a");
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreSeguro = trabajador.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_-]+/g, "-");

    enlace.download = `Pedido_BoglBogl_${fecha}_${nombreSeguro}.png`;
    enlace.href = canvas.toDataURL("image/png");
    enlace.click();

    els.mensaje.textContent = "Imagen generada correctamente.";
  } catch (error) {
    console.error(error);
    els.mensaje.textContent = "No fue posible generar la imagen.";
  }
}

  els.trabajador.addEventListener("change", guardarEstado);
  els.observaciones.addEventListener("input", guardarEstado);
  $("#btnAbrirResumen").addEventListener("click", abrirResumen);
  document.querySelectorAll("[data-close-summary]").forEach(el => el.addEventListener("click", cerrarResumen));
 $("#btnImagen").addEventListener("click", descargarImagenPedido);
 function escaparHTML(texto) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatearUnidad(cantidad, unidad) {
  const unidadLimpia = String(unidad || "Unidad").trim();

  if (cantidad === 1) {
    return unidadLimpia;
  }

  const plurales = {
    Unidad: "Unidades",
    unidad: "unidades",
    Caja: "Cajas",
    caja: "cajas",
    Kilo: "Kilos",
    kilo: "kilos",
    kg: "kg",
    Pack: "Packs",
    pack: "packs",
    Botella: "Botellas",
    botella: "botellas",
    Envase: "Envases",
    envase: "envases"
  };

  return plurales[unidadLimpia] || unidadLimpia;
}
  $("#btnLimpiar").addEventListener("click", limpiar);
  $("#btnDescargar").addEventListener("click", descargar);
  $("#btnCopiar").addEventListener(
    "click",
    copiarPedido
    
);
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarResumen(); });

  cargarEstado(); renderCategorias(); renderProductos(); renderResumen(); actualizarContador();
})();

