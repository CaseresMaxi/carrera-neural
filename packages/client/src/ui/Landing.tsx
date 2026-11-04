import { FACTION_IDS, FACTIONS, VICTORY_VP } from '@sotobosque/engine';
import { useGame } from '../store';
import { ArtSvg } from './Art';

const play = () => useGame.setState({ screen: 'menu' });
const studio = () => useGame.setState({ screen: 'studio' });

const SHOWCASE_CARDS = ['card-Clúster de GPUs', 'card-Paper Viral', 'card-Ronda Serie A', 'card-Datos Sintéticos'];

const FAQ: [string, string][] = [
  ['¿Es un juego oficial de alguna de estas empresas?', 'No. Es una parodia de fans: ninguna empresa lo respalda ni participó. Los personajes son caricaturas originales, sin logos oficiales.'],
  ['¿Necesito crear una cuenta o instalar algo?', 'No. Se juega en el navegador. Para jugar online, una persona crea la sala y comparte el link; la conexión es directa entre navegadores (P2P), sin servidores de juego.'],
  ['¿Cuántas personas pueden jugar?', 'De 2 a 4, eligiendo entre 6 facciones: las 5 empresas y el Redditor. También se puede jugar en una sola compu pasándose el dispositivo (hotseat).'],
  ['¿Cuánto dura una partida?', 'Depende de la mesa: gana la primera empresa en llegar a 20 Puntos de Valuación. Se puede guardar y retomar en cualquier momento.'],
  ['¿Funciona en el celular?', 'Se puede abrir, pero está pensado para pantalla de compu o tablet: el tablero 3D luce mucho mejor en grande.'],
];

