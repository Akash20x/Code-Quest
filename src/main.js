import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { levels, questions, LEVEL_TARGET, POINTS_PER_ANSWER } from './questions.js';
import { cellPosition, getCoinCells, START_CELL, PORTAL_CELL } from './park.js';
import { buildWorld } from './worlds.js';
import { batchScenery, disposeGroup, ParticlePool } from './rendering.js';
import { WallIndex } from './collision.js';
import './style.css';

const dom = new Map();
const $ = (selector) => { if (!dom.has(selector)) dom.set(selector, document.querySelector(selector)); return dom.get(selector); };
const canvas = $('#game-canvas');
const overlay = $('#overlay');
const modal = $('#question-modal');
const toast = $('#toast');
const srStatus = $('#screen-reader-status');
let coinPositions = [];
const preferences = { speed: 6, sensitivity: 6 };
let currentQuestion = null;
let verticalSpeed = 0;
let frameRequest = 0;
let renderDirty = true;
// Quality-first rendering: always use the display's complete native density.
const nativePixelRatio = window.devicePixelRatio || 1;
const directionVector = new THREE.Vector3();
const desiredCameraVector = new THREE.Vector3();
const cameraOrigin = new THREE.Vector3();
const safeCameraVector = new THREE.Vector3();
const cameraCheckVector = new THREE.Vector3();

function requestFrame() {
  if (!frameRequest && !document.hidden) frameRequest = requestAnimationFrame(animate);
}
function invalidate() { renderDirty = true; requestFrame(); }

const state = {
  phase: 'intro', level: 0, score: 0, lives: 3,
  answered: new Set(), currentCoin: -1, answerLocked: false,
  sound: false, approachCooldown: 0, portalCooldown: 0
};
const keys = new Set();
const touchKeys = new Set();
const view = { yaw: 0, pitch: 0.48, distance: 6.6, dragging: false, lastX: 0, lastY: 0 };
const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(nativePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const environmentGenerator = new THREE.PMREMGenerator(renderer);
const studioEnvironment = new RoomEnvironment();
const environmentTarget = environmentGenerator.fromScene(studioEnvironment, 0.05);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = 0.36;
studioEnvironment.dispose();
environmentGenerator.dispose();
const composer = new EffectComposer(renderer);
composer.setPixelRatio(nativePixelRatio);
const renderPass = new RenderPass(scene, camera);
const ambientOcclusion = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ambientOcclusion.kernelRadius = 11;
ambientOcclusion.minDistance = 0.003;
ambientOcclusion.maxDistance = 0.16;
// Restrict bloom to deliberate emissive highlights; bright paths must remain crisp.
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.24, 0.28, 1.25);
composer.addPass(renderPass);
composer.addPass(ambientOcclusion);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function renderScene() { composer.render(); }
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  state.phase = 'error';
  setOverlay('Graphics interrupted.', 'The 3D display stopped responding. Reload the game to try again.', 'Reload game', () => window.location.reload(), 'Display error');
});

const world = new THREE.Group();
scene.add(world);
const decoration = new THREE.Group();
world.add(decoration);
const coinGroup = new THREE.Group();
world.add(coinGroup);
const particlePool = new ParticlePool(world);
let coins = [];
let mazeWalls = [];
let wallIndex = new WallIndex([]);
let audioContext;
let toastTimer;

function safeCameraPosition(desired, output = safeCameraVector) {
  cameraOrigin.set(player.position.x, player.position.y + 1.45, player.position.z);
  return output.copy(cameraOrigin).lerp(desired, wallIndex.cameraFraction(cameraOrigin, desired));
}

scene.add(new THREE.HemisphereLight(0xddeeff, 0x6c7955, 1.08));
const sun = new THREE.DirectionalLight(0xffeed2, 3.25);
sun.position.set(-12, 19, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 0.5, far: 100 });
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.00015;
sun.shadow.radius = 1.25;
scene.add(sun);
const portalLight = new THREE.PointLight(0x32dcff, 5, 16);
portalLight.position.set(0, 3, cellPosition(...PORTAL_CELL)[1]);
scene.add(portalLight);

