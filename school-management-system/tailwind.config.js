/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
                primary: {
                    light: '#1e3163',
                    DEFAULT: '#2563eb',
                    dark: '#1d4ed8',
                },
                dark: {
                    0: '#070e1f',
                    1: '#0d1630',
                    2: '#111f40',
                    3: '#162554',
                    4: '#1e3163',
                },
                accent: {
                    orange: '#fbbf24',
                    green: '#34d399',
                    coral: '#f87171',
                }
            },
        },
    },
    plugins: [],
}
