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

  function copiarPedido(){

    const items = itemsPedido();

    if(!items.length){

        els.mensaje.textContent="No hay productos para copiar.";

        return;

    }

    let texto="";

    texto+="🛒 *PEDIDO BOGL BOGL*\n\n";

    texto+=`👤 Trabajador: ${els.trabajador.value}\n\n`;

    items.forEach(item=>{

        texto+=`• ${item.nombre} (${item.cantidad} ${item.unidad})\n`;

    });

    if(els.observaciones.value.trim()){

        texto+="\n";

        texto+="📝 Observaciones:\n";

        texto+=els.observaciones.value.trim();

    }

    navigator.clipboard.writeText(texto);

    els.mensaje.textContent="Pedido copiado al portapapeles.";

}

  els.buscador.addEventListener("input", e => { state.busqueda = e.target.value; renderProductos(); });
  els.trabajador.addEventListener("change", guardarEstado);
  els.observaciones.addEventListener("input", guardarEstado);
  $("#btnAbrirResumen").addEventListener("click", abrirResumen);
  document.querySelectorAll("[data-close-summary]").forEach(el => el.addEventListener("click", cerrarResumen));
  $("#btnLimpiar").addEventListener("click", limpiar);
  $("#btnDescargar").addEventListener("click", descargar);
  $("#btnCopiar").addEventListener(
    "click",
    copiarPedido
);
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarResumen(); });

  cargarEstado(); renderCategorias(); renderProductos(); renderResumen(); actualizarContador();
})();
