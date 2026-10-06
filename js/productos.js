/* =========================================================
   VHP · Configuración y catálogo
   Este es el único archivo que hace falta tocar para cambiar
   precios o productos.
   ========================================================= */

window.VHP_CONFIG = {
  whatsapp: "5491166634064", // +54 9 11 6663-4064
  tienda: "Vape House Pilar",
  // Código de la cuenta de GoatCounter (analíticas). Vacío = no se cuentan visitas.
  goatcounter: "vapehpilar",
  // Panel secreto del dueño (5 toques en "hecho por buda" del pie).
  panel: "buda-8q4x/"
};

/* Catálogo.
   El stock es ilimitado: todos los productos se pueden pedir.
   Campos opcionales:
     img: "img/otra-foto.png"         → foto con otro nombre o formato.
                                        Por defecto cada producto busca su foto en img/
                                        (ej: img/elfbar-ice-king.webp). Si no está, se dibuja
                                        una ilustración. img: "" fuerza la ilustración.
     etiqueta: "Nuevo"                → cartelito sobre la tarjeta. */
window.VHP_PRODUCTOS = [
  { marca: "Elfbar", nombre: "Ice King", pitadas: 40000, precio: 25000 },
  { marca: "Elfbar", nombre: "Trio", pitadas: 40000, precio: 26500 },
  { marca: "Elfbar", nombre: "30k", pitadas: 30000, precio: 22500 },
  { marca: "Elfbar", nombre: "15k", pitadas: 15000, precio: 19000 },
  { marca: "Elfbar", nombre: "Summer", pitadas: 40000, precio: 25000 },
  { marca: "Elfbar", nombre: "Duke", pitadas: 35000, precio: 24500 },
  { marca: "Ignite", nombre: "Mix", pitadas: 40000, precio: 28000 },
  { marca: "Ignite", nombre: "Sweet", pitadas: 40000, precio: 28000 },
  { marca: "Ignite", nombre: "V150", pitadas: null, precio: 20500 },
  { marca: "Ignite", nombre: "V155", pitadas: null, precio: 21500 },
  { marca: "Ignite", nombre: "V250", pitadas: null, precio: 25000 },
  { marca: "Ignite", nombre: "V300", pitadas: null, precio: 26500 },
  { marca: "Ignite", nombre: "V400 Ice", pitadas: null, precio: 28000 },
  { marca: "Reing Bar", nombre: "50k", pitadas: 50000, precio: 24000 }
];

/* Color de cada marca (ilustraciones y detalles). */
window.VHP_MARCAS = {
  "Elfbar": "#a899d6",
  "Ignite": "#d69ad1",
  "Reing Bar": "#8aa8ec"
};
