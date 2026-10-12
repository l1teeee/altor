export function Scenes() {
  return (
    <>
      <section className="scene scene-bookend" data-scene="0" aria-label="umbral">
        <h1 className="copy memory">memoria</h1>
      </section>
      <section className="scene" data-scene="1" aria-label="llegada">
        <p className="copy">algo se quedó.</p>
      </section>
      <section className="scene" data-scene="2" aria-label="eco">
        <p className="copy">no recuerdo el día.<br />recuerdo la luz.</p>
      </section>
      <section className="scene" data-scene="3" aria-label="lluvia">
        <p className="copy">llovía, creo.</p>
      </section>
      <section className="scene" data-scene="4" aria-label="fragmentos" />
      <section className="scene" data-scene="5" aria-label="arbol">
        <p className="copy">había un árbol.<br />o lo soñé.</p>
      </section>
      <section className="scene" data-scene="6" aria-label="desvanecer">
        <p className="copy">se va borrando.</p>
      </section>
      <section className="scene" data-scene="7" aria-label="mar">
        <p className="copy">el mar, tal vez.</p>
      </section>
      <section className="scene" data-scene="8" aria-label="humo">
        <p className="copy">y aún así,</p>
      </section>
      <section className="scene scene-bookend" data-scene="9" aria-label="regreso">
        <p className="copy memory">memoria</p>
      </section>
    </>
  );
}
