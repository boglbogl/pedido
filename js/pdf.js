window.PDFPedido = {
  descargar({ trabajador, observaciones, items }) {
    if (!window.jspdf?.jsPDF) {
      throw new Error("No fue posible cargar la librería PDF. Revisa la conexión a internet.");
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 18;

    const ensureSpace = (needed = 12) => {
      if (y + needed > pageHeight - 16) { doc.addPage(); y = 18; }
    };
    const writeWrapped = (text, x, width, lineHeight = 5) => {
      const lines = doc.splitTextToSize(String(text), width);
      ensureSpace(lines.length * lineHeight + 2);
      doc.text(lines, x, y);
      y += lines.length * lineHeight;
    };

    doc.setFillColor(18, 60, 140);
    doc.rect(0, 0, pageWidth, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BOGL BOGL", margin, 15);
    doc.setFontSize(11);
    doc.text("LISTA DE PRODUCTOS FALTANTES", margin, 24);

    y = 44;
    doc.setTextColor(20, 33, 61);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const now = new Date();
    doc.text(`Fecha: ${now.toLocaleDateString("es-CL")}`, margin, y);
    doc.text(`Hora: ${now.toLocaleTimeString("es-CL", {hour:"2-digit", minute:"2-digit"})}`, 80, y);
    y += 7;
    doc.text(`Solicitado por: ${trabajador || "Sin indicar"}`, margin, y);
    y += 10;

    const groups = items.reduce((acc, item) => {
      (acc[item.categoria] ||= []).push(item);
      return acc;
    }, {});

    for (const categoria of Object.keys(groups).sort((a,b) => a.localeCompare(b,"es"))) {
      ensureSpace(18);
      doc.setFillColor(235, 240, 251);
      doc.roundedRect(margin, y - 5, pageWidth - margin*2, 9, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(18, 60, 140);
      doc.text(categoria.toUpperCase(), margin + 3, y + 1);
      y += 10;
      doc.setTextColor(20, 33, 61);
      for (const item of groups[categoria]) {
        ensureSpace(10);
        doc.setFont("helvetica", "normal");
        writeWrapped(`• ${item.nombre}`, margin + 2, pageWidth - margin*2 - 42, 5);
        doc.setFont("helvetica", "bold");
        doc.text(`${item.cantidad} ${item.unidad}${item.cantidad === 1 ? "" : "s"}`, pageWidth - margin, y - 5, { align: "right" });
        y += 2;
      }
      y += 3;
    }

    if (observaciones?.trim()) {
      ensureSpace(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(229, 43, 61);
      doc.text("OBSERVACIONES", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(20, 33, 61);
      writeWrapped(observaciones.trim(), margin, pageWidth - margin*2, 5);
    }

    y += 4;
    ensureSpace(12);
    doc.setDrawColor(223, 228, 236);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`Total de productos diferentes: ${items.length}`, margin, y);

    const safeName = (trabajador || "trabajador").trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g, "-");
    const date = now.toISOString().slice(0,10);
    doc.save(`Pedido_BoglBogl_${date}_${safeName}.pdf`);
  }
};
