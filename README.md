# Cosmos Carboncillo

Página en estilo carboncillo: un shader WebGL2 en vivo sobre un clip corto de video.

## Uso

```
npm install
npm run dev
```

## Estructura

- `src/lib/shader.ts`: shaders GLSL (tono, papel, marco, pulso)
- `src/lib/renderer.ts`: renderer WebGL2 con calidad adaptativa
- `src/lib/params.ts`: parámetros por defecto y keyframes de scroll
- `src/components/Experience.tsx`: UI, panel de ajustes y bucle de render
- `public/cosmos.webm`, `public/cosmos.mp4`: clip fuente (80x60 y 96x72, ~20 KB en total)

## Usar tu propio video

Botón "Mi video" en la página para probarlo, o reemplaza los archivos de `public/`.
Cualquier clip funciona; para el peso más bajo conviene reducirlo a unos 96x72 y desenfocarlo antes.
