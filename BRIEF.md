# Brief de producto y técnico: Root 3D (adaptación digital P2P)

**Proyecto:** adaptación 3D en navegador del juego de mesa *Root* (Leder Games; diseño Cole Wehrle; arte Kyle Ferrin)  
**Audiencia:** Maxi (dev Next.js / React / TypeScript, Linux, Instasent)  
**Idioma del brief:** español rioplatense (es-AR)  
**Fecha del brief:** 2026-11-03 (America/Buenos_Aires)  
**Estado:** documento de arranque para desarrollo (uso personal / privado salvo acuerdo de licencia)

---

## 0. Resumen ejecutivo

La idea es una **adaptación digital fiel en 3D** de Root, jugable en el navegador, con **multijugador online donde los jugadores hostean la sesión** (sin servidor de juego dedicado). El host tiene el estado autoritativo; el resto se conecta por WebRTC P2P. Las reglas viven en un motor determinista (boardgame.io o equivalente propio inspirado en ese modelo). La presentación 3D usa Three.js vía React Three Fiber + drei, con assets glTF.

**Decisiones clave propuestas:**

1. **Hosting estático** (GitHub Pages / Netlify / Cloudflare Pages): no hace falta backend propio para el juego.
2. **WebRTC P2P host-authoritative** + señalización liviana (Trystero con relays públicos, o PeerJS).
3. **Motor de reglas** separado del render 3D (`packages/engine`), testeable con escenarios del *Law of Root*.
4. **MVP:** mapa Autumn + 4 facciones base. Expansiones y otros mapas después.
5. **IP:** Root es copyright de Leder Games. Hay versión digital oficial de Dire Wolf Digital. Este brief asume uso personal/privado o arte original + permiso; no publicar comercialmente sin licencia.

---

## 1. Visión, alcance y fases

### 1.1 Visión

Una mesa digital en 3D donde se ve el tablero, las clearings, caminos, río, bosques, fichas de madera, edificios de cartón, tokens, dados, mazos y tableros de facción, con reglas fieles al *Law of Root* y partidas online entre amigos sin montar servidor.

### 1.2 Fuera de alcance (al menos al inicio)

- Matchmaking público global con ranking.
- Servidor autoritativo dedicado (salvo un TURN opcional más adelante).
- Marketplace, microtransacciones, cuentas de usuario obligatorias.
- Replicar 1:1 el arte oficial de Kyle Ferrin / Leder sin permiso (ver sección Legal).
- Bots Clockwork en el MVP.

### 1.3 MVP sugerido

- Mapa **Autumn** (Fall): 12 clearings, suits impresos, caminos, río (visual; reglas de río solo si más adelante entra Riverfolk), bosques, slots y ruinas.
- Facciones base: **Marquise de Cat**, **Eyrie Dynasties**, **Woodland Alliance**, **Vagabond**.
- Mazo compartido base (54 cartas), quests del Vagabond, dados de batalla, pista de puntos, supply de ítems.
- 2 a 4 jugadores, lobby con código/link, host-authoritative, save/resume desde el navegador del host.
- UI 3D + UI 2D de cartas (mano en abanico, zoom).
- Setup estándar (no Advanced Setup completo en MVP).

### 1.4 Fases posteriores

| Fase | Contenido |
|------|-----------|
| Post-MVP A | Mapa Winter; Advanced Setup parcial; espectadores; mejor reconexión |
| Post-MVP B | Riverfolk (Lizard Cult, Riverfolk Company, 2.º Vagabond) |
| Post-MVP C | Underworld (Duchy, Corvid; mapas Lake / Mountain) |
| Post-MVP D | Marauder (Hundreds, Keepers; hirelings básicos a verificar) |
| Post-MVP E | Homeland (Diaspora, Council, Knaves; Marsh / Gorge) |
| Post-MVP F | Decks alternativos (Exiles and Partisans, Squires and Disciples); Landmarks; Vagabond Pack |
| Post-MVP G | Clockwork / bots; tutorial guiado; accesibilidad avanzada |

---

## 2. Inventario de componentes (juego base)

Fuentes principales: *Law of Root* (ed. 13 oct 2025) Appendix C / C.1; listados Leder Games; The Root Database; BGG / packing lists. Donde un número no esté verificado en fuente primaria, se marca **a verificar**.

### 2.1 Tablero y mapa Autumn