export function Landing() {
  return (
    <div className="landing">
      <nav className="l-nav">
        <span className="l-logo">🧠 Carrera Neural</span>
        <a href="#que-es">Qué es</a>
        <a href="#como">Cómo se juega</a>
        <a href="#empresas">Facciones</a>
        <a href="#caja">La caja</a>
        <a href="#ediciones">Ediciones</a>
        <a href="#faq">Preguntas</a>
        <button className="primary" onClick={play}>
          Jugar gratis
        </button>
      </nav>

      <header className="l-hero">
        <div className="l-hero-text">
          <p className="l-kicker">Juego de mesa digital · 2–4 jugadores · navegador</p>
          <h1>
            La carrera por la IA,
            <br />
            <span>en un tablero.</span>
          </h1>
          <p className="l-lead">
            Google, Meta, Anthropic, OpenAI y DeepSeek se disputan los mercados del mundo, y entre todos se cuela un Redditor con la IA
            local que entrenó en su sótano. Cada facción juega distinto: una escala con datacenters, otra libera pesos, otra audita a todos,
            otra lanza productos sin parar, otra hace más con mucho menos… y el Redditor anda solo, con su mochila de componentes.
            Desplegá agentes, competí en benchmarks y llegá primero a <b>{VICTORY_VP} Puntos de Valuación</b>.
          </p>
          <div className="l-ctas">
            <button className="primary big" onClick={play}>
              ▶ Jugar ahora, gratis
            </button>
            <a className="l-btn" href="#como">
              Ver cómo se juega
            </a>
          </div>
        </div>
        <div className="l-lineup">
          {FACTION_IDS.map((f, i) => (
            <div key={f} className="l-mascot" style={{ ['--r' as string]: `${(i - 2.5) * 4}deg`, ['--c' as string]: FACTIONS[f].color }}>
              <ArtSvg id={`char-${f}`} />
              <span>{FACTIONS[f].short}</span>
            </div>
          ))}
        </div>
      </header>

      <section id="que-es" className="l-section">
        <h2>¿Qué es Carrera Neural?</h2>
        <div className="l-pillars">
          <article>
            <ArtSvg id="emblem-anthropic" className="l-pillar-art" />
            <h3>Seis facciones, seis juegos</h3>
            <p>Nadie juega igual. Cada empresa tiene sus agentes, su estructura y su forma de sumar puntos; el Redditor no tiene ejército: tiene un inventario.</p>
          </article>
          <article>
            <ArtSvg id="struct-datacenter" className="l-pillar-art" />
            <h3>Control de mercados</h3>
            <p>Salud, Finanzas, Robótica… Liderá mercados para construir, contratar y bloquear a tus rivales. El que lidera, manda.</p>
          </article>
          <article>
            <ArtSvg id="prop-antenna" className="l-pillar-art" />
            <h3>Online sin servidores</h3>
            <p>Creá una sala, mandá el link y listo. Todo corre en los navegadores, se autoguarda y se puede exportar la partida.</p>
          </article>
        </div>
      </section>

      <section id="como" className="l-section alt">
        <h2>Cómo se juega</h2>
        <p className="l-sub">Cada turno es un trimestre de la empresa, en tres fases:</p>
        <ol className="l-steps">
          <li>
            <span className="l-step-n">1</span>
            <h3>Planning</h3>
            <p>Se activan los efectos de tu empresa. Por ejemplo, los datacenters de Google suman ingenieros solos.</p>
          </li>
          <li>
            <span className="l-step-n">2</span>
            <h3>Sprint</h3>
            <p>
              Tenés 3 acciones: <b>desplegar</b> agentes, <b>contratar</b>, <b>construir</b>, usar tu <b>habilidad especial</b> o
              competir en un <b>benchmark</b> con dados. Las cartas de Datos, Cómputo y Talento pagan las acciones; Hype es comodín.
            </p>
          </li>
          <li>
            <span className="l-step-n">3</span>
            <h3>Cierre</h3>
            <p>Sumás Puntos de Valuación según tu estrategia, robás una carta y pasa el turno. Primera en {VICTORY_VP} PV, gana.</p>
          </li>
        </ol>
        <div className="l-board">
          <ArtSvg id="board" />
        </div>
      </section>

      <section id="empresas" className="l-section">
        <h2>Las facciones</h2>
        <p className="l-sub">Cinco empresas y un lobo solitario, cada uno con su carta: retrato, recursos y habilidades.</p>
        <div className="l-fcards">
          {FACTION_IDS.map((f, i) => (
            <div key={f} className="l-fcard" style={{ ['--r' as string]: `${(i % 2 ? 1 : -1) * 1.5}deg` }}>
              <ArtSvg id={`fcard-${f}`} />
            </div>
          ))}
        </div>
      </section>

      <section id="caja" className="l-section alt">
        <h2>Qué trae la caja</h2>
        <div className="l-box">
          <div className="l-box-item">
            <div className="l-fan">
              {SHOWCASE_CARDS.map((id, i) => (
                <div key={id} style={{ ['--r' as string]: `${(i - 1.5) * 9}deg` }}>
                  <ArtSvg id={id} />
                </div>
              ))}
            </div>
            <h3>40 cartas ilustradas</h3>
            <p>16 diseños de Datos, Cómputo, Talento y Hype para pagar tus jugadas.</p>
          </div>
          <div className="l-box-item">
            <div className="l-structs">
              {['struct-datacenter', 'struct-repo', 'struct-laboratorio', 'struct-demo', 'struct-cluster', 'item-gpu', 'item-cafe'].map((id) => (
                <ArtSvg key={id} id={id} />
              ))}
            </div>
            <h3>Estructuras de cartón</h3>
            <p>Datacenters, repositorios, laboratorios, lanzamientos y clústers que se pueden derribar, más los componentes del Redditor.</p>
          </div>
          <div className="l-box-item">
            <div className="l-dice">
              {FACTION_IDS.map((f, i) => (
                <ArtSvg key={f} id={`die-${f}-${[6, 4, 5, 3, 6, 2][i]}`} />
              ))}
            </div>
            <h3>Dados por empresa</h3>
            <p>Los benchmarks se resuelven con dados: 4 o más, punto para vos.</p>
          </div>
        </div>
        <p className="l-sub">
          Todo está dibujado a mano en código: lo podés ver pieza por pieza en el{' '}
          <button className="link" onClick={studio}>
            Estudio de arte
          </button>
          .
        </p>
      </section>

      <section id="ediciones" className="l-section">
        <h2>Ediciones</h2>
        <div className="l-pricing">
          <article className="featured">
            <span className="l-tag">Disponible</span>
            <h3>Edición digital</h3>
            <p className="l-price">Gratis</p>
            <ul>
              <li>Las 5 empresas, el Redditor y todas las reglas</li>
              <li>Online P2P y partida local</li>
              <li>Guardado y autoguardado</li>
            </ul>
            <button className="primary big" onClick={play}>
              Jugar ahora
            </button>
          </article>
          <article>
            <span className="l-tag soon">Próximamente</span>
            <h3>Imprimí y jugá</h3>
            <p className="l-price">A definir</p>
            <ul>
              <li>PDF con tablero, cartas y figuras</li>
              <li>Recortá, armá y jugá en la mesa</li>
              <li>Hojas de referencia por empresa</li>
            </ul>
            <button disabled>Próximamente</button>
          </article>
          <article>
            <span className="l-tag soon">Próximamente</span>
            <h3>Caja física</h3>
            <p className="l-price">A definir</p>
            <ul>
              <li>Tablero impreso y figuras troqueladas</li>
              <li>40 cartas y 6 cartas de facción</li>
              <li>Dados de colores por empresa</li>
            </ul>
            <button disabled>Próximamente</button>
          </article>
        </div>
      </section>

      <section id="faq" className="l-section alt">
        <h2>Preguntas frecuentes</h2>
        <div className="l-faq">
          {FAQ.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="l-footer">
        <button className="primary big" onClick={play}>
          ▶ Jugar Carrera Neural
        </button>
        <p>
          Parodia de fans sin fines de lucro. No está afiliada ni respaldada por Google, Meta, Anthropic, OpenAI, DeepSeek ni Reddit; los nombres
          son marcas de sus respectivos dueños. Personajes y arte originales.
        </p>
      </footer>
    </div>
  );
}
