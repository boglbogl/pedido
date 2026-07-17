PROYECTO: PEDIDOS BOGL BOGL
============================

Contenido
---------
- index.html: pantalla principal.
- css/styles.css: diseño adaptable a celular y computador.
- js/productos.js: catálogo editable (149 productos importados desde COSASPEDIR.xlsx).
- js/app.js: buscador, filtros, cantidades, resumen y guardado local.
- js/pdf.js: generación del PDF.

Cómo probarlo
-------------
1. Abre index.html con Google Chrome o Microsoft Edge.
2. Escribe el nombre del trabajador.
3. Marca cantidades con +, - o escribiendo el número.
4. Pulsa "Ver pedido" y luego "Descargar PDF".

IMPORTANTE: para descargar el PDF la primera versión carga jsPDF desde internet.
Para usarla sin conexión, descarga jspdf.umd.min.js, guárdalo en una carpeta
"librerias" y cambia la etiqueta correspondiente dentro de index.html.

Cómo editar productos
---------------------
Abre js/productos.js. Cada producto tiene esta estructura:
{
  "id": 1,
  "nombre": "Bon Bon Durazno",
  "categoria": "Bebidas",
  "clasificacion": "Bebida Lata",
  "tipo": "Producto",
  "unidad": "unidad",
  "activo": true
}

- Cambia "unidad" por caja, paquete, bolsa, kilo, etc.
- Cambia "activo" a false para ocultar temporalmente un producto.
- Al agregar productos, usa un id que no esté repetido.

Publicación
-----------
Puedes publicar la carpeta en GitHub Pages, Netlify o Cloudflare Pages.
No utiliza base de datos. El pedido en curso se guarda solo en el navegador
del dispositivo mediante localStorage.