function material(color, emissive = color, intensity = 0) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.28, emissive, emissiveIntensity: intensity });
}
const player = new THREE.Group();
world.add(player);
let playerMixer;
let idleAction;
let moveAction;
let currentAction;

function createHumanFallback() {
  const human = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc78d6d, roughness: 0.86 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x358d87, roughness: 0.91 });
  const pants = new THREE.MeshStandardMaterial({ color: 0x273b54, roughness: 0.94 });
  const shoes = new THREE.MeshStandardMaterial({ color: 0x36312c, roughness: 0.95 });
  const hair = new THREE.MeshStandardMaterial({ color: 0x32231e, roughness: 0.98 });
  const add = (parent, geometry, meshMaterial, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  add(human, new THREE.BoxGeometry(0.57, 0.72, 0.32), shirt, 0, 1.12, 0);
  add(human, new THREE.BoxGeometry(0.44, 0.3, 0.31), pants, 0, 0.66, 0);
  add(human, new THREE.CylinderGeometry(0.12, 0.13, 0.18, 10), skin, 0, 1.55, 0);
  const head = add(human, new THREE.SphereGeometry(0.25, 16, 12), skin, 0, 1.8, 0);
  head.scale.set(0.9, 1.14, 0.9);
  add(human, new THREE.SphereGeometry(0.24, 16, 8), hair, 0, 1.99, 0.04).scale.set(0.96, 0.45, 0.96);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.38, 1.42, 0);
    add(arm, new THREE.CylinderGeometry(0.115, 0.095, 0.4, 10), shirt, 0, -0.2, 0);
    add(arm, new THREE.CylinderGeometry(0.09, 0.08, 0.39, 10), skin, 0, -0.58, 0);
    human.add(arm);
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.62, 0);
    add(leg, new THREE.CylinderGeometry(0.12, 0.1, 0.5, 10), pants, 0, -0.25, 0);
    add(leg, new THREE.CylinderGeometry(0.095, 0.09, 0.44, 10), pants, 0, -0.68, 0);
    add(leg, new THREE.BoxGeometry(0.19, 0.12, 0.33), shoes, 0, -0.92, -0.07);
    human.add(leg);
    if (side === -1) { human.userData.leftArm = arm; human.userData.leftLeg = leg; }
    else { human.userData.rightArm = arm; human.userData.rightLeg = leg; }
  }
  return human;
}

const fallbackHuman = createHumanFallback();
player.add(fallbackHuman);
new GLTFLoader().load('/models/Soldier.glb', (gltf) => {
  const human = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(human);
  const height = bounds.getSize(new THREE.Vector3()).y;
  const scale = height > 0 ? 2.05 / height : 1;
  human.scale.setScalar(scale);
  human.position.y = -bounds.min.y * scale;
  human.rotation.y = 0;
  human.traverse((part) => {
    if (part.isMesh) { part.castShadow = true; part.receiveShadow = true; }
  });
  player.add(human);
  fallbackHuman.visible = false;
  playerMixer = new THREE.AnimationMixer(human);
  idleAction = playerMixer.clipAction(gltf.animations.find((clip) => /idle/i.test(clip.name)) || gltf.animations[0]);
  moveAction = playerMixer.clipAction(gltf.animations.find((clip) => /run/i.test(clip.name)) || gltf.animations.find((clip) => /walk/i.test(clip.name)) || gltf.animations[0]);
  currentAction = idleAction;
  currentAction.play();
  invalidate();
}, undefined, () => {
  announce('Character model unavailable. A human figure is shown instead.');
});

