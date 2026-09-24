# Code Quest: JavaScript Arena

A browser-based 3D JavaScript quiz game built with Three.js and vanilla JavaScript. Explore wide hedge mazes in a park as an animated human character.

**Project guide:** [Read the end-to-end overview](PROJECT_BRIEF.md) for the game idea, player flow, distinctive details, and technical architecture.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use `npm run build` to create a production build, `npm run preview` to serve it, and `npm run test` to check that every maze destination is reachable.

## Play

- Move with WASD or the arrow keys. Movement follows the camera's direction. Press Space to jump low barriers; tall walls remain impassable. Touch controls, including Jump, appear on small screens.
- Drag on the 3D scene to look in any direction, or use Q and E to turn from the keyboard. Use the mouse wheel to zoom.
- Explore the maze and approach a glowing coin to open its JavaScript output question. Some corners are deliberately empty. **Get a clue** gives a rough direction to the nearest coin or portal without skipping the search.
- Choose an answer with a button or number keys 1–4. Correct answers award 10 XP; wrong answers cost one life.
- At 30 XP, find and walk into the glowing portal. Explore the park maze, the inside of a house, and city roads to win.
- Click the Score, Lives, or Level cards for details.
- Press Escape to pause or resume. The top bar also has sound and restart controls; sound is off by default.

The bank contains exactly 50 JavaScript questions, mixed across all three worlds. Each coin independently draws from the complete bank, so questions are spread randomly and can repeat during a run or after restarting. No backend, account, or saved question history is used.

Scenery is batched into spatial groups, wall collisions use a spatial index, and particles share a fixed pool. Rendering pauses during dialogs and hidden tabs, but visual quality is prioritized: the game always uses the display’s native pixel density, 2048px shadows, richer lighting, reduced fog, ambient occlusion, and selective glow. Development-only diagnostics are available at `/?diagnostics`; these controls are excluded from production builds.

The animated human character is the Soldier model from the [Three.js examples](https://github.com/mrdoob/three.js/tree/r180/examples/models/gltf), originally from Mixamo, and is bundled at `public/models/Soldier.glb`.
