# Code Quest: JavaScript Arena — Project Brief

## Overview

Code Quest: JavaScript Arena is a browser-based 3D learning game that turns JavaScript output questions into an exploration challenge. Instead of presenting a standard quiz screen, it asks the player to navigate a maze, discover a code coin, reason about a short snippet, and earn enough XP to unlock the next world.

It combines the clarity of a learning exercise with the atmosphere of a small adventure game: the question is not the whole experience—it is a reward for finding your way through the world.

## The visitor experience

The game opens in a park maze and guides the player through a simple loop:

1. Move an animated character with keyboard, touch, and mouse camera controls.
2. Search a deliberately spacious maze; not every corner contains a reward.
3. Approach a glowing coin to open a JavaScript “What is the output?” challenge.
4. Earn 10 XP for a correct answer or lose a life after an incorrect one.
5. Charge the portal to 30 XP, find it, and enter the next environment.
6. Continue through an indoor house and a neon city road to complete the arena.

The 50-question bank is mixed across all worlds. Every coin makes an independent random draw, so questions can repeat and the quiz order changes from play to play.

## What makes it different

- **Questions live in the world.** A player does not click “next” through a quiz. They notice a coin, navigate to it, and then stop to solve code.
- **The mazes reward deliberate movement.** Coins are placed in selected cells rather than scattered everywhere, so some routes and corners are intentionally empty.
- **Three spaces change the tone.** The open Syntax Garden, enclosed Logic House, and glowing Async City make level progression feel like a change of place, not only a new question set.
- **Learning feedback keeps momentum.** Incorrect answers reveal the correct output and explanation, cost a life, and let the player continue rather than ending the game.
- **Movement has choices.** Low barriers can be jumped; tall walls force route planning. The camera can orbit freely while staying clear of walls.
- **Replay order stays fresh.** Each coin independently selects from the complete 50-question bank, so a question can appear at any point and can repeat.

## Worlds and gameplay systems

| World | Setting | Design purpose |
| --- | --- | --- |
| 1. The Syntax Garden | Wide hedge maze in a park | Introduces movement, discovery, coins, jumping, and portal progression. |
| 2. The Logic House | Interior rooms and corridors | Changes the mood and reinforces maze navigation in a tighter space. |
| 3. The Async City | City roads at dusk | Delivers a contrasting finale for more advanced JavaScript topics. |

Key systems include third-person follow camera controls, low-wall jumps, tall-wall collision, collectible animations, particle feedback, score/lives/level HUD, pause/restart/sound controls, and portal-based progression.

## How it is built

```text
HTML + CSS interface
        │
        ├── HUD, quiz modal, touch controls, keyboard-accessible actions
        │
JavaScript game controller
        │
        ├── player movement, camera, state, scoring, question selection
        ├── level lifecycle, portal and coin interactions
        └── responsive input and rendering control
        │
Three.js scene
        │
        ├── world builders: park / house / city
        ├── animated GLTF player character
        ├── lights, shadows, fog, ambient occlusion, bloom
        └── batched scenery, indexed collisions, pooled particles
```

The app uses Vite for local development and production builds. All quiz data lives in a local JavaScript data structure, making the project easy to run, review, and deploy as a static site.

## Technical details

### 3D scene and game systems

- Three.js scene composition, materials, lighting, shadows, fog, and post-processing.
- GLTF character loading and animation control.
- Third-person camera movement, pointer-driven look controls, zoom, and camera-wall safety checks.
- Maze generation, collision rules, jumping, collectible interaction, particles, portals, and level progression.

### Interface and input

- Vanilla JavaScript application state and event-driven UI updates.
- Responsive layout for desktop and touch devices.
- Semantic controls, focus-visible states, number-key answer selection, screen-reader updates, and a canvas fallback description.
- Clear separation between data, world construction, collision handling, rendering helpers, and game orchestration.

### Rendering and graphics quality

- Instanced/batched repeated scenery to reduce draw calls.
- Spatial wall index to avoid checking every wall for each collision or camera adjustment.
- Reusable temporary objects and a fixed particle pool to limit runtime allocation.
- Rendering suspension when dialogs are open or the browser tab is hidden.
- Quality-first rendering at the display’s native pixel density, 2048px shadows, ambient occlusion, and selective bloom.

### Questions and learning feedback

- 50 locally verified JavaScript output questions.
- Coverage includes variables, types, coercion, arrays, objects, functions, scope, closures, promises, async/await, and common output traps.
- Immediate answer feedback explains the correct result, reinforcing learning during play.

## Verification

Run the following from the project directory:

```sh
npm install
npm run dev
npm run test
npm run build
```

The automated checks validate all question answers against JavaScript execution, confirm the 50-question bank is valid, verify random selection accepts repeats, confirm maze destinations are reachable, and compare indexed collision behavior with the original collision rules. The production build is generated with Vite.

For development-only rendering measurements, open `/?diagnostics`. The diagnostics controls are excluded from production builds.

## Design and engineering choices

- **No backend:** The game is a static experience. Questions, worlds, and progression all run locally in the browser, keeping it simple to run and easy to deploy.
- **Random, repeatable quiz selection:** Each coin can draw any bank question. This makes each run less predictable without collecting or storing player data.
- **Efficient scene, richer final image:** Batching, pooling, and spatial indexing remove unnecessary work. That leaves room for native-density rendering, detailed shadows, ambient occlusion, and restrained glow.
- **Multiple ways to play:** Keyboard, mouse, touch controls, visible focus states, number-key answers, and screen-reader announcements complement the 3D interaction.

## A good first playthrough

1. Start the game and move through the first maze with WASD and mouse look.
2. Collect a coin, answer a question, and inspect the feedback flow.
3. Jump a low barrier, then compare it with a tall impassable wall.
4. Review the HUD details, pause/restart controls, and touch controls at a narrow viewport.
5. Open a second or third world to see how the environment, lighting, and maze dressing change while the core rules stay familiar.

## Credits

The animated Soldier model is supplied by the [Three.js examples](https://github.com/mrdoob/three.js/tree/r180/examples/models/gltf) and originated from Mixamo. The game is built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).