const portal = new THREE.Group();
const portalMat = new THREE.MeshBasicMaterial({ color: 0x334a64, transparent: true, opacity: 0.65 });
const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.14, 16, 80), portalMat);
ring.position.y = 2.2;
portal.add(ring);
const innerRing = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.035, 8, 80), new THREE.MeshBasicMaterial({ color: 0x405375, transparent: true, opacity: 0.55 }));
innerRing.position.y = 2.2;
portal.add(innerRing);
const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({ color: 0x7a93ac, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
portalDisc.position.set(0, 2.2, 0.1);
portal.add(portalDisc);
const [portalX, portalZ] = cellPosition(...PORTAL_CELL);
portal.position.set(portalX, 0, portalZ);
const portalFrame = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.18, 12, 80), material(0x243c43));
portalFrame.position.y = 2.2;
portalFrame.castShadow = true;
portal.add(portalFrame);
const portalBase = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.05, 0.14, 48), material(0x455b61));
portalBase.position.y = 0.05;
portalBase.receiveShadow = true;
portal.add(portalBase);
world.add(portal);

function buildArena() {
  const level = levels[state.level];
  scene.background = new THREE.Color(level.sky);
  // A light atmospheric depth cue without washing the maze into a haze.
  scene.fog = new THREE.FogExp2(level.sky, 0.0024);
  sun.color.set(state.level === 2 ? 0xffcf99 : 0xffeed2);
  sun.position.set(state.level === 2 ? -17 : -12, state.level === 2 ? 12 : 19, 10);
  portalLight.color.set(level.color);
  disposeGroup(decoration);
  disposeGroup(coinGroup);
  particlePool.clear();
  currentQuestion = null;
  coins = [];
  mazeWalls = buildWorld(decoration, state.level, level);
  batchScenery(decoration);
  wallIndex = new WallIndex(mazeWalls);
  coinPositions = getCoinCells(state.level).map(([col, row]) => cellPosition(col, row));
  const coinFaceGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.13, 32);
  const coinFaceMaterial = material(0xffd86f, 0xffaf2f, 0.8);
  const glyphGeometry = new THREE.TorusGeometry(0.27, 0.038, 8, 32);
  const glyphMaterial = new THREE.MeshBasicMaterial({ color: 0xfff4bc });
  const haloGeometry = new THREE.TorusGeometry(0.67, 0.022, 6, 48);
  const haloMaterial = new THREE.MeshBasicMaterial({ color: 0xffd46b, transparent: true, opacity: 0.6 });
  const plinthGeometry = new THREE.CylinderGeometry(0.7, 0.85, 0.12, 24);
  const plinthMaterial = material(0xa9a38a, level.color, 0.08);

  coinPositions.forEach(([x, z], index) => {
    const group = new THREE.Group();
    group.position.set(x, 1.28, z);
    const face = new THREE.Mesh(coinFaceGeometry, coinFaceMaterial);
    face.rotation.x = Math.PI / 2;
    face.castShadow = true;
    group.add(face);
    const glyph = new THREE.Mesh(glyphGeometry, glyphMaterial);
    group.add(glyph);
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    group.add(halo);
    const plinth = new THREE.Mesh(plinthGeometry, plinthMaterial);
    plinth.position.set(0, -1.16, 0);
    plinth.receiveShadow = true;
    group.add(plinth);
    coinGroup.add(group);
    coins.push({ group, face, halo, index, active: true, baseY: 1.28 });
  });

  const [spawnX, spawnZ] = cellPosition(...START_CELL);
  player.position.set(spawnX, 0, spawnZ);
  verticalSpeed = 0;
  player.rotation.y = 0;
  view.yaw = 0;
  view.pitch = 0.33;
  view.distance = 5.8;
  camera.position.copy(safeCameraPosition(new THREE.Vector3(spawnX, 1.2 + Math.sin(view.pitch) * view.distance, spawnZ + Math.cos(view.pitch) * view.distance)));
  updatePortal();
  document.documentElement.style.setProperty('--accent', level.accent);
  document.documentElement.style.setProperty('--accent-soft', `${level.accent}33`);
  document.documentElement.style.setProperty('--panel', ['#142622df', '#302837e8', '#152536e8'][state.level]);
  updateHUD();
  invalidate();
}