- **1 tablero** doble faz: Autumn (Fall) / Winter.
- **Autumn (MVP):** 12 clearings conectadas por paths; áreas cerradas = **forests** (The Root Database indica **7 forests** en Autumn).
- Cada clearing tiene **suit** impresa: mouse, rabbit o fox (en Autumn no se usan marcadores aleatorios; eso es Winter / mapas variante).
- Distribución típica citada en guías: **4 fox / 4 rabbit / 4 mouse** (secundaria; layout exacto de adyacencias y slots: modelar desde scan/foto del tablero o datos de comunidad verificados; grafo de paths **a verificar** en asset final).
- Cada clearing tiene **building slots** (1 a 3). Slots con "R" empiezan con **ruins**.
- **Río:** une clearings; **no es path** salvo regla explícita (Riverfolk / Diaspora más adelante). En Autumn el río **no** divide forests como path (sí lo hace en Winter: "Raging River").
- Cerca del mapa: **item supply**, **score track** (0 a 30+), espacio para dados y descarte.

**Marcadores de clearing (Winter / setup avanzado):** 12 Clearing Markers (4 Rabbit, 4 Fox, 4 Mouse). En MVP Autumn no hacen falta en mesa, pero conviene tener el asset.

### 2.2 Piezas compartidas (base)

| Componente | Cantidad | Notas |
|------------|----------|-------|
| Dados de batalla | 2 | Personalizados; fuentes secundarias indican caras **0–3** (Law no detalla caras; **a verificar** en físico) |
| Marcadores de VP | 4 | Uno por facción |
| Ruins | 4 | En slots "R" |
| Ítems totales | 23 | Ver desglose abajo |
| Cartas mazo compartido | 54 | Ver 2.3 |
| Faction overview cards | 16 | 4 por facción |
| Walkthrough / setup example cards | 4 | 1 por facción |
| Faction boards | 4 | Marquise, Eyrie, Alliance, Vagabond |

### 2.3 Ítems (23)

Según Law C.1.2 / producto Leder:

- 4 Boots (M)
- 4 Swords (S)
- 4 Bags (B)
- 3 Hammers (H)
- 3 Tea (T)
- 2 Coins (X)
- 2 Crossbows (C)
- 1 Torch (F)

**Setup del item supply en el mapa** (Law 5.1.5): colocar en el supply **2 M, 2 B, 1 C, 1 H, 2 S, 2 T, 2 X** (12 ítems).

**Ítems "R" (ruins):** Boot, Bag, Hammer, Sword (uno bajo cada ruin en setup del Vagabond).

**Ítems "S" (starting del personaje):** el resto según carta de personaje (Torch, etc.); los "S" no usados vuelven a la caja.

### 2.4 Mazo compartido (54)

- Suits: bird, fox, rabbit, mouse. **Birds are wild** (con excepciones, p. ej. cultos en expansiones).
- Conteos de suit (análisis de comunidad del mazo base "Might & Right"): **14 bird, 14 fox, 13 mouse, 13 rabbit** (secundaria; coherente entre fuentes; listado carta a carta **a verificar** contra Card Library oficial).
- **5 Ambush:** 1 mouse, 1 rabbit, 1 fox, 2 bird. No se craftean. En batalla pueden dar 2 hits inmediatos (con foil).
- **4 Dominance:** una por suit. No se craftean. Cambian la condición de victoria (o coalición del Vagabond con 4+ jugadores).
- Resto: efectos inmediatos / persistentes y cartas de ítem crafteable.
- En 2 jugadores: **sacar las 4 dominance** del mazo en setup estándar.

### 2.5 Quests y Vagabond (cartas)

- **15 Quest cards** (fuentes BGG: 5 Fox, 5 Mouse, 5 Rabbit).
- **3 Character cards** base: Thief, Tinker, Ranger (starting items típicos: Thief Boot+Torch+Tea+Sword; Tinker Boot+Torch+Bag+Hammer; Ranger Boot+Torch+Crossbow+Sword; confirmar contra cartas / Law Appendix V).
- **3 Relationship markers**.

### 2.6 Marquise de Cat

- **25 warriors** (madera, naranja).
- **6 Sawmills, 6 Workshops, 6 Recruiters**.
- **8 Wood tokens**, **1 Keep**.
- Faction board con tracks de buildings (5 restantes de cada tipo en track al setup; leftmost vacío).
- Crafting: workshops. Scoring principal: construir buildings (puntos según track). Keep: solo ella coloca ahí; Field Hospitals con carta matching.

