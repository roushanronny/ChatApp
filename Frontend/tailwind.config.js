/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                'brown-light': '#F5E6D3',
                'brown-primary': '#D4A574',
                'brown-medium': '#C4966F',
                'brown-dark': '#A0826D',
                'brown-darker': '#8B6F5F',
                'brown-text': '#5C4A37',
                'brown-bg': '#FAF4ED',
            },
        },
    },
    plugins: [require("daisyui")],
};