function updateHUD() {
  const level = levels[state.level];
  const charge = Math.min(state.score, LEVEL_TARGET);
  $('#level-counter').textContent = `Level ${String(state.level + 1).padStart(2, '0')} / 03`;
  $('#level-name').textContent = level.name;
  $('#level-description').textContent = level.description;
  $('#score-value').textContent = String(state.score);
  $('#lives-value').textContent = Array.from({ length: 3 }, (_, i) => i < state.lives ? '♥' : '♡').join(' ');
  $('#level-value').textContent = String(state.level + 1);
  $('#progress-label').textContent = `${charge} / ${LEVEL_TARGET} XP`;
  $('#progress-fill').style.width = `${charge / LEVEL_TARGET * 100}%`;
  $('#progress-bar').setAttribute('aria-valuenow', String(charge));
  $('#portal-hint').textContent = state.score >= LEVEL_TARGET
    ? 'Portal online! Find the glowing ring and walk into it.'
    : `${Math.ceil((LEVEL_TARGET - state.score) / POINTS_PER_ANSWER)} correct ${LEVEL_TARGET - state.score === POINTS_PER_ANSWER ? 'answer' : 'answers'} until the portal opens.`;
  $('#next-challenge').innerHTML = state.score >= LEVEL_TARGET ? 'Locate portal <span>↗</span>' : 'Get a clue <span>↗</span>';
  $('#next-challenge').disabled = state.phase !== 'active' || (state.score < LEVEL_TARGET && !coins.some((c) => c.active));
}

function pulseStat(id) {
  const element = $(id);
  element.classList.remove('stat-pop');
  void element.offsetWidth;
  element.classList.add('stat-pop');
}

function jump() {
  if (state.phase !== 'active' || player.position.y > 0.02) return;
  verticalSpeed = 7.4;
  pulseStat('#level-stat');
  playTone(320, 0.07);
}

function updatePortal() {
  const ready = state.score >= LEVEL_TARGET;
  const color = ready ? levels[state.level].color : 0x3c526f;
  ring.material.color.set(color);
  innerRing.material.color.set(ready ? 0xffffff : 0x435472);
  portalDisc.material.color.set(color);
  portalDisc.material.opacity = ready ? 0.27 : 0.08;
  portalLight.intensity = ready ? 7 : 0.5;
}

function setOverlay(title, copy, button, onClick, eyebrow = 'Mission status') {
  $('#overlay-title').textContent = title;
  $('#overlay-copy').textContent = copy;
  $('.eyebrow').textContent = eyebrow;
  $('.intro-symbol').textContent = eyebrow === 'Game paused' ? 'Ⅱ' : eyebrow === 'Quest complete' ? '★' : '!';
  $('#overlay-primary').innerHTML = `${button} <span>→</span>`;
  $('#overlay-primary').onclick = onClick;
  overlay.classList.remove('is-intro');
  overlay.classList.remove('hidden');
  syncBackgroundFocus();
  $('#overlay-primary').focus();
}

function syncBackgroundFocus() {
  const blocked = !overlay.classList.contains('hidden') || !modal.classList.contains('hidden');
  canvas.inert = blocked;
  $('.topbar').inert = blocked;
  $('main').inert = blocked;
  invalidate();
}

function hideOverlay() { overlay.classList.add('hidden'); syncBackgroundFocus(); }

function startGame() {
  clock.getDelta();
  state.phase = 'active';
  hideOverlay();
  updateHUD();
  canvas.focus();
  announce('Maze started. Move with WASD or arrow keys to find coins. Get a clue if you need a direction.');
}

function resetGame() {
  state.level = 0;
  state.score = 0;
  state.lives = 3;
  state.answered = new Set();
  state.currentCoin = -1;
  currentQuestion = null;
  state.approachCooldown = 0;
  touchKeys.clear();
  modal.classList.add('hidden');
  verticalSpeed = 0;
  keys.clear();
  buildArena();
  startGame();
  showToast('New run started.');
}

function pauseGame() {
  if (state.phase !== 'active') return;
  state.phase = 'paused';
  keys.clear();
  setOverlay('Taking a breather?', 'The arena is waiting. Resume whenever you are ready.', 'Resume game', resumeGame, 'Game paused');
  $('#pause-button').innerHTML = '▶ <span>Resume</span>';
  announce('Game paused.');
}

