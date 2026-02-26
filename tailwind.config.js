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
        primary: "#6BAEC9",
        secondary: "#4A4A4A",
        terciary: "#DDC9A3",
        accent: "#F7A38B",
        neutral: "#FFFFFF",
        primaryHover: "#A8D7E6",
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
        poppins: ["Poppins", "sans-serif"],
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
