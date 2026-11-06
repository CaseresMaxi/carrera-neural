# Carrera Neural 3D

Juego de mesa digital en 3D, en el navegador, de control de área asimétrico: **Google, Meta, Anthropic, OpenAI y DeepSeek**
compiten por liderar los mercados de la IA, y **El Redditor** (un freaki de foro con su IA local) se cuela entre todos
(se juega de 2 a 4, eligiendo entre 6 facciones).
Multijugador online **P2P sin servidor de juego**: un jugador hostea la partida y el resto se conecta por WebRTC.

> **Parodia de fans sin fines de lucro.** No está afiliada ni respaldada por ninguna de estas empresas (ni por Reddit); los nombres son
> marcas de sus dueños. Los personajes son caricaturas originales dibujadas en código, **sin logos oficiales**, y las
> mecánicas exageran el arquetipo público de cada una con humor.

## Cómo correrlo

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # tests del motor (Vitest)
pnpm typecheck
pnpm build        # build estático en packages/client/dist (sirve en GitHub Pages / Netlify)
```

## Cómo jugar online

1. Uno toca **Crear sala y hostear** y comparte el link (`?room=CODIGO`).
2. Los demás abren el link, ponen su nombre, **Unirse** y **Sentarme** en un asiento.
3. El host elige facciones / cantidad de asientos y toca **Empezar partida**.

- El **host es autoritativo**: corre el motor, valida cada move y manda a cada peer sólo su vista
  (sin manos ajenas, mazo ni estado del RNG).
- **Reconexión:** si alguien recarga, vuelve a entrar con el mismo link y recupera su asiento (playerId en localStorage).
- **Si se cae el host:** la partida se autoguarda en su navegador (“Continuar autoguardado” retoma la misma sala),
  o se puede exportar con **Guardar .json** y cualquiera la carga con **Cargar .json → y hostear**.
- **Limitación NAT:** la señalización usa relays públicos de Nostr (Trystero) y STUN públicos; no hay TURN.
  En redes corporativas / NAT simétrica puede no conectar: probá que hostee otra persona o usar un hotspot.
- Anti-trampa débil por diseño (P2P entre amigos): el host podría hacer trampa.

También hay **partida local (hotseat)** con pantalla de “pasale el dispositivo”.

## Reglas

En la partida, el **tablero de jugador** (abajo, al centro) guía cada turno: fases, qué hacer ahora, pasos sugeridos del sprint
con su costo y por qué no se pueden, reserva/inventario, lo que sumarías si cerrás ahora y tu mano. Con las pestañas se
ven los tableros de los rivales; **❓ Cómo se juega** abre el resumen de reglas.

Cada turno: **Planning** (efectos de empresa) → **Sprint** (3 acciones) → **Cierre** (puntos, robar 1, mano máx. 5).
Gana la primera en llegar a **20 PV** (Puntos de Valuación).

- **Liderar** un mercado: más agentes + estructuras que nadie (empate = nadie).
- **Desplegar** (1 acción): agentes a un mercado conectado; hay que liderar origen o destino.
- **Contratar / Construir / Lanzar demo / Especial** (1 acción): pagando una carta del recurso del mercado
  (📊 Datos, 🔲 Cómputo, 💡 Talento). 🚀 Hype es comodín.
- **Crunch:** quemar una carta de Hype → +1 acción (1 vez por turno).
- **Benchmark** (1 acción): cada lado tira 1 d6 por agente (máx. 3); 4+ = punto. Si el rival no tiene agentes ahí: +1 punto.
  Los puntos sacan agentes, después estructuras, después demos. Cada estructura/demo tirada = 1 PV.

| Empresa | Agentes | Rasgo |
|---|---|---|
| 🟡 Google DeepMind | 20 ingenieros | No contrata: +1 ingeniero por datacenter en el Planning. Datacenters 1·2·2·3·3·4 PV. **Adquirir** (1/turno): en un mercado que lidera, cambia 1 agente del rival más fuerte por uno propio. Cierre: +1 PV cada 3 mercados liderados. |
| 🔵 Meta AI | 12 contribuidores | Pesos abiertos/viral: despliega 2 conexiones. Contrata 2 en repositorios (1·2·2 PV). **Forkear** (1/turno): junto a una estructura o lanzamiento rival, +1 PV. Cierre: +1 PV por repo en mercado liderado. |
| 🟠 Anthropic | 12 auditores | Red team: +1 punto al defender. Auditoría: un benchmark gratis por turno. +1 PV por agente rival eliminado. Laboratorios 1·2·2·3 PV. Cierre: +1 PV si ganó un benchmark; Constitución: +1 PV si lidera 3+ mercados con laboratorio. |
| 🟢 OpenAI | 8 investigadores | Pivotar: despliega sin liderar. Lanzamientos en cadena (boca a boca). Cierre: PV según lanzamientos 0·1·2·2·3·3·4·5·6. Máx. 2 dados. |
| 🟣 DeepSeek | 14 ingenieros | Eficiencia: cualquier carta paga en cualquier mercado. Contrata 2 en clústers (1·1·2·2 PV). Cierre — Precio bajo: +1 PV cada 3 mercados disputados y +1 por clúster en mercado que lidera. |
| 🩷 El Redditor | 1 modelo local | Nómade: un solo peón que no lidera ni muere. Inventario de componentes (☕ Café mueve, 🎮 GPU compite —1 dado por GPU—, 💾 Dataset roba carta, ⌨️ Teclado fine-tunea). **Fine-tunear:** carta del mercado → componente nuevo y +2 PV. **Ayudar** (1/turno): regala una carta a un rival en su mercado, +2 PV. Planning — Dormir: recupera 3 componentes. Los golpes queman componentes. Cierre — Drama: +1 PV por rival en su mercado. |

El balance se chequea con una simulación de 300 partidas entre bots heurísticos (4 de las 6 facciones por partida, rotando las 15 combinaciones) (`packages/engine/test/balance.test.ts`).

## Arquitectura

```text
packages/
  engine/   TS puro, sin React. Estado JSON serializable y determinista (PRNG mulberry32 semillado).
            createGame / validateMove / applyMove / playerView. Tests en test/.
  client/   Vite + React + React Three Fiber + drei + zustand + Trystero.
    src/store.ts        sesión: Authority (host/local), host P2P, peer P2P, save/load, undo
    src/net/protocol.ts mensajes host ↔ peer
    src/scene/          escena 3D: tablero, mercados, conexiones, corriente de datos, ciudad instanciada, piezas, dados, pista de PV
    src/fx/             animaciones de pelea: clips como datos (clips.ts), director (director.ts) y efectos 3D (BattleFx3D.tsx)
    src/ui/             HUD 2D: mano en abanico, panel de acciones, facciones, log
