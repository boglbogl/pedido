const fs = require("fs");
const path = require("path");

const rutaArchivo = path.join(__dirname, "productos.js");

if (!fs.existsSync(rutaArchivo)) {
  console.error("No se encontró productos.js en esta carpeta.");
  process.exit(1);
}

const contenidoOriginal = fs.readFileSync(rutaArchivo, "utf8");

let contador = 1;

/*
  Renumera únicamente líneas de productos con formatos como:

  [25, "Producto"],
  [null, "Producto"],
  [25, "Producto", "Clasificación"],
  [25, "Producto", null, "Caja"]

  No modifica otros números del archivo.
*/
const contenidoActualizado = contenidoOriginal.replace(
  /^(\s*)\[(?:null|\d+)(\s*,\s*["'`])/gm,
  (coincidencia, espacios, inicioNombre) => {
    return `${espacios}[${contador++}${inicioNombre}`;
  }
);

if (contador === 1) {
  console.error("No se encontraron productos para renumerar.");
  process.exit(1);
}

const rutaRespaldo = path.join(__dirname, "productos.backup.js");

fs.writeFileSync(rutaRespaldo, contenidoOriginal, "utf8");
fs.writeFileSync(rutaArchivo, contenidoActualizado, "utf8");

console.log("----------------------------------------");
console.log(`Productos renumerados: ${contador - 1}`);
console.log("Primer ID: 1");
console.log(`Último ID: ${contador - 1}`);
console.log("Respaldo creado: productos.backup.js");
console.log("----------------------------------------");