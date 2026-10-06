/* =========================================================
   VHP · Configuración y catálogo
   Este es el único archivo que hace falta tocar para cambiar
   precios, productos o sabores.
   ========================================================= */

window.VHP_CONFIG = {
  whatsapp: "5491166634064", // +54 9 11 6663-4064
  tienda: "Vape House Pilar"
};

/* Sabores que se ofrecen por defecto en todos los modelos.
   "color" es solo para el puntito de color en pantalla. */
window.VHP_SABORES = [
  { nombre: "Strawberry Kiwi", color: "#ff6b8b" },
  { nombre: "Blue Razz Ice", color: "#4f8dff" },
  { nombre: "Watermelon Ice", color: "#ff5a6e" },
  { nombre: "Grape Ice", color: "#9b6bff" },
  { nombre: "Mango Ice", color: "#ffb340" },
  { nombre: "Peach Ice", color: "#ff9f80" },
  { nombre: "Blueberry Ice", color: "#5b6cff" },
  { nombre: "Strawberry Banana", color: "#ffd25a" },
  { nombre: "Cherry Ice", color: "#e0314f" },
  { nombre: "Pineapple Ice", color: "#f5d547" },
  { nombre: "Lemon Lime", color: "#c6f04d" },
  { nombre: "Miami Mint", color: "#4fe0b5" },
  { nombre: "Cool Mint", color: "#7ef0e0" },
  { nombre: "Sour Apple", color: "#8fe05a" },
  { nombre: "Triple Berry", color: "#c04bd9" },
  { nombre: "Cola Ice", color: "#a8653a" }
];

/* Catálogo.
   El stock es ilimitado: todos los productos se pueden pedir.
   Campos opcionales:
     sabores: ["Sabor 1", "Sabor 2"]  → reemplaza la lista por defecto en ese modelo.
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
