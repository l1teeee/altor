'use client';

import { useContext } from 'react';
import { OpenPanelContext } from './Experience';

export function PanelCta() {
  const openPanel = useContext(OpenPanelContext);
  return (
    <button className="cta" type="button" onClick={openPanel}>
      Abrir ajustes
    </button>
  );
}
