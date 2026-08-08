import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sna: {
          ink: "#10233f",
          navy: "#173b63",
          blue: "#2f78b7",
          teal: "#24a8a3",
          sky: "#dff3f7",
          mist: "#f4f9fb",
          line: "#d6e3e8",
        },
      },
      boxShadow: {
        soft: "0 24px 70px rgba(16, 35, 63, 0.10)",
        card: "0 16px 48px rgba(16, 35, 63, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "network-gradient":
          "radial-gradient(circle at 12% 10%, rgba(36, 168, 163, 0.18), transparent 32%), radial-gradient(circle at 82% 12%, rgba(47, 120, 183, 0.16), transparent 28%), linear-gradient(135deg, #fcfdfd 0%, #f4f9fb 58%, #eaf5f7 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
