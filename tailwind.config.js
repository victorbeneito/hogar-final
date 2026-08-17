/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

module.exports = {
  darkMode: "class", // 👈 Vital para que funcione el botón
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // El azul de la casa era #6BAEC9. Sobre el fondo claro daba 2,32:1 y con
        // texto blanco encima 2,46:1, cuando la norma WCAG AA pide 4,5:1. No es un
        // capricho de norma: 62 de los 68 botones de la tienda son blanco sobre este
        // azul, así que "Añadir al carrito" y "Ver opciones" se leían mal a quien
        // tiene la vista cansada o mira el móvil a pleno sol.
        //
        // #377A95 NO es otro color: es el mismo tono (197°) y la misma saturación
        // (47%), sólo con menos luminosidad (60% → 40%). Queda en 4,51:1 sobre el
        // fondo claro y 4,79:1 con texto blanco encima.
        primary: "#377A95",
        secondary: "#4A4A4A",
        terciary: "#DDC9A3",
        // El coral era #F7A38B. Como texto daba 1,87:1 — y lo lleva el PRECIO de la
        // ficha, que es el dato que decide la compra. Mismo tono (13°) y misma
        // saturación (87%), sólo con menos luz (76% → 58%).
        //
        // 3,05:1. Parece poco, pero los precios van a 24 px en extranegrita y para
        // texto grande la norma pide 3:1, no 4,5:1. Se eligió este punto a propósito
        // en vez de cumplir 4,5:1 en todo: para eso hacía falta #BF350D, que ya no es
        // coral sino rojo teja y cambiaba el aire de las ofertas.
        //
        // Ojo: quedan 3 usos en texto pequeño (`text-sm`) que con esto siguen sin
        // cumplir. Si se quiere cerrar del todo, hay que pasarlos a gris o al azul.
        //
        // De paso mejoran las 3 etiquetas de oferta, que son blanco sobre coral:
        // de 1,99:1 a 3,25:1.
        accent: "#F16037",
        neutral: "#FFFFFF",
        // El hover era #A8D7E6, un azul MÁS CLARO que el normal. Con texto blanco
        // encima daba 1,55:1: al pasar el ratón por cualquiera de los 35 botones que
        // lo usan, la etiqueta se volvía prácticamente invisible. Ahora el hover
        // oscurece en vez de aclarar (6,17:1), que además es lo habitual en un botón
        // de fondo oscuro.
        primaryHover: "#2E687F",
        fondo: "#F8F8F5",
        
        // Colores Modo Oscuro
        darkBg: "#1a1a1a",      // He oscurecido esto (antes era gris medio #6e6e6e)
        darkNavBg: "#000000",
        darkNavText: "#f5f5f5",
        
        hoverFooter: "#d6d2d2",
        botonHover: "#c9c6c6",
        fondoCasilla: "#f2fbff"
      },
      fontFamily: {
        // La clase `font-poppins` apunta a la variable que define next/font en el
        // <html> (src/app/layout.tsx). Antes ponía "Poppins" a secas, que sólo
        // funcionaba si el navegador ya la tenía cargada por el @import de
        // globals.css; ese @import ya no existe.
        poppins: ["var(--fuente-poppins)", "sans-serif"],
        orienta: ["Orienta", "sans-serif"],
      },
      boxShadow: {
        base: "0 2px 8px 0 rgba(28,37,44,0.1)",
      },
      borderRadius: {
        base: "12px",
      },
    },
  },
  plugins: [
    // Genera las clases `prose` / `prose-*` que usa el contenido del blog
    // (src/app/(public)/blog/[slug]/page.tsx). Sin este plugin esas clases
    // no producen CSS y el artículo se ve sin títulos ni separación entre
    // párrafos, porque Preflight ya ha quitado los estilos del navegador.
    require('@tailwindcss/typography'),

    // He rescatado tu plugin de bordes del archivo .cjs
    plugin(function({ matchUtilities, theme }) {
      matchUtilities(
        {
          'text-stroke': (value) => ({
            '-webkit-text-stroke-width': value,
          }),
        },
        { values: theme('borderWidth') }
      )
      matchUtilities(
        {
          'text-stroke': (value) => ({
            '-webkit-text-stroke-color': value,
          }),
        },
        { values: theme('colors') }
      )
    }),
  ],
};

// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   darkMode: "class",
//   content: [
//     "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
//   ],
//   theme: {
//     extend: {
//       colors: {
//         primary: "#6BAEC9",
//         secondary: "#4A4A4A",
//         terciary: "#DDC9A3",
//         accent: "#F7A38B",
//         neutral: "#FFFFFF",
//         primaryHover: "#A8D7E6",
//         fondo: "#F8F8F5",
//         darkBg: "#6e6e6e",
//         darkNavBg: "#ababab",
//         darkNavText: "#2C2C2C",
//         hoverFooter: "#d6d2d2",
//         botonHover: "#c9c6c6",
//         fondoCasilla: "#f2fbff"
//       },
//       fontFamily: {
//         poppins: ["Poppins", "sans-serif"],
//         orienta: ["Orienta", "sans-serif"],
//       },
//       boxShadow: {
//         base: "0 2px 8px 0 rgba(28,37,44,0.1)",
//       },
//       borderRadius: {
//         base: "12px",
//       },
//     },
//   },
//   plugins: [],
// };
