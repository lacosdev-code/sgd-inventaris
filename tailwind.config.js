/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Palet Emas Khusus SUNGGIARDI
                sgd: {
                    50: '#FDFCF7',
                    100: '#FBF8EF',
                    200: '#F5EED7',
                    300: '#EADBB0',
                    400: '#D9C587',
                    500: '#C5A02D', // Modern Gold (Sesuai Premium Brand)
                    600: '#AA8522', // Deep Gold Hover
                    700: '#7D6119', // Contrast Gold for Text
                    800: '#523F10',
                    900: '#2A2008',
                }
            }
        },
    },
    plugins: [],
}
