# IFC Viewer (ACC-style)

https://github.com/user-attachments/assets/f4625cfe-a6c2-4e86-b253-ae0d74944c9b


Dit project is een lichte IFC/.frag viewer in de browser, opgezet met Vite en That Open Engine.
De UI is geïnspireerd op de Autodesk Construction Cloud (ACC) viewer: topbar, linker navigatie,
models‑paneel, viewcube en een centrale toolbar.

## Functionaliteit
- Laad `.ifc` of `.frag` bestanden via upload of drag‑and‑drop.
- IFC bestanden worden na het laden automatisch omgezet naar fragments voor snelle weergave.
- De viewer draait volledig client‑side.

## Projectstructuur
- `src/main.js`: viewer setup en bestandsworkflow.
- `src/style.css`: ACC‑achtige layout en styling.
- `public/worker.mjs`: fragments worker.
- `public/wasm/web-ifc.wasm`: Web‑IFC wasm runtime.

## Lokale ontwikkeling
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