function resumeGame() {
  if (state.phase !== 'paused') return;
  $('#pause-button').innerHTML = 'Ⅱ <span>Pause</span>';
  startGame();
}

function announce(message) { srStatus.textContent = message; }

function showToast(message, good = true) {
  toast.textContent = message;
  toast.classList.toggle('bad', !good);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2700);
}

function playTone(frequency, duration = 0.13, type = 'sine') {
  if (!state.sound) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.06, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Audio is optional. */ }
}

function openQuestion(index) {
  if (state.phase !== 'active' || !coins[index]?.active) return;
  // Each coin makes an independent draw from the complete mixed bank. Repeats are allowed.
  const question = questions[Math.floor(Math.random() * questions.length)];
  currentQuestion = question;
  state.phase = 'question';
  state.currentCoin = index;
  state.answerLocked = false;
  keys.clear();
  touchKeys.clear();
  modal.dataset.questionId = question.id;
  $('#question-topic').textContent = question.topic;
  $('#question-code').textContent = question.code;
  $('#answer-feedback').className = 'answer-feedback hidden';
  $('#answer-feedback').textContent = '';
  $('#question-continue').classList.add('hidden');
  const options = $('#answer-options');
  options.replaceChildren();
  question.options.forEach((option, answerIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-button';
    button.innerHTML = `<span class="answer-number">${answerIndex + 1}</span><span></span>`;
    button.lastElementChild.textContent = option;
    button.addEventListener('click', () => answerQuestion(answerIndex));
    options.append(button);
  });
  modal.classList.remove('hidden');
  syncBackgroundFocus();
  options.firstElementChild?.focus();
  announce(`Challenge: ${question.topic}. What is the output?`);
  playTone(620, 0.1);
  updateHUD();
}

function emitParticles(position, color) { particlePool.emit(position, color); }

function answerQuestion(answerIndex) {
  if (state.phase !== 'question' || state.answerLocked) return;
  if (!currentQuestion || answerIndex < 0 || answerIndex >= currentQuestion.options.length) return;
  state.answerLocked = true;
  const index = state.currentCoin;
  const question = currentQuestion;
  const correct = answerIndex === question.answer;
  const buttons = [...$('#answer-options').children];
  buttons.forEach((button, i) => {
    button.disabled = true;
    if (i === question.answer) button.classList.add('correct');
    else if (i === answerIndex) button.classList.add('incorrect');
  });
  const feedback = $('#answer-feedback');
  feedback.classList.remove('hidden');
  feedback.classList.toggle('wrong', !correct);
  feedback.innerHTML = '';
  const heading = document.createElement('strong');
  heading.textContent = correct ? 'Correct! +10 XP' : `Not quite. The output is ${question.options[question.answer]}.`;
  const explanation = document.createElement('span');
  explanation.textContent = question.explanation;
  feedback.append(heading, explanation);
  if (correct) {
    state.score += POINTS_PER_ANSWER;
    pulseStat('#score-stat');
    playTone(780, 0.13);
    setTimeout(() => playTone(1040, 0.18), 100);
    emitParticles(coins[index].group.position, 0xffdc7a);
  } else {
    state.lives -= 1;
    pulseStat('#lives-stat');
    playTone(180, 0.24, 'sawtooth');
  }
  coins[index].active = false;
  coins[index].group.visible = false;
  state.answered.add(index);
  updatePortal();
  updateHUD();
  $('#question-continue').classList.remove('hidden');
  $('#question-continue').focus();
  announce(`${heading.textContent} ${question.explanation}`);
  invalidate();
}

