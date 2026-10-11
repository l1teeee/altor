import { PanelCta } from './PanelCta';

export function Scenes() {
  return (
    <>
      <section className="scene" data-scene>
        <div className="copy">
          <p className="tag">Estudio de movimiento</p>
          <h1>Todo lo que se mueve deja mancha.</h1>
          <p>
            Una página dibujada en carboncillo y renderizada en tiempo real. Mueve el cursor o el dedo para borrar con
            luz.
          </p>
          <p className="hint">↓ Baja para ver cómo se arma</p>
        </div>
      </section>
      <section className="scene" data-scene>
        <div className="copy">
          <p className="tag">01 Tono</p>
          <h2>Primero, el movimiento.</h2>
          <p>
            Un clip de pocos KB se reduce a luz y sombra. Se difumina hasta perder los bordes y lo que brilla se
            desborda, como carbón borrado con goma.
          </p>
        </div>
      </section>
      <section className="scene" data-scene>
        <div className="copy">
          <p className="tag">02 Papel</p>
          <h2>El grano decide dónde se queda el carbón.</h2>
          <p>
            Donde el papel sube, el pigmento no llega. Por eso los grises se rompen en manchas y los negros nunca son
            planos.
          </p>
        </div>
      </section>
      <section className="scene" data-scene>
        <div className="copy">
          <p className="tag">03 Pulso</p>
          <h2>Cada tres cuadros, el papel se redibuja.</h2>
          <p>
            El movimiento corre a 30 cuadros por segundo y el grano cambia a 10. Esa diferencia es lo que se siente
            hecho a mano.
          </p>
        </div>
      </section>
      <section className="scene" data-scene>
        <div className="copy">
          <p className="tag">04 Marco</p>
          <h2>Un borde que nunca cierra igual.</h2>
          <p>El marco es un trazo irregular que también respira. Sin él esto es un filtro; con él parece una lámina.</p>
        </div>
      </section>
      <section className="scene" data-scene>
        <div className="copy">
          <p className="tag">Resultado</p>
          <h2>Un shader, un clip corto y ninguna librería.</h2>
          <p>Cambia el video y el estilo se mantiene. Carga el tuyo con Mi video, ajusta cada capa y copia los parámetros.</p>
          <PanelCta />
        </div>
      </section>
    </>
  );
}