### 2.7 Eyrie Dynasties

- **20 warriors**.
- **7 Roosts**.
- **4 Leader cards:** Builder, Charismatic, Commander, Despot.
- **2 Loyal Viziers** (cartas que se tuckean en el Decree).
- Decree: columnas Recruit / Move / Battle / Build.
- Lords of the Forest (empatan rule a favor), Disdain for Trade, Turmoil.

### 2.8 Woodland Alliance

- **10 warriors**.
- **10 Sympathy tokens**, **3 Bases** (fox / mouse / rabbit).
- Supporters stack (cartas face-down; capacidad 5 sin bases, ilimitado con bases).
- Officers (warriors en Officers box).
- Guerrilla War (como defensor invierte dados altos/bajos). Outrage al mover a / remover sympathy.

### 2.9 Vagabond

- **1 pawn** (no es warrior; no aporta rule; no se remueve del mapa; Full Removal daña 3 ítems).
- Satchel + tracks Tea / Coins / Bags; Damaged box; Relationships chart.
- Nimble (mueve sin rule); forests vía Slip / reglas de forest movement.
- Ítems exhaust / damage / repair / refresh; quests; Aid; Explore ruins; Strike; coaliciones vía dominance (4+ jugadores).

### 2.10 Piezas de madera totales (base)

- 55 warriors (25 + 20 + 10) + 1 Vagabond pawn.

### 2.11 Reach (referencia setup)

Marquise 10, Eyrie 7, Vagabond (1.º/2.º) 5/2, Alliance 3. Totales recomendados: 2j 17+, 3j 18+, 4j 21+.

---

## 3. Especificación del motor de reglas

### 3.1 Principios

- Estado del juego = **JSON serializable**, determinista dado (estado, move, seed RNG).
- **Moves** validados en el motor (nunca confiar solo en el cliente del peer).
- Host aplica moves, re-broadcast del estado filtrado por jugador (hidden info).
- RNG: PRNG **semillado por el host** al crear la room (seed en save file).

### 3.2 Modelo tipo boardgame.io

- `setup(ctx) -> G`
- `turns`: fases Birdsong / Daylight / Evening por facción (turnas asimétricas: mejor **máquina de estados por facción** que un único flow idéntico).
- `moves`: `{ moveId: (G, ctx, ...args) => G }` con validación; rechazar ilegal.
- `secret` / playerViews: manos, Supporters de Alliance, plots face-down (expansiones), etc.
- Eventos de fin: victoria a 30 VP inmediata; dominance al start of Birdsong; turmoil mid-Daylight Eyrie.

### 3.3 Setup estándar (Law 5.1) a implementar

1. Asignar facciones y primer jugador / orden.
2. Score markers en 0.
3. Robar manos iniciales (3 cada uno); 2j: quitar dominance.
4. Colocar 4 ruins en slots R.
5. Formar item supply (2M 2B 1C 1H 2S 2T 2X).
6. Dados cerca del mapa; overviews opcionales.
7. Setup de cada facción en orden A/B/C…

### 3.4 Estructura de turno

Toda facción: **Birdsong → Daylight → Evening**, luego siguiente jugador clockwise.

**Marquise:** Birdsong = wood en sawmills; Daylight = craft + hasta 3 acciones (+1 por bird spent): Battle, March (hasta 2 moves), Recruit (1/turno), Build, Overwork; Evening = draw (+bonuses) y discard a 5.

**Eyrie:** Birdsong = emergency draw, add to Decree (1–2 cartas, máx 1 bird), new roost si no hay; Daylight = craft + resolve Decree (turmoil si falla); Evening = score roosts + draw/discard.

**Alliance:** Birdsong = Revolt / Spread Sympathy; Daylight = Craft / Mobilize / Train; Evening = Military Ops por officers + draw/discard.

**Vagabond:** Birdsong = Refresh + Slip; Daylight = acciones por exhaust de ítems; Evening = Rest (si forest) / draw / discard / check item capacity.

### 3.5 Batalla (Law 4.3)