function closeQuestion() {
  if (state.phase !== 'question' || !state.answerLocked) return;
  modal.classList.add('hidden');
  syncBackgroundFocus();
  state.currentCoin = -1;
  currentQuestion = null;
  state.approachCooldown = 1.1;
  clock.getDelta();
  if (state.lives <= 0) {
    state.phase = 'gameover';
    setOverlay('Run complete.', `You reached level ${state.level + 1} with ${state.score} XP. Try again and keep an eye on JavaScript's tricky conversions.`, 'Try again', resetGame, 'Out of lives');
    return;
  }
  if (!coins.some((coin) => coin.active) && state.score < LEVEL_TARGET) {
    state.phase = 'gameover';
    setOverlay('The portal needs more charge.', 'All code coins have been used. Start another run to solve enough questions to open the portal.', 'Try again', resetGame, 'No coins left');
    return;
  }
  state.phase = 'active';
  if (state.score >= LEVEL_TARGET) showToast('Portal online! Find the glowing ring to advance.');
  else showToast('Keep exploring for more code coins.');
  canvas.focus();
  updateHUD();
}

function enterPortal() {
  if (state.phase !== 'active' || state.score < LEVEL_TARGET) return;
  playTone(880, 0.4);
  if (state.level === levels.length - 1) {
    state.phase = 'complete';
    setOverlay('Arena cleared!', 'You solved your way through all three worlds. The Async Core is yours.', 'Play again', resetGame, 'Quest complete');
    announce('Arena cleared. You completed all three levels.');
    return;
  }
  state.level += 1;
  pulseStat('#level-stat');
  state.score = 0;
  state.answered = new Set();
  state.approachCooldown = 1.5;
  buildArena();
  showToast(`Level ${state.level + 1}: ${levels[state.level].name}`);
  announce(`Level ${state.level + 1}. ${levels[state.level].name}.`);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.fov = width < 700 ? 65 : 58;
  camera.updateProjectionMatrix();
  invalidate();
}

