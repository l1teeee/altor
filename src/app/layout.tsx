import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource/dm-mono/400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'memoria',
  description: 'recuerdos que se desvanecen en la luz.',
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
