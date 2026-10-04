// Ambient module declarations for non-JS assets imported by the app.
// TypeScript (and the editor) can't resolve .css imports on its own — Next.js
// handles them at build time. These declarations silence errors like:
//   TS2882: Cannot find module or type declarations for side-effect import of '@/globals.css'
declare module "*.css";