function animate() {
  frameRequest = 0;
  const rawDt = clock.getDelta();
  const dt = Math.min(rawDt, 0.05);
  if (document.hidden) return;
  if (state.phase !== 'active') {
    if (renderDirty) renderScene();
    renderDirty = false;
    return;
  }
  renderDirty = false;
  const elapsed = clock.elapsedTime;
  const moving = state.phase === 'active';
  let walking = false;
  if (moving) {
    if (player.position.y > 0 || verticalSpeed > 0) {
      verticalSpeed -= 18 * dt;
      player.position.y = Math.max(0, player.position.y + verticalSpeed * dt);
      if (player.position.y === 0) verticalSpeed = 0;
    }
    state.approachCooldown = Math.max(0, state.approachCooldown - dt);
    state.portalCooldown = Math.max(0, state.portalCooldown - dt);
    const pressed = (key) => keys.has(key) || touchKeys.has(key);
    const turn = Number(pressed('q')) - Number(pressed('e'));
    if (turn) {
      view.yaw += turn * dt * 1.7;
      $('#look-hint').classList.add('hidden');
    }
    const sideways = Number(pressed('d') || pressed('arrowright') || pressed('right')) - Number(pressed('a') || pressed('arrowleft') || pressed('left'));
    const forward = Number(pressed('w') || pressed('arrowup') || pressed('up')) - Number(pressed('s') || pressed('arrowdown') || pressed('down'));
    const direction = directionVector.set(
      Math.cos(view.yaw) * sideways - Math.sin(view.yaw) * forward,
      0,
      -Math.sin(view.yaw) * sideways - Math.cos(view.yaw) * forward
    );
    if (direction.lengthSq() > 0) {
      direction.normalize();
      const nextX = player.position.x + direction.x * dt * preferences.speed;
      const nextZ = player.position.z + direction.z * dt * preferences.speed;
      if (!wallIndex.collides(nextX, player.position.z, 0.38, player.position.y)) player.position.x = nextX;
      if (!wallIndex.collides(player.position.x, nextZ, 0.38, player.position.y)) player.position.z = nextZ;
      player.rotation.y = Math.atan2(-direction.x, -direction.z);
      walking = true;
    } else if (turn || view.dragging) player.rotation.y = view.yaw;
    if (state.approachCooldown === 0) {
      const nearby = coins.find((coin) => coin.active && Math.hypot(player.position.x - coin.group.position.x, player.position.z - coin.group.position.z) < 1.35);
      if (nearby) openQuestion(nearby.index);
    }
    if (state.portalCooldown === 0 && state.score >= LEVEL_TARGET && Math.hypot(player.position.x - portal.position.x, player.position.z - portal.position.z) < 1.8) enterPortal();
  }

  if (playerMixer) {
    const nextAction = walking ? moveAction : idleAction;
    if (nextAction && nextAction !== currentAction) {
      currentAction?.fadeOut(0.2);
      nextAction.reset().fadeIn(0.2).play();
      currentAction = nextAction;
    }
    playerMixer.update(dt);
  } else {
    const stride = walking ? Math.sin(elapsed * 11) * 0.48 : 0;
    fallbackHuman.userData.leftArm.rotation.x = stride;
    fallbackHuman.userData.rightArm.rotation.x = -stride;
    fallbackHuman.userData.leftLeg.rotation.x = -stride;
    fallbackHuman.userData.rightLeg.rotation.x = stride;
  }

  const orbitRadius = view.distance * Math.cos(view.pitch);
  const desiredCamera = desiredCameraVector.set(
    player.position.x + Math.sin(view.yaw) * orbitRadius,
    1.2 + player.position.y + Math.sin(view.pitch) * view.distance,
    player.position.z + Math.cos(view.yaw) * orbitRadius
  );
  const safeCamera = safeCameraPosition(desiredCamera);
  camera.position.lerp(safeCamera, Math.min(1, dt * 4));
  if (camera.position.distanceToSquared(safeCameraPosition(camera.position, cameraCheckVector)) > 0.01) camera.position.copy(safeCamera);
  camera.lookAt(player.position.x - Math.sin(view.yaw) * 3, 1.3 + player.position.y, player.position.z - Math.cos(view.yaw) * 3);
  coins.forEach((coin, index) => {
    if (!coin.active) return;
    coin.group.position.y = coin.baseY + Math.sin(elapsed * 2.7 + index * 0.7) * 0.14;
    coin.face.rotation.z += dt * 1.5;
    coin.halo.rotation.z -= dt * 0.65;
  });
  ring.rotation.z = Math.sin(elapsed * 0.9) * 0.045;
  innerRing.rotation.z = -elapsed * 0.12;
  if (state.score >= LEVEL_TARGET) portalDisc.material.opacity = 0.2 + (Math.sin(elapsed * 3) + 1) * 0.07;
  particlePool.update(dt);
  renderScene();
  if (state.phase === 'active') requestFrame();
}

window.addEventListener('resize', resize);
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  // During play, Space belongs to the game even if a HUD control was the last
  // clicked element. Prevent the browser from firing that button a second time.
  if (state.phase === 'active' && key === ' ') {
    event.preventDefault();
    document.activeElement?.blur();
    if (!event.repeat) jump();
    return;
  }
  if (document.activeElement?.matches('button') && key === 'enter') return;
  if (state.phase === 'active' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) event.preventDefault();
  if (key === 'escape') {
    if (state.phase === 'active') pauseGame();
    else if (state.phase === 'paused') resumeGame();
    return;
  }
  if (state.phase === 'question' && !state.answerLocked && /^[1-4]$/.test(key)) {
    answerQuestion(Number(key) - 1);
    return;
  }
  if (state.phase === 'active') keys.add(key);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touchKeys.clear(); });
