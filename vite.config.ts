import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Chemins relatifs : l'appli est servie depuis un sous-dossier sur GitHub Pages.
export default defineConfig({ base: "./", plugins: [react()] });
