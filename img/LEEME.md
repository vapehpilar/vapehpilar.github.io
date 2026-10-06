# Fotos de los productos

Subí acá la foto de cada vape con **exactamente** este nombre y aparece sola en la tienda.
Si falta alguna foto, ese producto muestra la ilustración de siempre.

| Producto         | Nombre del archivo     |
|------------------|------------------------|
| Elfbar Ice King  | `elfbar-ice-king.webp`  |
| Elfbar Trio      | `elfbar-trio.webp`      |
| Elfbar 30k       | `elfbar-30k.webp`       |
| Elfbar 15k       | `elfbar-15k.webp`       |
| Elfbar Summer    | `elfbar-summer.webp`    |
| Elfbar Duke      | `elfbar-duke.webp`      |
| Ignite Mix       | `ignite-mix.webp`       |
| Ignite Sweet     | `ignite-sweet.webp`     |
| Ignite V150      | `ignite-v150.webp`      |
| Ignite V155      | `ignite-v155.webp`      |
| Ignite V250      | `ignite-v250.webp`      |
| Ignite V300      | `ignite-v300.webp`      |
| Ignite V400 Ice  | `ignite-v400-ice.webp`  |
| Reing Bar 50k    | `reing-bar-50k.webp`    |

Consejos:
- Opcional: una versión chica de 400x480 con `-sm` al final (ej: `elfbar-trio-sm.webp`)
  hace que cargue más rápido en celulares. Si no está, se usa la grande.
- Mejor fotos cuadradas o verticales, con fondo transparente o liso. El formato por defecto es `.webp`.
- Si tu foto es `.jpg` o `.png`, cambiá el nombre en `js/productos.js`
  agregando `img: "img/nombre.png"` a ese producto.
- Si agregás un producto nuevo, el nombre es `marca-modelo.webp` en minúsculas
  y con guiones en lugar de espacios.