1. Defender may Ambush (attacker may foil).
2. Before-roll effects.
3. Roll ambos dados; attacker hits = higher, defender = lower (empate: iguales). Cap de rolled hits = warriors (Vagabond: undamaged swords).
4. After-roll effects.
5. Count hits (extra hits, defenseless +1, ignored hits).
6. Deal hits: dueño elige orden; warriors antes que buildings/tokens; VP por building/token enemigo removido.

Alliance Guerrilla: invierte higher/lower como defensor.

### 3.6 Crafting, dominance, victoria

- Craft: activar crafting pieces matching suits del costo; ítem del supply o efecto persistente/inmediato.
- Dominance: con ≥10 VP en Daylight, activar; sacar score marker; win conditions por suit / bird corners al start Birdsong.
- Win: primero a 30 VP (ties: closest clockwise al current incluyendo current).

### 3.7 Hidden info

| Dato | Visibilidad |
|------|-------------|
| Mano | Solo el dueño; tamaño público |
| Shared deck | Top oculto; no se inspecciona |
| Discard | Público / searchable |
| Decree (Eyrie) | Cartas reveladas al tuckear (públicas) |
| Supporters (Alliance) | Solo Alliance; tamaño relevante por capacidad |
| Relacionamientos Vagabond | Público en su board |
| Ítems Vagabond face/damaged | Público en su board (como en físico) |

### 3.8 Undo / policy

- Undo solo de moves **no reveladores** y solo en el turno propio antes de confirmar fin de acción compuesta, o política estricta: undo local pre-commit; post-broadcast solo con consenso unánime.
- Recomendación MVP: **undo del último move legal no RNG** si ningún otro peer lo "vio" en UI de resolución; batallas y draws **no undo**.

### 3.9 Tests

Suite de escenarios unitarios citando secciones del Law (setup Marquise garrison, turmoil purge, outrage, ambush foil, dominance bird corners, Vagabond item capacity, etc.). Snapshots de `G` + seed.

---

## 4. Presentación 3D

### 4.1 Stack visual

- **React Three Fiber** + **drei** + Three.js.
- Física opcional (**Rapier**) solo si aporta (dados cayendo, empujes suaves); no es requisito de reglas.
- Assets **glTF** (+ Draco), texturas **KTX2** / Basis.
- Instancing para warriors repetidos; pooled meshes por tipo.

### 4.2 Escena

- Mesa de madera, tablero en el centro, faction boards alrededor según asientos, supply y score track, espacio de descarte, dados.
- Clearings como volúmenes clicables; paths como mesh o decals; forests zonas; río shader/agua simple.
- Piezas: meeples madera con tint por facción; buildings/tokens look cartón; cartas 2D en HTML overlay o planes texturizados.

### 4.3 Cámara y UX

- Orbit controls + pan limitado.
- Toggle **top-down** ortográfico para planning.
- **Focus clearing** (dolly + highlight).
- Highlight de moves legales (emissive / outline).
- Mano: fan 2D DOM sobre el canvas; zoom modal de carta; drag a targets 3D (clearing / decree slot).

### 4.4 Animaciones

- Move: lerp/arc de piezas.
- Battle: cámara corta + roll de dados (RNG ya resuelto; animación cosmética sync al resultado).
- Craft / build: spawn + score bump.
- Reducir motion si `prefers-reduced-motion`.

### 4.5 Fidelidad visual vs IP

- Siluetas y códigos de color jugables (naranja cats, azul birds, etc.) sin copiar ilustraciones oficiales.
- Suits: color **más ícono** (accesibilidad daltonismo).

### 4.6 Performance budget

- Target **60 fps** en laptop media (integrada reciente).
- Presupuesto orientativo: < 100 draw calls estáticos con instancing; LOD para tablero lejano; shadow map moderado o baked AO.
- Mobile: modo "performance" (menos luces, sin sombras dinámicas, menos MSAA); touch camera; **a verificar** si mobile es first-class o "best effort".
- Draco + KTX2; atlas de tokens; no Physics en mobile salvo dados.

### 4.7 Pipeline de assets

Blender → glTF 2.0 → `gltf-pipeline` / `gltfjsx` → Draco; texturas a KTX2; naming `faction_piece_variant`; licencias en `assets/LICENSE.md`.

---

## 5. Networking (sin game server)

### 5.1 Flujo de lobby