```

- **Arte dibujado a mano, en código** (`packages/client/src/art/`): todos los assets son SVG generados con rough.js
  (trazo de tinta tembloroso), filtros de acuarela y grano de papel, y tipografías Caveat / Patrick Hand (OFL).
  Se ven todos juntos en el **Estudio de arte** (botón en el menú o `?estudio`), donde se descargan en SVG/PNG.
  - `art/ink.ts` lápiz (Pen) + filtros · `art/characters.ts` personajes · `art/world.ts` estructuras, naturaleza, íconos
  - `art/cards.ts` cartas (una viñeta por carta), dorso y dados · `art/board.ts` mapa completo pintado
  - `art/catalog.ts` catálogo único: lo usan el Estudio, la UI 2D y la escena 3D · `art/textures.ts` SVG → textura
- **Escena 3D como diorama de papel:** el tablero es el mapa pintado; personajes y árboles son figuras de cartón
  que miran a la cámara (los árboles van agrupados en `InstancedMesh`); las estructuras son losetas ilustradas y los dados
  tienen caras dibujadas. Todo con `MeshBasicMaterial` y sombras falsas (manchas), para conservar los colores del dibujo.
- **Animaciones:** las piezas viajan en arco entre mercados, aparecen con “pop” y, cuando salen del tablero, caen y se
  desvanecen. Al sumar puntos, el marcador salta y flota un “+N PV”. La cámara hace un corte corto a cada batalla, y la
  batalla se anima con un **clip**. Respeta `prefers-reduced-motion`.
- **Peleas animadas con datos** (`src/fx/clips.ts`, mismo formato que `animations.json` del motor
  [mesa](https://github.com/CaseresMaxi/mesa)): cada clip es una línea de tiempo de efectos.
  - Efectos: `lunge` (las figuras embisten), `shake`, `flash`, `projectile` (en arco, con estela), `burst` (partículas),
    `ring` (onda expansiva), `dice` (sincroniza los dados 3D), `casualties` (las bajas caen) y `text`.
  - Cada paso puede correr sólo con ciertos resultados (`when`: `attackerWins`, `attackerLost`, `undefended`…).
  - El clip lo elige la facción atacante: el Redditor usa `trolleo` (estrellitas y burla) y el resto, `benchmark`
    (ráfaga de tokens).
  - El motor guarda en `lastBattle` cuántos guerreros tenía cada bando y qué perdió cada uno (para el nómade cuenta los
    componentes quemados). Es puramente cosmético: no cambia reglas ni balance.
  - En desarrollo, `__fx.setFxSpeed(0.3)` en la consola la reproduce en cámara lenta.
- **Undo:** sólo moves sin azar ni información nueva (mover, reclutar, construir, encender, esfuerzo) dentro del mismo turno.

### Cámara

Arrastrar = orbitar · rueda = zoom · clic derecho = paneo · doble clic en un mercado = acercar · botón **Vista superior**.
