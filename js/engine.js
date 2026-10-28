/*
 * Starstone engine.
 * Reads window.STORY (js/story.js) and runs scenes, dice checks, combat,
 * puzzles, Starstone reshaping and save slots. Story content lives in
 * story.js only; this file should not need to change to add chapters.
 */
(() => {
  'use strict';

  const S = window.STORY;
  const $ = (sel) => document.querySelector(sel);
  const titleEl = $('#scene-title');
  const logEl = $('#log');
  const choicesEl = $('#choices');

  const SAVE_VERSION = 1;
  const SLOT_COUNT = 3;
  const SLOT_KEY = (n) => `starstone.slot.${n}`;
  const STAT_LABELS = { str: 'STR', agi: 'AGI', tech: 'TECH', will: 'WILL' };

  let state = null;

  // ---------- helpers ----------

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const die = (sides) => 1 + Math.floor(Math.random() * sides);
  const mod = (value) => Math.floor((value - 10) / 2);
  const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const resolve = (v) => (typeof v === 'function' ? v(api) : v);

  function newState() {
    const squad = {};
    for (const [id, m] of Object.entries(S.squad)) {
      squad[id] = { id, ...clone(m), hp: m.stats.maxHp, down: false, trust: m.trust ?? 3 };
    }
    return {
      scene: S.start,
      squad,
      inv: clone(S.startInventory || {}),
      flags: {},
      strain: 0,
      charges: 0,
      combat: null,
      checkpoint: null,
      pending: [],
    };
  }

  const activeSquad = () => Object.values(state.squad).filter((m) => !m.down);

  // ---------- output ----------

  function note(text, cls = 'sys') {
    state.pending.push({ text, cls });
  }

  function print(text, cls) {
    const p = document.createElement('p');
    p.innerHTML = text;
    if (cls) p.className = cls;
    logEl.appendChild(p);
  }

  function flush() {
    for (const line of state.pending) print(line.text, line.cls);
    state.pending = [];
  }

  // ---------- API passed to story functions ----------

  const api = {
    get state() { return state; },
    member: (id) => state.squad[id],
    flag(key, value = true) { state.flags[key] = value; },
    has: (key) => !!state.flags[key],
    hasItem: (id) => (state.inv[id] || 0) > 0,
    addItem(id, n = 1) {
      state.inv[id] = (state.inv[id] || 0) + n;
      note(`[+] ${S.items[id].name}${n > 1 ? ` x${n}` : ''}`, 'ok');
    },
    removeItem(id, n = 1) {
      state.inv[id] = Math.max(0, (state.inv[id] || 0) - n);
      if (!state.inv[id]) delete state.inv[id];
    },
    trust(id, delta) {
      const m = state.squad[id];
      const before = m.trust;
      m.trust = clamp(m.trust + delta, 0, 5);
      if (m.trust !== before) note(`[TRUST] ${m.name} ${delta > 0 ? '▲' : '▼'}`, delta > 0 ? 'ok' : 'warn');
    },
    heal(id, amount) {
      const m = state.squad[id];
      const before = m.hp;
      m.hp = clamp(m.hp + amount, 0, m.stats.maxHp);
      if (m.hp > 0) m.down = false;
      return m.hp - before;
    },
    damage(id, amount) {
      const m = state.squad[id];
      m.hp = clamp(m.hp - amount, 0, m.stats.maxHp);
      if (m.hp === 0 && !m.down) {
        m.down = true;
        note(`[!] ${m.name} IS DOWN`, 'bad');
      }
    },
    charge(n) { state.charges += n; },
    note,
    roll,
  };

  // d20 + stat modifier against a difficulty. A natural 20 always passes, a natural 1 always fails.
  function roll(who, stat, dc, bonus = 0) {
    const m = state.squad[who];
    const d = die(20);
    const m2 = mod(m.stats[stat]) + bonus;
    const total = d + m2;
    const success = d === 20 || (d !== 1 && total >= dc);
    note(`[ROLL] ${m.name} ${STAT_LABELS[stat]}: d20 ${d} ${signed(m2)} = ${total} vs DC ${dc} // ${success ? 'SUCCESS' : 'FAIL'}`,
      success ? 'ok' : 'bad');
    return { success, die: d, total };
  }

  // ---------- scenes ----------

  function enter(id, { fromSave = false } = {}) {
    const scene = S.scenes[id];
    if (!scene) throw new Error(`Unknown scene: ${id}`);
    state.scene = id;
    titleEl.textContent = resolve(scene.title) || '';
    logEl.innerHTML = '';
    flush();
    if (!fromSave) {
      if (scene.checkpoint) state.checkpoint = snapshot();
      if (scene.onEnter) scene.onEnter(api);
      flush();
    }
    for (const para of resolve(scene.text) || []) print(para);
    if (scene.combat && !state.combat && !fromSave) startCombat(scene);
    flush();
    showChoices();
    updatePanel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function snapshot() {
    const copy = clone(state);
    copy.checkpoint = null;
    copy.pending = [];
    return copy;
  }

  function addChoice(label, onClick, cls = 'choice') {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.innerHTML = label;
    b.addEventListener('click', onClick);
    choicesEl.appendChild(b);
    return b;
  }

  function addLine(text, cls) {
    const div = document.createElement('div');
    div.className = cls;
    div.innerHTML = text;
    choicesEl.appendChild(div);
  }

  function showChoices() {
    choicesEl.innerHTML = '';
    const scene = S.scenes[state.scene];
    if (state.combat) return showCombat();
    if (scene.puzzle) return showPuzzle(scene.puzzle);
    const list = (scene.choices || []).filter((c) => !c.if || c.if(api));
    list.forEach((c, i) => addChoice(`${i + 1}. ${choiceLabel(c)}`, () => choose(c)));
  }

  function choiceLabel(c) {
    let label = resolve(c.text);
    if (c.check) {
      const m = state.squad[c.check.who];
      label += ` <span class="tag">[${m.short} ${STAT_LABELS[c.check.stat]} · DC ${c.check.dc}]</span>`;
    }
    return label;
  }

  function choose(c) {
    if (c.effects) c.effects(api);
    if (c.action === 'reshape') return openReshape(c.to);
    if (c.action === 'restart') return newGame();
    if (c.action === 'checkpoint') return loadCheckpoint();
    if (c.check) {
      const r = roll(c.check.who, c.check.stat, c.check.dc, c.check.bonus || 0);
      return enter(r.success ? c.check.success : c.check.fail);
    }
    if (c.to) return enter(c.to);
    flush();
    showChoices();
    updatePanel();
  }

  // ---------- puzzles ----------

  function showPuzzle(pz) {
    const tries = state.flags[`_tries_${state.scene}`] || 0;
    addLine(pz.prompt, 'heading');
    const row = document.createElement('div');
    row.className = 'puzzle-row';
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', pz.prompt);
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.textContent = 'ENTER';
    row.append(input, submit);
    choicesEl.appendChild(row);

    const attempt = () => {
      const guess = input.value.trim().toLowerCase();
      if (!guess) return;
      const answers = [].concat(pz.answer).map((a) => String(a).toLowerCase());
      if (answers.includes(guess)) {
        note(`[ACCESS GRANTED] ${guess.toUpperCase()}`, 'ok');
        return enter(pz.success);
      }
      state.flags[`_tries_${state.scene}`] = tries + 1;
      print(`[ACCESS DENIED] ${guess.toUpperCase()}`, 'bad');
      if (tries + 1 >= (pz.hintAfter ?? 2) && pz.hint) print(pz.hint, 'warn');
      if (pz.fail && tries + 1 >= (pz.maxTries ?? Infinity)) return enter(pz.fail);
      showChoices();
    };
    submit.addEventListener('click', attempt);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });
    (pz.choices || []).filter((c) => !c.if || c.if(api))
      .forEach((c) => addChoice(choiceLabel(c), () => choose(c)));
    input.focus();
  }

  // ---------- combat ----------

  function startCombat(scene) {
    const def = resolve(scene.combat);
    state.combat = {
      enemies: def.enemies.map((e) => ({ ...e, maxHp: e.hp })),
      win: def.win,
      lose: def.lose,
      round: 1,
      opening: def.opening || 0,
      cover: false,
      scrambled: 0,
    };
    note(`[CONTACT] ${state.combat.enemies.map((e) => e.name).join(' · ')}`, 'warn');
  }

  const livingEnemies = () => state.combat.enemies.filter((e) => e.hp > 0);

  function showCombat() {
    const c = state.combat;
    addLine(`ROUND ${c.round} // CHOOSE ONE ORDER`, 'heading');
    for (const e of livingEnemies()) addLine(`${e.name}: ${e.hp}/${e.maxHp} HP`, 'enemy-line');
    let n = 1;
    for (const m of activeSquad()) {
      const a = m.combat;
      addChoice(`${n++}. ${m.short}: ${a.label} <span class="tag">[${STAT_LABELS[a.stat]}]</span>`, () => combatTurn(() => act(m, a)));
    }
    addChoice(`${n++}. Squad: take cover`, () => combatTurn(() => {
      c.cover = true;
      note('[ORDER] Squad takes cover. Enemy fire is harder to land this round.');
    }));
    if (api.hasItem('medkit')) addChoice(`${n++}. Use ${S.items.medkit.name}`, () => combatTurn(useMedkit));
    if (api.hasItem('frag')) addChoice(`${n++}. Throw ${S.items.frag.name}`, () => combatTurn(throwFrag));
  }

  function act(m, a) {
    const c = state.combat;
    if (a.type === 'heal') {
      const target = mostWounded(true);
      if (!target) return note(`[ORDER] ${m.short} finds no one to patch up.`);
      const r = roll(m.id, a.stat, 10);
      const amount = r.success ? die(6) + Math.max(0, mod(m.stats[a.stat])) + 2 : 2;
      const healed = api.heal(target.id, amount);
      return note(`[MED] ${m.short} patches ${target.short}: +${healed} HP`, 'ok');
    }
    if (a.type === 'hack') {
      const r = roll(m.id, a.stat, 12);
      if (r.success) {
        c.scrambled = 3;
        return note('[HACK] Enemy optics scrambled. They are easier to hit for the rest of the fight.', 'ok');
      }
      return note('[HACK] The enemy encryption holds.', 'bad');
    }
    // attack
    const target = livingEnemies()[0];
    const bonus = c.round === 1 ? c.opening : 0;
    const r = roll(m.id, a.stat, target.def - c.scrambled, bonus);
    if (r.success) {
      const dmg = die(6) + Math.max(0, mod(m.stats[a.stat])) + (r.die === 20 ? 4 : 0);
      target.hp = Math.max(0, target.hp - dmg);
      note(`[HIT] ${m.short} hits ${target.name} for ${dmg}${r.die === 20 ? ' (CRITICAL)' : ''}.`, 'ok');
      if (target.hp === 0) note(`[X] ${target.name} neutralized.`, 'ok');
    } else {
      note(`[MISS] ${m.short} misses ${target.name}.`, 'bad');
    }
  }

  function mostWounded(includeDown) {
    const pool = Object.values(state.squad).filter((m) => includeDown || !m.down)
      .filter((m) => m.hp < m.stats.maxHp);
    pool.sort((a, b) => a.hp / a.stats.maxHp - b.hp / b.stats.maxHp);
    return pool[0];
  }

  function useMedkit() {
    const target = mostWounded(true);
    if (!target) return note('[MED] Nobody needs the medkit. It stays packed.');
    api.removeItem('medkit');
    const healed = api.heal(target.id, 8);
    note(`[MED] Medkit on ${target.short}: +${healed} HP`, 'ok');
  }

  function throwFrag() {
    api.removeItem('frag');
    note('[FRAG] Grenade out!', 'warn');
    for (const e of livingEnemies()) {
      const dmg = die(6) + die(6);
      e.hp = Math.max(0, e.hp - dmg);
      note(`[HIT] ${e.name} takes ${dmg}.`, 'ok');
      if (e.hp === 0) note(`[X] ${e.name} neutralized.`, 'ok');
    }
  }

  function enemyTurn() {
    const c = state.combat;
    for (const e of livingEnemies()) {
      const targets = activeSquad();
      if (!targets.length) break;
      const t = pick(targets);
      const d = die(20);
      const total = d + e.atk;
      const defense = 10 + mod(t.stats.agi) + (c.cover ? 4 : 0);
      if (d !== 1 && (d === 20 || total >= defense)) {
        const dmg = die(e.dmg) + (e.dmgBonus || 0);
        note(`[INCOMING] ${e.name} hits ${t.short} for ${dmg}.`, 'bad');
        api.damage(t.id, dmg);
      } else {
        note(`[INCOMING] ${e.name} fires at ${t.short} and misses.`);
      }
    }
    c.cover = false;
    c.round += 1;
  }

  function combatTurn(action) {
    const c = state.combat;
    print(`— ROUND ${c.round} —`, 'sys gap');
    action();
    if (!livingEnemies().length) return endCombat(c.win, '[AREA CLEAR]');
    enemyTurn();
    if (!activeSquad().length) return endCombat(c.lose, '[SQUAD COMBAT INEFFECTIVE]');
    flush();
    showChoices();
    updatePanel();
    choicesEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function endCombat(next, line) {
    note(line, 'warn');
    state.combat = null;
    // Downed squad members get back up with 1 HP once a fight ends.
    for (const m of Object.values(state.squad)) if (m.down) { m.down = false; m.hp = 1; }
    enter(next);
  }

  // ---------- Starstone reshaping ----------

  function openReshape(next) {
    if (state.charges <= 0) {
      note('[STARSTONE] The stone is dark. No charge left.', 'warn');
      return next ? enter(next) : (flush(), showChoices(), updatePanel());
    }
    choicesEl.innerHTML = '';
    addLine(`CHANNEL THE STARSTONE // CHARGES: ${state.charges}`, 'heading');
    addLine('Choose who to reshape.', '');
    for (const m of Object.values(state.squad)) {
      if (m.id === S.leader) continue;
      addChoice(`${m.name} <span class="tag">(${m.role})</span>`, () => chooseStat(m, next));
    }
    addChoice('Pull back. Not now.', () => (next ? enter(next) : showChoices()));
  }

  function chooseStat(m, next) {
    choicesEl.innerHTML = '';
    addLine(`RESHAPE ${m.name.toUpperCase()}`, 'heading');
    for (const [stat, label] of Object.entries(STAT_LABELS)) {
      addChoice(`${label} ${m.stats[stat]} → ${m.stats[stat] + 2}`, () => applyReshape(m, stat, next));
    }
    addChoice(`VITALITY ${m.stats.maxHp} → ${m.stats.maxHp + 4} max HP`, () => applyReshape(m, 'maxHp', next));
    addChoice('Back', () => openReshape(next));
  }

  function applyReshape(m, stat, next) {
    if (stat === 'maxHp') {
      m.stats.maxHp += 4;
      m.hp += 4;
    } else {
      m.stats[stat] += 2;
    }
    state.charges -= 1;
    state.strain += 1;
    m.reshaped = (m.reshaped || 0) + 1;
    const label = stat === 'maxHp' ? 'VITALITY' : STAT_LABELS[stat];
    note(`[STARSTONE] ${m.name}: ${label} rewritten.`, 'star');
    if (S.onReshape) S.onReshape(api, m, stat);
    const strainLine = S.strainMessages && S.strainMessages[state.strain];
    if (strainLine) note(strainLine, 'star');
    if (next) return enter(next);
    flush();
    showChoices();
    updatePanel();
  }

  // ---------- side panel ----------

  function updatePanel() {
    const squadEl = $('#squad');
    squadEl.innerHTML = '';
    for (const m of Object.values(state.squad)) {
      const div = document.createElement('div');
      div.className = `member${m.down ? ' down' : ''}`;
      const pct = Math.round((m.hp / m.stats.maxHp) * 100);
      const trust = m.id === S.leader ? '' :
        `<div>TRUST ${'■'.repeat(m.trust)}${'□'.repeat(5 - m.trust)}</div>`;
      div.innerHTML = `
        <div class="name">${m.name}</div>
        <div class="role">${m.role}${m.down ? ' // DOWN' : ''}</div>
        <div class="hpbar"><span style="width:${pct}%"></span></div>
        <div>HP ${m.hp}/${m.stats.maxHp} · STR ${m.stats.str} · AGI ${m.stats.agi} · TECH ${m.stats.tech} · WILL ${m.stats.will}</div>
        ${trust}`;
      squadEl.appendChild(div);
    }

    const invEl = $('#inventory');
    invEl.innerHTML = '';
    const items = Object.entries(state.inv);
    if (!items.length) invEl.innerHTML = '<li class="empty">Empty</li>';
    for (const [id, n] of items) {
      const li = document.createElement('li');
      li.textContent = `${S.items[id].name}${n > 1 ? ` x${n}` : ''}`;
      li.title = S.items[id].desc;
      invEl.appendChild(li);
    }

    const starEl = $('#starstone');
    starEl.innerHTML = '';
    if (state.flags.starstone) {
      starEl.innerHTML = `<h2>THE STARSTONE</h2><div>CHARGES: ${state.charges}</div>`;
      const canUse = state.charges > 0 && !state.combat && !S.scenes[state.scene].puzzle;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'CHANNEL THE STARSTONE';
      b.disabled = !canUse;
      b.addEventListener('click', () => openReshape(null));
      starEl.appendChild(b);
    }
  }

  // ---------- saving ----------

  function readSlot(n) {
    try {
      const raw = localStorage.getItem(SLOT_KEY(n));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function packSave() {
    return { version: SAVE_VERSION, savedAt: new Date().toISOString(), state: snapshotWithCheckpoint() };
  }

  function snapshotWithCheckpoint() {
    const copy = clone(state);
    copy.pending = [];
    return copy;
  }

  function validSave(data) {
    return data && data.version === SAVE_VERSION && data.state && S.scenes[data.state.scene];
  }

  function loadSave(data) {
    state = clone(data.state);
    state.pending = [];
    enter(state.scene, { fromSave: true });
  }

  function slotSummary(data) {
    if (!data) return 'EMPTY';
    const scene = S.scenes[data.state.scene];
    const when = new Date(data.savedAt).toLocaleString();
    return `${resolve(scene.title) || data.state.scene} · ${when}`;
  }

  function renderSlots(msg = '') {
    const list = $('#slot-list');
    list.innerHTML = '';
    for (let n = 1; n <= SLOT_COUNT; n++) {
      const data = readSlot(n);
      const row = document.createElement('div');
      row.className = 'slot';
      row.innerHTML = `<span>SLOT ${n} // ${slotSummary(data)}</span>`;
      const btns = document.createElement('span');
      btns.className = 'btns';
      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = 'SAVE';
      save.addEventListener('click', () => {
        try {
          localStorage.setItem(SLOT_KEY(n), JSON.stringify(packSave()));
          renderSlots(`Saved to slot ${n}.`);
        } catch {
          renderSlots('This browser blocked saving. Use EXPORT SAVE TO FILE instead.');
        }
      });
      const load = document.createElement('button');
      load.type = 'button';
      load.textContent = 'LOAD';
      load.disabled = !validSave(data);
      load.addEventListener('click', () => { $('#slots').close(); loadSave(data); });
      btns.append(save, load);
      row.appendChild(btns);
      list.appendChild(row);
    }
    $('#slot-msg').textContent = msg;
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(packSave(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `starstone-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    renderSlots('Save file downloaded.');
  }

  function importSave(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!validSave(data)) throw new Error('bad save');
        $('#slots').close();
        loadSave(data);
      } catch {
        renderSlots('That file is not a Starstone save.');
      }
    };
    reader.readAsText(file);
  }

  function loadCheckpoint() {
    const cp = state.checkpoint;
    if (!cp) return newGame();
    // The snapshot is taken before the scene's onEnter runs, so entering
    // normally replays it exactly once.
    state = clone(cp);
    state.pending = [];
    note('[CHECKPOINT RESTORED]', 'warn');
    enter(state.scene);
  }

  function newGame() {
    state = newState();
    enter(state.scene);
  }

  // ---------- wiring ----------

  $('#btn-slots').addEventListener('click', () => { renderSlots(); $('#slots').showModal(); });
  $('#btn-close-slots').addEventListener('click', () => $('#slots').close());
  $('#btn-export').addEventListener('click', exportSave);
  $('#btn-import').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importSave(e.target.files[0]);
    e.target.value = '';
  });
  $('#btn-new').addEventListener('click', () => {
    if (confirm('Start a new game? Unsaved progress will be lost.')) newGame();
  });

  // Number keys pick choices.
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || $('#slots').open) return;
    const n = parseInt(e.key, 10);
    if (!n) return;
    const buttons = choicesEl.querySelectorAll('button.choice');
    if (buttons[n - 1]) buttons[n - 1].click();
  });

  window.STARSTONE = { api, get state() { return state; } };
  newGame();
})();