1. Host crea room → genera `roomCode` + seed + link (`?room=XXXX`).
2. Host elige facciones disponibles / seats.
3. Peers entran con código; claim seat; ready.
4. Host arranca setup; estado inicial sync.
5. Durante partida: peer envía **intent** (move); host valida; host broadcast `G` filtrado + log.

### 5.2 Señalización: comparación

| Opción | Pros | Contras |
|--------|------|---------|
| **Trystero** (Nostr / BitTorrent / MQTT relays públicos) | Sin infra propia; room por código; multi-strategy | Dependés de relays públicos; privacidad limitada del signaling |
| **PeerJS** (broker gratis) | API simple DataConnections | Broker de terceros = SPOF; límites/rate |
| **Copy-paste SDP manual** | Cero deps de signaling | UX horrible; solo fallback debug |

**Recomendación:** Trystero primero; PeerJS como plan B; SDP manual solo en devtools.

### 5.3 NAT / STUN / TURN

- **STUN** público (p. ej. Google STUN) para la mayoría de NATs.
- **TURN** necesario en NATs estrictos / symmetric. Sin TURN gratis confiable al 100%: opción self-host barato (coturn) o servicio pago chico; **limitación honesta del MVP:** algunos jugadores corporativos/móviles no van a conectar P2P puro.
- Documentar "si no conecta, pedile al otro que hostee / usar hotspot".

### 5.4 Autoridad, hidden state, anti-cheat

- Host authoritative: el motor corre en host; clients son views + input.
- Filter per-player: no mandar manos ajenas.
- Anti-cheat en P2P es **débil**: un host malicioso puede hacer trampa. Mitigaciones: log de moves + seed para replay audit; checksum de `G`; para amigos alcanza. No vender como "torneo antitrampa".

### 5.5 Reconexión, host migration, save

- Reconnect: mismo playerId + room; host reenvía snapshot.
- Host migration: difícil en P2P puro. MVP: **export JSON** (`root-save.json`) + localStorage en host; si cae el host, alguien carga el save y rehostea (semi-manual).
- Post-MVP: elegir nuevo host con mismo seed+log de moves y resimular (si el log es completo y RNG estable).

### 5.6 Espectadores y latencia

- Spectator seat: vista sin secretos de nadie o con niebla opcional.
- Latency: UI optimista solo para hover; commits esperan ACK del host; timeouts y "host thinking".
- Orden de mensajes: seq numbers; ignorar stale.

---

## 6. Tech stack y repo

### 6.1 Stack propuesto

- **Monorepo** (pnpm workspaces o Turborepo).
- `packages/engine`: TS puro, sin React; estado + moves + tests (Vitest).
- `packages/client`: Vite + React + TS + R3F + boardgame.io client bindings o store propio.
- `packages/assets` o `/assets`: glTF, texturas, manifests.
- Opcional `packages/signaling-docs` no código.
- Lint/format: ESLint + Prettier; CI GitHub Actions (test engine + typecheck + build static).
- Deploy: build estático a GitHub Pages / Netlify.

### 6.2 boardgame.io

Útil por turns, multiplayer transport pluggable, playerView, bots API. El transport oficial asume servidor; **hay que escribir un transport WebRTC** (host = "server" lógico). Alternativa: motor propio inspirado en BGIO si el transport duele más que beneficia. Decisión de spike en semana 1–2.

### 6.3 Estructura ejemplo

```text
root-3d/
  packages/
    engine/     # G, moves, factions, tests
    client/     # UI 2D + R3F scene + net
  assets/
  BRIEF.md
  README.md
  pnpm-workspace.yaml
```

---

## 7. Legal / IP

- *Root* y su arte son **copyright de Leder Games** (y licenciados según producto). Cole Wehrle (diseño), Kyle Ferrin (arte).
- Existe **adaptación digital oficial** publicada con **Dire Wolf Digital** (Steam / mobile). Conviene conocerla: no competir comercialmente ni confundir marca.
- **Uso personal / privado** entre amigos: riesgo bajo pero no es "derecho automático" de redistribuir el juego.
- **Publicar** (itch.io, repo público jugable con assets lookalike, marketing): requiere permiso / licencia. Recomendación:
  - Arte **original** (inspirado, no copia).
  - No usar logos ni nombre de producto de forma que implique endorsement.
  - Contactar Leder si se quiere release público.
  - En el README: "fan project no oficial, sin afiliación".
