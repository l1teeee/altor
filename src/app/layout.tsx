import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cosmos Carboncillo',
  description:
    'Demo de una página en estilo carboncillo: un shader WebGL en vivo sobre un clip corto de video, con controles de grano, difuminado y marco.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
