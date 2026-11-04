/*
 * Starstone City.
 * A Torn-style layer on top of the story engine: bars that refill in real
 * time, gym training, sec-ops, patrols, a BSDF job, a market, the hospital and
 * the brig. The six story chapters are Story Missions unlocked by level.
 * All tuning numbers live in the tables near the top of this file.
 */
(() => {
  'use strict';

  const G = window.STARSTONE;
  const S = window.STORY;
  const H = G.hooks;
  const $ = (sel) => document.querySelector(sel);
  const titleEl = $('#scene-title');
  const logEl = $('#log');
  const choicesEl = $('#choices');
  const hudEl = $('#cityhud');
  const navEl = $('#citynav');

  const AUTO_KEY = 'starstone.city.autosave';
  const MIN = 60 * 1000;
  const HOUR = 60 * MIN;
  const now = () => Date.now();
  const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const { die, mod, clamp, clone, fmtStat } = G;
  const num = (n) => Math.floor(n).toLocaleString('en-US');
  const cr = (n) => `${num(n)} cr`;

  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (x) => String(x).padStart(2, '0');
    return h ? `${h}h ${pad(m)}m` : `${m}:${pad(sec)}`;
  }

  // ---------- tuning ----------

  const LEADER = S.leader;
  const xpToNext = (level) => 60 * level;
  const lifeMax = (c) => 100 + 20 * (c.level - 1);

  // Each bar gains `step` every `every` ms, even while the game is closed.
  const BARS = {
    energy: { label: 'ENERGY', max: () => 100, step: () => 5, every: 3 * MIN },
    nerve: { label: 'NERVE', max: (c) => 10 + c.level, step: () => 1, every: 4 * MIN },
    morale: { label: 'MORALE', max: () => 100, step: () => 5, every: 6 * MIN },
    life: { label: 'LIFE', max: lifeMax, step: (c) => Math.ceil(lifeMax(c) / 20), every: 3 * MIN },
  };

  const CHAPTERS = [
    { n: 1, name: 'Lantern', level: 1 },
    { n: 2, name: 'The Hunt', level: 3 },
    { n: 3, name: 'The Ledger', level: 5 },
    { n: 4, name: 'The Incision', level: 7 },
    { n: 5, name: 'The Architect', level: 9 },
    { n: 6, name: 'Fallen Star', level: 11 },
  ];
  const chapterReward = (n) => ({ credits: 500 * n, xp: 150 * n });

  const ENDINGS = {
    end_hold: 'Hold the Line',
    end_heir: "The Architect's Heir",
    end_fallen: 'Fallen Star',
  };

  const STAT_NAMES = { str: 'STR', agi: 'AGI', tech: 'TECH', will: 'WILL' };
  const GYM_COST = 5;

  // Sec-ops: Torn's crimes, run in the undercity against NorthStar and the Fang.
  const OPS = [
    { id: 'meds', name: 'Run med supplies to the Sink', level: 1, nerve: 2, stat: 'agi', diff: 0, credits: [40, 90], xp: 4,
      text: 'Boone\'s spare kits go to families NorthStar turned away.' },
    { id: 'kiosk', name: 'Skim a NorthStar donation kiosk', level: 1, nerve: 3, stat: 'tech', diff: 10, credits: [80, 160], xp: 6,
      text: 'Every credit in that box was meant for a shelter that never existed.' },
    { id: 'courier', name: 'Lift a Fang courier\'s datachip', level: 2, nerve: 4, stat: 'agi', diff: 20, credits: [150, 300], xp: 9,
      text: 'The couriers ride the night trams with chips sewn into their sleeves.', loot: { item: 'medkit', chance: 0.2 } },
    { id: 'fence', name: 'Lean on a black-market fence', level: 4, nerve: 5, stat: 'str', diff: 30, credits: [300, 550], xp: 13,
      text: 'He sells Fang guns to kids. He can pay for it.' },
    { id: 'payroll', name: 'Slice a NorthStar payroll server', level: 6, nerve: 7, stat: 'tech', diff: 40, credits: [600, 1000], xp: 18,
      text: 'Knox wrote you a script. He says it is "mostly legal".' },
    { id: 'cache', name: 'Raid a Cobra\'s Fang weapons cache', level: 9, nerve: 10, stat: 'will', diff: 55, credits: [1200, 2000], xp: 28,
      text: 'Six guards, two dogs and one chance to walk out with their armory.', loot: { item: 'frag', chance: 0.5 } },
    { id: 'killlist', name: 'Steal a Fang assassin\'s kill list', level: 12, nerve: 12, stat: 'agi', diff: 70, credits: [2500, 4000], xp: 40,
      text: 'Somewhere on that list are names you know.' },
  ];

  // Patrol targets: auto-resolved fights that cost energy.
  const FOES = [
    { id: 'lookout', name: 'Fang Lookout', level: 1, hp: 40, atk: 2, def: 10, dmg: 8, credits: [30, 80], xp: 15 },
    { id: 'orderly', name: 'NorthStar Orderly', level: 2, hp: 60, atk: 3, def: 11, dmg: 10, credits: [60, 120], xp: 22 },
    { id: 'brawler', name: 'Undercity Brawler', level: 4, hp: 90, atk: 4, def: 12, dmg: 12, credits: [100, 200], xp: 32 },
    { id: 'enforcer', name: 'Fang Enforcer', level: 6, hp: 130, atk: 5, def: 13, dmg: 14, credits: [180, 320], xp: 45 },
    { id: 'handler', name: 'NorthStar Handler', level: 9, hp: 180, atk: 6, def: 14, dmg: 16, credits: [300, 500], xp: 60 },
    { id: 'blade', name: 'Fang Blade', level: 12, hp: 240, atk: 7, def: 15, dmg: 18, credits: [500, 800], xp: 80 },
    { id: 'lieutenant', name: 'Cobra\'s Fang Lieutenant', level: 15, hp: 320, atk: 8, def: 16, dmg: 22, credits: [900, 1400], xp: 110 },
  ];
  const PATROL_COST = 25;

  const RANKS = [
    { name: 'Private', pay: 150, level: 1 },
    { name: 'Lance Corporal', pay: 250, level: 2 },
    { name: 'Corporal', pay: 400, level: 4 },
    { name: 'Sergeant', pay: 650, level: 6 },
    { name: 'Staff Sergeant', pay: 950, level: 9 },
    { name: 'Master Sergeant', pay: 1400, level: 12 },
    { name: 'Sergeant Major', pay: 2000, level: 15 },
  ];
  const SHIFT_GAP = 8 * HOUR;
  const SHIFTS_TO_PROMOTE = 3;

  // Items the city adds. Story items stay in story.js.
  const STORY_ONLY = Object.keys(S.items).filter((id) => !['medkit', 'frag'].includes(id));
  Object.assign(S.items, {
    volt: { name: 'Volt can', desc: 'Military energy drink. +25 energy.' },
    stim: { name: 'Focus stim', desc: 'Sharpens your nerve. +5 nerve.' },
    meal: { name: 'Hot meal', desc: 'A real meal at the Bellows. +30 morale.' },
    bandage: { name: 'Bandage roll', desc: '+25% life. In the hospital, cuts 10 minutes off your stay.' },
  });
  const SHOP = [
    { id: 'medkit', price: 250, use: 'In story fights, heals 8 HP. In the city, +40% life or 20 minutes off a hospital stay.' },
    { id: 'frag', price: 400, use: 'In story fights, hits every enemy for 2d6.' },
    { id: 'bandage', price: 300 },
    { id: 'meal', price: 200 },
    { id: 'volt', price: 500 },
    { id: 'stim', price: 600 },
  ];
  const priceOf = (id) => (SHOP.find((s) => s.id === id) || {}).price;

  const SCREENS = {
    home: 'CITY CENTER', gym: 'GYM', ops: 'SEC-OPS', patrol: 'PATROL', job: 'BSDF JOB',
    market: 'MARKET', items: 'INVENTORY', missions: 'STORY MISSIONS', hospital: 'HOSPITAL', brig: 'BRIG',
  };

  // ---------- state ----------

  const st = () => G.state;
  const city = () => G.state.city;
  const jaz = () => G.state.squad[LEADER];

  function newCity() {
    const t = now();
    return {
      level: 1, xp: 0, credits: 500,
      bars: Object.fromEntries(Object.keys(BARS).map((k) => [k, { v: 0, t }])),
      rank: 0, shifts: 0, lastShift: 0,
      hospitalUntil: 0, brigUntil: 0,
      opsXp: 0, chaptersDone: 0, endings: [],
      mission: null, // { chapter, resume: 'scene' | 'checkpoint' | null }
      screen: 'home', events: [], seenIntro: false,
      counts: { trains: 0, ops: 0, patrols: 0 },
    };
  }

  H.newState = (base) => {
    base.city = newCity();
    base.mode = 'city';
    for (const k of Object.keys(BARS)) base.city.bars[k].v = BARS[k].max(base.city);
    return base;
  };

  const bar = (k) => city().bars[k];
  const maxOf = (k) => BARS[k].max(city());

  // Items can push a bar past its max, like Torn's energy cans. Life stays capped.
  function gain(k, n) {
    const b = bar(k);
    b.v += n;
    if (k === 'life') b.v = Math.min(b.v, maxOf(k));
  }

  function spend(k, n) {
    const b = bar(k);
    if (b.v >= maxOf(k)) b.t = now();
    b.v = Math.max(0, b.v - n);
  }

  // Refill bars and release from hospital or brig.
  // Returns 'status' when a timer ran out, 'bars' when only bars moved, or ''.
  function tick() {
    const c = city();
    const t = now();
    let changed = '';
    for (const [k, def] of Object.entries(BARS)) {
      const b = c.bars[k];
      const max = def.max(c);
      if (b.v >= max) { b.t = t; continue; }
      const n = Math.floor((t - b.t) / def.every);
      if (n > 0) {
        b.v = Math.min(max, b.v + n * def.step(c));
        b.t += n * def.every;
        if (b.v >= max) b.t = t;
        changed = 'bars';
      }
    }
    if (c.hospitalUntil && t >= c.hospitalUntil) {
      c.hospitalUntil = 0;
      c.bars.life.v = Math.max(c.bars.life.v, Math.ceil(lifeMax(c) / 2));
      log('Discharged from the BSDF hospital.');
      changed = 'status';
    }
    if (c.brigUntil && t >= c.brigUntil) {
      c.brigUntil = 0;
      log('Released from the brig.');
      changed = 'status';
    }
    return changed;
  }

  const inHospital = () => city().hospitalUntil > now();
  const inBrig = () => city().brigUntil > now();
  const busy = () => inHospital() || inBrig();

  function hospitalize(minutes, why) {
    const c = city();
    c.hospitalUntil = Math.max(c.hospitalUntil, now()) + minutes * MIN;
    c.bars.life.v = 0;
    c.bars.life.t = now();
    log(`Hospitalized: ${why}`);
  }

  function jail(minutes, why) {
    const c = city();
    c.brigUntil = Math.max(c.brigUntil, now()) + minutes * MIN;
    log(`Thrown in the brig: ${why}`);
  }

  function log(text) {
    const c = city();
    c.events.unshift({ t: now(), text });
    c.events.length = Math.min(c.events.length, 12);
  }

  function addCredits(n) { city().credits += n; }

  function addXp(n) {
    const c = city();
    c.xp += n;
    while (c.xp >= xpToNext(c.level)) {
      c.xp -= xpToNext(c.level);
      c.level += 1;
      say(`[LEVEL UP] You are now level ${c.level}.`, 'star');
      log(`Reached level ${c.level}.`);
      const ch = CHAPTERS.find((x) => x.level === c.level);
      if (ch) say(`[INTEL] Story Mission ${ch.n}, ${ch.name}, is now in range.`, 'star');
    }
  }

  // ---------- messages shown at the top of the next screen ----------

  let flash = [];
  let shown = []; // last screen's messages, kept when the screen refreshes itself
  const say = (text, cls = 'sys') => flash.push({ text, cls });

  function para(text, cls) { G.print(text, cls); }

  function heading(text) { G.addLine(text, 'heading'); }

  function button(label, onClick, { disabled = false, cls = 'choice' } = {}) {
    const b = G.addChoice(label, onClick, cls);
    b.disabled = disabled;
    return b;
  }

  function row(cls = 'chip-row') {
    const div = document.createElement('div');
    div.className = cls;
    choicesEl.appendChild(div);
    return div;
  }

  function chip(parent, label, onClick, active = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip${active ? ' active' : ''}`;
    b.innerHTML = label;
    b.addEventListener('click', onClick);
    parent.appendChild(b);
    return b;
  }

  // ---------- navigation ----------

  function go(screen) {
    city().screen = screen;
    st().mode = 'city';
    render();
  }

  function render({ keep = false } = {}) {
    tick();
    const c = city();
    const screen = c.screen in SCREENS ? c.screen : 'home';
    titleEl.textContent = SCREENS[screen];
    logEl.innerHTML = '';
    choicesEl.innerHTML = '';
    G.flush();
    if (!keep) { shown = flash; flash = []; }
    for (const f of shown) para(f.text, f.cls);
    VIEWS[screen]();
    G.updatePanel();
  }

  H.renderCity = render;
  H.start = () => go('home');

  // ---------- HUD and nav ----------

  function barHtml(k) {
    const c = city();
    const def = BARS[k];
    const b = c.bars[k];
    const max = def.max(c);
    const pct = clamp(Math.round((b.v / max) * 100), 0, 100);
    let timer = 'FULL';
    if (b.v < max) {
      const next = def.every - (now() - b.t);
      const full = (Math.ceil((max - b.v) / def.step(c)) - 1) * def.every + next;
      timer = `full in ${fmtTime(full)}`;
    }
    return `<div class="bar bar-${k}">
      <div class="bar-top"><span>${def.label}</span><span>${num(b.v)}/${num(max)}</span></div>
      <div class="bar-track"><span style="width:${pct}%"></span></div>
      <div class="bar-timer">${timer}</div>
    </div>`;
  }

  function renderHud() {
    const c = city();
    const need = xpToNext(c.level);
    let status = '';
    if (inHospital()) status = `<span class="hud-alert">IN HOSPITAL ${fmtTime(c.hospitalUntil - now())}</span>`;
    else if (inBrig()) status = `<span class="hud-alert">IN THE BRIG ${fmtTime(c.brigUntil - now())}</span>`;
    else if (st().mode === 'mission') status = '<span class="hud-mission">ON STORY MISSION</span>';
    hudEl.innerHTML = `
      <div class="hud-line">
        <span>LVL <b>${c.level}</b></span>
        <span>XP ${num(c.xp)}/${num(need)}</span>
        <span><b>${cr(c.credits)}</b></span>
        <span>${RANKS[c.rank].name.toUpperCase()}</span>
        ${status}
      </div>
      <div class="bars">${Object.keys(BARS).map(barHtml).join('')}</div>`;
  }

  function renderNav() {
    navEl.innerHTML = '';
    const add = (label, onClick, { active = false, disabled = false } = {}) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `nav${active ? ' active' : ''}`;
      b.textContent = label;
      b.disabled = disabled;
      b.addEventListener('click', onClick);
      navEl.appendChild(b);
    };
    if (st().mode === 'mission') {
      add('◄ PAUSE MISSION, BACK TO CITY', pauseMission, { disabled: !!st().combat });
      return;
    }
    for (const [id, label] of Object.entries(SCREENS)) {
      add(label, () => go(id), { active: city().screen === id });
    }
  }

  H.panel = () => { renderHud(); renderNav(); save(); };

  // ---------- views ----------

  const VIEWS = {};

  function blockedNote() {
    if (inHospital()) { para('You are in the hospital. Rest up, or use a bandage or medkit from your inventory to get out sooner.', 'warn'); return true; }
    if (inBrig()) { para('You are in the brig. Wait it out or post bail.', 'warn'); return true; }
    return false;
  }

  VIEWS.home = () => {
    const c = city();
    if (!c.seenIntro) {
      para('Blue Star. Years after the Great War, the city still has not healed.');
      para('You are <b>Sgt. Maj. Jaz Stone</b> of the Blue Star Defense Forces. A charity called NorthStar runs the shelters. Something called the Cobra\'s Fang runs NorthStar. Nobody has proved it yet.');
      para('Train your squad at the gym. Work your BSDF job. Run sec-ops in the undercity and patrol the streets for credits and experience. When you are strong enough, take the Story Missions that change everything.');
      para('Your bars refill over real time, even with the game closed. Come back later and they are full again.', 'sys');
      c.seenIntro = true;
    } else {
      para('Rain on the tram lines. Neon over the Sink. The Bellows is warm and the squad is waiting for orders.');
    }
    const next = CHAPTERS[c.chaptersDone];
    if (c.mission) {
      para(`<b>Story Mission ${c.mission.chapter} is paused.</b> Open STORY MISSIONS to resume.`, 'warn');
    } else if (next && c.level >= next.level) {
      para(`<b>Story Mission ${next.n}: ${next.name}</b> is ready.`, 'star');
    } else if (next) {
      para(`Next Story Mission: ${next.name} at level ${next.level}.`, 'sys');
    } else {
      para('You have finished the story. Replay it from STORY MISSIONS to find the other endings.', 'star');
    }
    blockedNote();
    if (c.events.length) {
      heading('RECENT EVENTS');
      for (const e of c.events.slice(0, 8)) {
        G.addLine(`${new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${e.text}`, 'event-line');
      }
    }
    heading('WHERE TO?');
    button('1. Story Missions', () => go('missions'));
    button('2. Gym: train your squad', () => go('gym'));
    button('3. Sec-Ops: undercity jobs for credits', () => go('ops'));
    button('4. Patrol: fight for credits and XP', () => go('patrol'));
    button('5. BSDF Job: report for duty', () => go('job'));
  };

  // ----- gym -----

  let gymWho = LEADER;

  function trainGain(stat, morale) {
    const v = stat;
    const base = 0.12 * (0.5 + morale / 100);
    return (base / (1 + Math.max(0, v - 10) / 8)) * (0.8 + Math.random() * 0.4);
  }

  function train(times, statKey) {
    if (busy()) return render();
    const m = st().squad[gymWho];
    let total = 0;
    let n = 0;
    while (n < times && bar('energy').v >= GYM_COST) {
      spend('energy', GYM_COST);
      const g = trainGain(m.stats[statKey], bar('morale').v);
      m.stats[statKey] = Math.round((m.stats[statKey] + g) * 1000) / 1000;
      total += g;
      spend('morale', 2);
      n += 1;
    }
    if (!n) { say('[GYM] Not enough energy. It refills over time, or drink a Volt can.', 'warn'); return render(); }
    city().counts.trains += n;
    addXp(n);
    say(`[GYM] ${m.short} trains ${STAT_NAMES[statKey]} ${n}x: +${total.toFixed(2)} (now ${fmtStat(m.stats[statKey])}).`, 'ok');
    render();
  }

  VIEWS.gym = () => {
    para('The old BSDF gym under the Bellows. Every session costs energy. Higher morale means bigger gains.');
    para(`Each session: ${GYM_COST} energy, +1 XP. Morale ${num(bar('morale').v)} gives ×${(0.5 + bar('morale').v / 100).toFixed(2)} gains. Stats help every dice roll in the Story Missions.`, 'sys');
    if (blockedNote()) return;
    heading('WHO TRAINS?');
    const r = row();
    for (const m of Object.values(st().squad)) chip(r, m.short, () => { gymWho = m.id; render(); }, gymWho === m.id);
    const m = st().squad[gymWho];
    heading(`${m.name.toUpperCase()} // ${m.role.toUpperCase()}`);
    const maxTimes = Math.floor(bar('energy').v / GYM_COST);
    let i = 1;
    for (const [k, label] of Object.entries(STAT_NAMES)) {
      const r2 = row('train-row');
      const lab = document.createElement('span');
      lab.className = 'train-label';
      lab.textContent = `${label} ${fmtStat(m.stats[k])}`;
      r2.appendChild(lab);
      const one = chip(r2, `${i++}. Train ×1`, () => train(1, k));
      one.classList.add('choice');
      one.disabled = maxTimes < 1;
      const all = chip(r2, `Train ×${Math.max(1, maxTimes)} (all energy)`, () => train(maxTimes, k));
      all.disabled = maxTimes < 2;
    }
  };

  // ----- sec-ops -----

  function opChance(op) {
    const stat = jaz().stats[op.stat];
    return clamp(Math.round(60 + (stat - 10) * 4 + Math.min(30, city().opsXp / 10) - op.diff), 5, 95);
  }

  function runOp(op) {
    const c = city();
    if (busy()) return render();
    if (bar('nerve').v < op.nerve) { say('[SEC-OP] Not enough nerve.', 'warn'); return render(); }
    spend('nerve', op.nerve);
    c.counts.ops += 1;
    const chance = opChance(op);
    const r = rand(1, 100);
    if (r <= chance) {
      const got = rand(...op.credits);
      addCredits(got);
      c.opsXp += op.xp;
      say(`[SUCCESS] ${op.name}: +${cr(got)}, +${op.xp} XP.`, 'ok');
      if (op.loot && Math.random() < op.loot.chance) {
        G.api.addItem(op.loot.item);
      }
      addXp(op.xp);
      log(`Sec-op done: ${op.name} (+${cr(got)}).`);
    } else {
      c.opsXp += 1;
      const roll = Math.random();
      if (roll < 0.4) {
        const mins = 3 + op.level * 2;
        say(`[BUSTED] BSDF military police catch you mid-op. ${mins} minutes in the brig.`, 'bad');
        jail(mins, op.name);
      } else if (roll < 0.6) {
        const hurt = Math.ceil(lifeMax(c) * (0.2 + Math.random() * 0.2));
        say(`[HURT] The op goes loud. You take ${hurt} damage getting out.`, 'bad');
        spend('life', hurt);
        if (bar('life').v <= 0) hospitalize(10 + op.level, `hurt on a sec-op (${op.name})`);
      } else {
        say('[FAILED] Nothing to grab. You walk away empty-handed.', 'warn');
      }
    }
    render();
  }

  VIEWS.ops = () => {
    para('The undercity runs on favors and stolen credits. Every op costs nerve. Success pays and sharpens your skill. Failure can mean the brig.');
    para(`Sec-op skill: ${num(city().opsXp)}. Chances use Jaz's stats.`, 'sys');
    if (blockedNote()) return;
    let i = 1;
    for (const op of OPS) {
      const locked = city().level < op.level;
      const label = locked
        ? `🔒 ${op.name} <span class="tag">[unlocks at level ${op.level}]</span>`
        : `${i++}. ${op.name} <span class="tag">[${op.nerve} nerve · ${STAT_NAMES[op.stat]} · ${opChance(op)}% · ${num(op.credits[0])}–${cr(op.credits[1])}]</span><br><small>${op.text}</small>`;
      button(label, () => runOp(op), { disabled: locked || bar('nerve').v < op.nerve });
    }
  };

  // ----- patrol -----

  function fight(foe) {
    const c = city();
    if (busy()) return render();
    if (bar('energy').v < PATROL_COST) { say('[PATROL] Not enough energy.', 'warn'); return render(); }
    spend('energy', PATROL_COST);
    c.counts.patrols += 1;
    const me = jaz().stats;
    const useStr = me.str >= me.agi;
    const atkStat = useStr ? me.str : me.agi;
    const myDef = 10 + mod(me.agi) + Math.floor(c.level / 3);
    let foeHp = foe.hp;
    const lines = [];
    let round = 1;
    for (; round <= 25 && foeHp > 0 && bar('life').v > 0; round++) {
      const d = die(20);
      if (d === 20 || (d !== 1 && d + mod(atkStat) + Math.floor(c.level / 2) >= foe.def)) {
        const dmg = die(10) + 2 * Math.max(0, mod(atkStat)) + c.level + (d === 20 ? 6 : 0);
        foeHp = Math.max(0, foeHp - dmg);
        lines.push(`R${round}: You ${useStr ? 'hit' : 'shoot'} ${foe.name} for ${dmg}${d === 20 ? ' (CRITICAL)' : ''}.`);
      } else {
        lines.push(`R${round}: You miss.`);
      }
      if (foeHp <= 0) break;
      const e = die(20);
      if (e === 20 || (e !== 1 && e + foe.atk >= myDef)) {
        const dmg = die(foe.dmg) + Math.floor(foe.level / 2);
        spend('life', dmg);
        lines[lines.length - 1] += ` ${foe.name} hits you for ${dmg}.`;
      } else {
        lines[lines.length - 1] += ` ${foe.name} misses.`;
      }
    }
    for (const l of lines) say(l, 'sys');
    if (foeHp <= 0) {
      const got = rand(...foe.credits);
      addCredits(got);
      say(`[WIN] ${foe.name} is down. You take ${cr(got)} and ${foe.xp} XP.`, 'ok');
      addXp(foe.xp);
      log(`Beat a ${foe.name} on patrol (+${cr(got)}).`);
    } else if (bar('life').v <= 0) {
      const mins = 10 + foe.level;
      say(`[LOST] ${foe.name} puts you on the ground. ${mins} minutes in the hospital.`, 'bad');
      hospitalize(mins, `lost a fight to a ${foe.name}`);
    } else {
      say(`[STALEMATE] ${foe.name} slips away into the crowd.`, 'warn');
    }
    render();
  }

  VIEWS.patrol = () => {
    para('Walk the streets and pick a fight with the people hurting this city. Each fight costs energy and life. If your life hits zero, you end up in the hospital.');
    para(`Each fight: ${PATROL_COST} energy. Jaz fights with STR or AGI, whichever is higher.`, 'sys');
    if (blockedNote()) return;
    if (bar('life').v <= 0) { para('You need some life back before you patrol.', 'warn'); return; }
    let i = 1;
    for (const f of FOES) {
      const locked = city().level < f.level;
      const label = locked
        ? `🔒 ${f.name} <span class="tag">[level ${f.level}]</span>`
        : `${i++}. ${f.name} <span class="tag">[level ${f.level} · ${f.hp} HP · ${num(f.credits[0])}–${cr(f.credits[1])} · ${f.xp} XP]</span>`;
      button(label, () => fight(f), { disabled: locked || bar('energy').v < PATROL_COST });
    }
  };

  // ----- job -----

  function workShift() {
    const c = city();
    if (busy()) return render();
    if (now() - c.lastShift < SHIFT_GAP) return render();
    const pay = RANKS[c.rank].pay;
    c.lastShift = now();
    c.shifts += 1;
    addCredits(pay);
    gain('morale', 10);
    say(`[DUTY] Shift done as ${RANKS[c.rank].name}. Pay: ${cr(pay)}. +10 morale, +10 XP.`, 'ok');
    addXp(10);
    log(`Worked a BSDF shift (+${cr(pay)}).`);
    render();
  }

  function promote() {
    const c = city();
    c.rank += 1;
    c.shifts = 0;
    say(`[PROMOTED] You are now ${RANKS[c.rank].name}. Pay per shift: ${cr(RANKS[c.rank].pay)}.`, 'star');
    log(`Promoted to ${RANKS[c.rank].name}.`);
    render();
  }

  VIEWS.job = () => {
    const c = city();
    const rank = RANKS[c.rank];
    const nextRank = RANKS[c.rank + 1];
    para('Your BSDF job pays every shift. Report for duty once every 8 hours.');
    para(`Rank: <b>${rank.name}</b> · Pay per shift: ${cr(rank.pay)} · Shifts at this rank: ${c.shifts}`, 'sys');
    if (blockedNote()) return;
    const wait = c.lastShift + SHIFT_GAP - now();
    if (wait > 0) {
      button(`Next shift in <span data-until="${c.lastShift + SHIFT_GAP}">${fmtTime(wait)}</span>`, () => {}, { disabled: true });
    } else {
      button(`1. Report for duty (+${cr(rank.pay)})`, workShift);
    }
    if (nextRank) {
      const ready = c.shifts >= SHIFTS_TO_PROMOTE && c.level >= nextRank.level;
      button(`${ready ? '2. ' : ''}Request promotion to ${nextRank.name} <span class="tag">[${SHIFTS_TO_PROMOTE} shifts at this rank and level ${nextRank.level}]</span>`,
        promote, { disabled: !ready });
    } else {
      para('You hold the top rank. Nobody outranks a Sergeant Major in this squad.', 'star');
    }
  };

  // ----- market -----

  function buy(id) {
    const price = priceOf(id);
    if (city().credits < price) { say('[MARKET] Not enough credits.', 'warn'); return render(); }
    city().credits -= price;
    G.api.addItem(id);
    render();
  }

  VIEWS.market = () => {
    para('A covered market under the tram bridge. Cash only. No questions.');
    let i = 1;
    for (const s of SHOP) {
      const it = S.items[s.id];
      button(`${i++}. ${it.name} <span class="tag">[${cr(s.price)}]</span><br><small>${s.use || it.desc}</small>`,
        () => buy(s.id), { disabled: city().credits < s.price });
    }
  };

  // ----- inventory -----

  function useItem(id) {
    const c = city();
    const api = G.api;
    if (!api.hasItem(id)) return render();
    if (id === 'volt') { gain('energy', 25); say('[ITEM] Volt can: +25 energy.', 'ok'); }
    else if (id === 'stim') { gain('nerve', 5); say('[ITEM] Focus stim: +5 nerve.', 'ok'); }
    else if (id === 'meal') { gain('morale', 30); say('[ITEM] Hot meal: +30 morale.', 'ok'); }
    else if (id === 'bandage' || id === 'medkit') {
      const mins = id === 'medkit' ? 20 : 10;
      const pct = id === 'medkit' ? 0.4 : 0.25;
      if (inHospital()) {
        c.hospitalUntil -= mins * MIN;
        say(`[ITEM] ${S.items[id].name}: ${mins} minutes off your hospital stay.`, 'ok');
        if (c.hospitalUntil <= now()) tick();
      } else {
        if (bar('life').v >= lifeMax(c)) { say('[ITEM] Your life is already full.', 'warn'); return render(); }
        const amt = Math.ceil(lifeMax(c) * pct);
        c.bars.life.v = Math.min(lifeMax(c), c.bars.life.v + amt);
        say(`[ITEM] ${S.items[id].name}: +${amt} life.`, 'ok');
      }
    } else return render();
    api.removeItem(id);
    render();
  }

  function sellItem(id) {
    const price = Math.floor(priceOf(id) / 2);
    G.api.removeItem(id);
    addCredits(price);
    say(`[MARKET] Sold ${S.items[id].name} for ${cr(price)}.`, 'ok');
    render();
  }

  VIEWS.items = () => {
    const inv = Object.entries(st().inv);
    if (!inv.length) { para('Your pack is empty. The market sells supplies.'); return; }
    para('Medkits and frags also go with you on Story Missions. Mission items are kept for the story.', 'sys');
    for (const [id, n] of inv) {
      const it = S.items[id];
      heading(`${it.name.toUpperCase()}${n > 1 ? ` ×${n}` : ''}`);
      G.addLine(it.desc, 'item-desc');
      if (STORY_ONLY.includes(id)) continue;
      const r = row();
      if (id !== 'frag') chip(r, 'USE', () => useItem(id));
      if (priceOf(id)) chip(r, `SELL (${cr(Math.floor(priceOf(id) / 2))})`, () => sellItem(id));
    }
  };

  // ----- hospital and brig -----

  VIEWS.hospital = () => {
    const c = city();
    if (inHospital()) {
      para('White sheets, bad coffee and a nurse who has seen worse.');
      para(`Discharge in <b><span data-until="${c.hospitalUntil}">${fmtTime(c.hospitalUntil - now())}</span></b>.`, 'warn');
      if (G.api.hasItem('bandage')) button('1. Use a bandage roll (10 minutes off)', () => useItem('bandage'));
      if (G.api.hasItem('medkit')) button('2. Use a field medkit (20 minutes off)', () => useItem('medkit'));
      if (!G.api.hasItem('bandage') && !G.api.hasItem('medkit')) para('No bandages or medkits in your pack.', 'sys');
    } else {
      para('You are not admitted. If your life hits zero in a fight, you end up here for a while.');
      para(`Life ${num(bar('life').v)}/${num(lifeMax(c))}. It refills over time.`, 'sys');
    }
  };

  const bailCost = () => 100 + 20 * Math.ceil((city().brigUntil - now()) / MIN);

  function postBail() {
    const cost = bailCost();
    if (city().credits < cost) { say('[BRIG] You cannot cover the bail.', 'warn'); return render(); }
    city().credits -= cost;
    city().brigUntil = 0;
    say(`[BRIG] Bail paid: ${cr(cost)}. You are free.`, 'ok');
    log(`Posted bail (${cr(cost)}).`);
    render();
  }

  VIEWS.brig = () => {
    const c = city();
    if (inBrig()) {
      para('A concrete cell, a steel bench and an MP who keeps calling you "Sergeant Major" like it is a joke.');
      para(`Release in <b><span data-until="${c.brigUntil}">${fmtTime(c.brigUntil - now())}</span></b>.`, 'warn');
      button(`1. Post bail (${cr(bailCost())})`, postBail, { disabled: c.credits < bailCost() });
    } else {
      para('The cells are empty. Get caught on a sec-op and you will be back.');
    }
  };

  // ----- story missions -----

  function chapterState(ch) {
    const c = city();
    if (ch.n <= c.chaptersDone) return 'done';
    if (c.mission && c.mission.chapter === ch.n) return 'active';
    if (ch.n === c.chaptersDone + 1 && c.level >= ch.level) return 'ready';
    return 'locked';
  }

  function startChapter(ch) {
    if (busy()) return render();
    const c = city();
    for (const m of Object.values(st().squad)) { m.hp = m.stats.maxHp; m.down = false; }
    c.mission = { chapter: ch.n, resume: null };
    log(`Started Story Mission ${ch.n}: ${ch.name}.`);
    G.enter(`ch${ch.n}`);
  }

  function resumeChapter() {
    if (busy()) return render();
    const c = city();
    const how = c.mission.resume;
    c.mission.resume = null;
    if (how === 'checkpoint') {
      if (st().checkpoint) return G.loadCheckpoint();
      return G.enter(`ch${c.mission.chapter}`);
    }
    G.enter(st().scene, { fromSave: true });
  }

  function pauseMission() {
    if (st().combat) return;
    city().mission.resume = 'scene';
    say('[MISSION PAUSED] Pick it up again from STORY MISSIONS.', 'warn');
    go('home');
  }

  function completeChapter(n) {
    const c = city();
    const reward = chapterReward(n);
    c.chaptersDone = Math.max(c.chaptersDone, n);
    c.mission = null;
    addCredits(reward.credits);
    say(`[MISSION COMPLETE] Chapter ${n}: +${cr(reward.credits)}, +${num(reward.xp)} XP.`, 'star');
    log(`Completed Story Mission ${n}: ${CHAPTERS[n - 1].name}.`);
    addXp(reward.xp);
    const next = CHAPTERS[n];
    if (next) say(`[INTEL] Next: ${next.name} at level ${next.level}.`, 'sys');
    go('missions');
  }

  function completeCampaign(sceneId) {
    const c = city();
    const name = ENDINGS[sceneId];
    if (!c.endings.includes(name)) c.endings.push(name);
    log(`Reached an ending: ${name}.`);
    completeChapter(6);
  }

  function evacuate() {
    const c = city();
    c.mission.resume = 'checkpoint';
    hospitalize(10, `Story Mission ${c.mission.chapter} went wrong`);
    say('[EVAC] A BSDF dropship pulls the squad out. You wake up in the hospital.', 'bad');
    go('hospital');
  }

  // Replaying keeps level, credits, rank and trained stats, and resets the story.
  function replayStory() {
    const old = st();
    const fresh = G.newState();
    fresh.city = old.city;
    fresh.mode = 'city';
    for (const [id, m] of Object.entries(fresh.squad)) {
      const kept = clone(old.squad[id].stats);
      m.stats = kept;
      m.hp = kept.maxHp;
    }
    fresh.inv = Object.fromEntries(Object.entries(old.inv).filter(([id]) => !STORY_ONLY.includes(id)));
    fresh.city.chaptersDone = 0;
    fresh.city.mission = null;
    G.state = fresh;
    say('[STORY RESET] The story starts again from Chapter 1. Your level, credits, rank and training stay.', 'star');
    go('missions');
  }

  VIEWS.missions = () => {
    const c = city();
    para('The main story. Each chapter unlocks at a set level. Inside a mission it plays like before: choices, dice checks, squad fights and the Starstone.');
    para('If the squad falls, you are evacuated to the hospital and can retry from the last checkpoint once you are out.', 'sys');
    if (c.endings.length) para(`Endings found: ${c.endings.join(', ')} (${c.endings.length} of 3).`, 'star');
    blockedNote();
    for (const ch of CHAPTERS) {
      const s = chapterState(ch);
      const r = chapterReward(ch.n);
      const tag = `<span class="tag">[level ${ch.level} · ${cr(r.credits)} · ${num(r.xp)} XP]</span>`;
      if (s === 'done') button(`✓ Chapter ${ch.n}: ${ch.name} <span class="tag">[complete]</span>`, () => {}, { disabled: true });
      else if (s === 'active') button(`► Resume Chapter ${ch.n}: ${ch.name}${c.mission.resume === 'checkpoint' ? ' (from checkpoint)' : ''}`, resumeChapter, { disabled: busy() });
      else if (s === 'ready') button(`► Start Chapter ${ch.n}: ${ch.name} ${tag}`, () => startChapter(ch), { disabled: busy() });
      else button(`🔒 Chapter ${ch.n}: ${ch.name} ${tag}`, () => {}, { disabled: true });
    }
    if (c.chaptersDone >= 6) {
      heading('REPLAY');
      button('Replay the story from Chapter 1 (keeps level, credits and training)', replayStory);
    }
  };

  // ---------- story hooks ----------

  // Chapter-end and ending scenes return to the city; a lost fight evacuates to the hospital.
  H.choices = (sceneId, list) => {
    if (sceneId === 'gameover') {
      return [{ text: 'Evacuate to the BSDF hospital. Retry from the last checkpoint when you are out.', run: evacuate }];
    }
    if (ENDINGS[sceneId]) {
      return [{ text: '<b>Return to Blue Star City.</b>', run: () => completeCampaign(sceneId) }];
    }
    const next = list.find((c) => /^ch\d$/.test(c.to || ''));
    if (next) {
      const n = Number(next.to.slice(2)) - 1;
      const r = chapterReward(n);
      return [{ text: `<b>Return to Blue Star City.</b> <span class="tag">[+${cr(r.credits)} · +${num(r.xp)} XP]</span>`, run: () => completeChapter(n) }];
    }
    return null;
  };

  H.slotSummary = (data) => {
    const c = data.state.city;
    const where = data.state.mode === 'mission' ? `Ch ${c.mission ? c.mission.chapter : '?'} mission` : 'City';
    return `LVL ${c.level} · ${cr(c.credits)} · ${where} · ${new Date(data.savedAt).toLocaleString()}`;
  };

  // ---------- autosave and timers ----------

  function save() {
    try { localStorage.setItem(AUTO_KEY, JSON.stringify(G.packSave())); } catch { /* storage blocked */ }
  }

  function boot() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(AUTO_KEY) || 'null'); } catch { data = null; }
    if (data && G.validSave(data)) {
      G.loadSave(data);
    } else {
      G.newGame();
    }
  }

  let lastSave = now();
  setInterval(() => {
    if (!st() || !st().city) return;
    const changed = tick();
    renderHud();
    let expired = false;
    for (const el of document.querySelectorAll('[data-until]')) {
      const left = Number(el.dataset.until) - now();
      el.textContent = fmtTime(left);
      if (left <= 0) expired = true;
    }
    // Refresh the city screen so buttons match the new bars, keeping the last messages.
    if ((changed || expired) && st().mode === 'city') render({ keep: true });
    if (now() - lastSave > 15000) { lastSave = now(); save(); }
  }, 1000);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  window.STARSTONE.city = { go, tick, addXp, addCredits, hospitalize, jail, save, CHAPTERS };
  boot();
})();