- Este brief **no** es asesoramiento legal.

---

## 8. Roadmap, esfuerzo, riesgos

### 8.1 Hitos (orden sugerido)

| Hito | Qué entrega | Esfuerzo rough |
|------|-------------|----------------|
| H0 Spike | Repo + engine hello (un move) + R3F tablero plano + Trystero room vacía | 1–2 semanas |
| H1 Engine core | Setup + Marquise turn completo + tests Law | 3–5 semanas |
| H2 4 facciones | Eyrie + Alliance + Vagabond + batalla + craft + win | 6–10 semanas |
| H3 3D fideliadad | Piezas, boards, animaciones, cámara, highlights | 4–8 semanas (en paralelo parcial) |
| H4 Net sólido | Lobby, sync, hidden info, save/load, reconnect básico | 3–5 semanas |
| H5 MVP polish | Tutorial mínimo, bugs, performance pass | 2–4 semanas |
| **MVP jugable amigos** | | **~4–7 meses** part-time |
| H6+ Expansiones / mapas | Por facción pack | 1–3 meses c/u según complejidad |

Estimaciones para un dev solo part-time; ajustar si hay ayuda en arte 3D.

### 8.2 Riesgos

- Asimetría brutal: cada facción es un subjuego (Vagabond e ítems son el mayor pozo).
- WebRTC + NAT sin TURN = frustración real.
- boardgame.io + transport custom puede pelearse con fases asimétricas.
- Scope 3D + rules + net: tentación de over-polish visual antes de reglas sólidas.
- IP si se comparte en público.
- Burnout: priorizar engine tests > shaders bonitos.

### 8.3 Preguntas abiertas para Maxi

1. ¿Prioridad mobile o solo desktop?
2. ¿Trystero (Nostr vs MQTT vs BitTorrent) cuál preferís probar primero?
3. ¿Aceptás dependencia de un TURN barato self-hosted más adelante?
4. ¿Arte: low-poly propio desde día 1, o placeholders geométricos hasta vertical slice?
5. ¿boardgame.io o motor propio? (spike decide)
6. ¿Objetivo solo mesa privada con amigos, o algún día build público?
7. ¿Querés spectator y replay en MVP o después?
8. ¿Física de dados sí o animación procedural sin Rapier?

---

## 9. Criterios de "MVP listo"

- 4 jugadores pueden terminar una partida Autumn con las 4 facciones base sin house rules.
- Estado save/load en host funciona.
- Hidden info no se filtra en el wire (test manual + assert en playerView).
- 60 fps en escena media en tu laptop Linux.
- README con cómo hostear, limitaciones NAT, disclaimer IP.

---

## 10. Fuentes citadas

1. Leder Games – Resources (Law of Root Oct 2025 PDF y materiales): https://ledergames.com/pages/resources  
2. Law of Root (October 13, 2025), PDF vía Cardboard Appendix: https://files.cardboardappendix.com/root/root-base-law-oct-2025.pdf  
3. Leder Rules Library: https://rules.ledergames.com/?product=root  
4. The Root Database – Components (Appendix C): https://www.therootdatabase.com/law/components/en/  
5. The Root Database – Autumn map: https://www.therootdatabase.com/map/autumn/?lang=en  
6. The Root Database – Key Concepts: https://www.therootdatabase.com/law/key-concepts/en/  
7. Leder Games – producto Root (listado de componentes): https://ledergames.com/products/root-a-game-of-woodland-might-and-right  
8. BoardGameGeek – Root (237182) wiki / components discussions: https://boardgamegeek.com/boardgame/237182/root  
9. Make Craft Game – Root Deck Composition (conteos de suit del mazo base): https://makecraftgame.com/2023/02/24/root-deck-composition/  
10. Dire Wolf Digital – Root digital: https://www.direwolfdigital.com/root/ y https://ledergames.com/products/root-digital  
11. Leder Card Library (cartas): https://cards.ledergames.com  

**Nota:** conteos de Appendix C del Law y del producto Leder se toman como fuente primaria para piezas. Conteos internos del mazo por nombre de carta y caras exactas de dados: contrastar con físico / Card Library antes de hardcodear; mientras tanto etiquetar **a verificar** en código (`// verify against Law / cards`).

---

*Fin del brief. Próximo paso sugerido: H0 spike (engine + escena + room P2P) sin pixel-perfect.*
