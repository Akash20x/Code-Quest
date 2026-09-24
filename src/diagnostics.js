// Opt-in development harness. Never included in the production game UI.
export function installDiagnostics({ renderer, state, player, view, buildArena, startGame, coins, openQuestion, answerQuestion, closeQuestion, enterPortal }) {
  const panel = document.createElement('aside');
  panel.style.cssText = 'position:fixed;bottom:90px;right:10px;z-index:30;background:#101820;color:white;padding:12px;max-width:480px;font:12px monospace';
  const output = document.createElement('pre');
  output.style.cssText = 'max-height:220px;overflow:auto;white-space:pre-wrap';
  const button = (name, action) => { const el = document.createElement('button'); el.textContent = name; el.onclick = action; panel.append(el); };
  let run = null;
  let suite = [];
  const results = [];
  function next() {
    if (!suite.length) { output.textContent = JSON.stringify(results, null, 2); return; }
    const level = suite.shift();
    state.level = level; state.score = 0; state.lives = 3;
    buildArena(); startGame();
    run = { level: level + 1, warmup: 40, times: [], calls: [], last: 0 };
  }
  button('Benchmark all worlds', () => { results.length = 0; suite = [0, 0, 0, 1, 1, 1, 2, 2, 2]; next(); });
  for (let i = 0; i < 3; i++) button(`World ${i + 1}`, () => { state.level = i; state.score = 0; buildArena(); startGame(); });
  button('Encounter coin', () => { const coin = coins().find(c => c.active); if (coin) { player.position.copy(coin.group.position); player.position.y = 0; openQuestion(coin.index); } });
  button('Answer first', () => answerQuestion(0));
  button('Continue', closeQuestion);
  button('Portal check', () => { state.score = 30; enterPortal(); });
  button('Resources', () => { output.textContent = JSON.stringify(renderer.info.memory); });
  panel.append(output); document.body.append(panel);
  const render = renderer.render.bind(renderer);
  renderer.render = (...args) => {
    render(...args);
    if (!run) return;
    const now = performance.now();
    view.yaw += 0.012;
    if (run.warmup-- > 0) { run.last = now; return; }
    run.times.push(now - run.last); run.last = now;
    run.calls.push(renderer.info.render.calls);
    if (run.times.length < 120) return;
    const sorted = [...run.times].sort((a,b) => a-b);
    results.push({ level: run.level, medianMs: +sorted[60].toFixed(2), p95Ms: +sorted[114].toFixed(2), calls: Math.round(run.calls.reduce((a,b)=>a+b,0)/120), ...renderer.info.memory });
    output.textContent = JSON.stringify(results, null, 2);
    run = null;
    setTimeout(next, 0);
  };
}