document.addEventListener('visibilitychange', () => {
  keys.clear(); touchKeys.clear();
  if (frameRequest) cancelAnimationFrame(frameRequest);
  frameRequest = 0;
  clock.getDelta();
  if (!document.hidden) invalidate();
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('pointerdown', (event) => {
  if (state.phase !== 'active' || (event.pointerType === 'mouse' && event.button !== 0 && event.button !== 2)) return;
  view.dragging = true;
  view.lastX = event.clientX;
  view.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
  event.preventDefault();
});
canvas.addEventListener('pointermove', (event) => {
  if (!view.dragging || state.phase !== 'active') return;
  const dx = event.clientX - view.lastX;
  const dy = event.clientY - view.lastY;
  view.lastX = event.clientX;
  view.lastY = event.clientY;
  view.yaw -= dx * preferences.sensitivity * 0.001;
  view.pitch = THREE.MathUtils.clamp(view.pitch + dy * preferences.sensitivity * 0.00075, 0.17, 1.35);
  player.rotation.y = view.yaw;
  $('#look-hint').classList.add('hidden');
});
const stopLook = () => { view.dragging = false; canvas.style.cursor = 'grab'; };
canvas.addEventListener('pointerup', stopLook);
canvas.addEventListener('pointercancel', stopLook);
canvas.addEventListener('lostpointercapture', stopLook);
canvas.addEventListener('wheel', (event) => {
  if (state.phase !== 'active') return;
  view.distance = THREE.MathUtils.clamp(view.distance + Math.sign(event.deltaY) * 0.6, 4.8, 11);
  event.preventDefault();
}, { passive: false });
$('#overlay-primary').onclick = startGame;
$('#question-continue').addEventListener('click', closeQuestion);
$('#next-challenge').addEventListener('click', () => {
  if (state.phase !== 'active') return;
  const target = state.score >= LEVEL_TARGET
    ? portal.position
    : coins.filter((coin) => coin.active).sort((a, b) => a.group.position.distanceToSquared(player.position) - b.group.position.distanceToSquared(player.position))[0]?.group.position;
  if (!target) return;
  const bearing = Math.atan2(player.position.x - target.x, player.position.z - target.z);
  const angle = Math.atan2(Math.sin(bearing - view.yaw), Math.cos(bearing - view.yaw));
  const direction = Math.abs(angle) < Math.PI / 4 ? 'ahead' : Math.abs(angle) > Math.PI * 3 / 4 ? 'behind you' : angle > 0 ? 'to your left' : 'to your right';
  showToast(state.score >= LEVEL_TARGET ? `The portal is ${direction}. Follow the paths.` : `A code coin lies ${direction}. Explore the paths.`);
});
$('#pause-button').addEventListener('click', () => state.phase === 'paused' ? resumeGame() : pauseGame());
$('#restart-button').addEventListener('click', resetGame);
$('#sound-button').addEventListener('click', () => {
  state.sound = !state.sound;
  $('#sound-button').setAttribute('aria-pressed', String(state.sound));
  $('#sound-button').setAttribute('aria-label', state.sound ? 'Turn sound off' : 'Turn sound on');
  $('#sound-button').innerHTML = `♫ <span>Sound ${state.sound ? 'on' : 'off'}</span>`;
  if (state.sound) playTone(660);
});
$('#score-stat').addEventListener('click', () => showToast(`${state.score} XP. Earn ${POINTS_PER_ANSWER} XP for each correct answer; ${Math.max(0, LEVEL_TARGET - state.score)} more unlocks the portal.`));
$('#lives-stat').addEventListener('click', () => showToast(`${state.lives} ${state.lives === 1 ? 'life' : 'lives'} left. A wrong answer costs one life.`));
$('#level-stat').addEventListener('click', () => showToast(`Level ${state.level + 1} of ${levels.length}: ${levels[state.level].name}. Jump low barriers with Space.`));
document.querySelectorAll('[data-direction]').forEach((button) => {
  const direction = button.dataset.direction;
  button.addEventListener('pointerdown', (event) => { event.preventDefault(); if (direction === 'jump') { jump(); return; } button.setPointerCapture(event.pointerId); touchKeys.add(direction); });
  const release = () => touchKeys.delete(direction);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

resize();
buildArena();
syncBackgroundFocus();
camera.lookAt(0, 1.3, player.position.z - 3);
requestFrame();
if (import.meta.env.DEV && new URLSearchParams(location.search).has('diagnostics')) {
  import('./diagnostics.js').then(({ installDiagnostics }) => installDiagnostics({ renderer, state, player, view, buildArena, startGame, coins: () => coins, openQuestion, answerQuestion, closeQuestion, enterPortal }));
}
