# Starstone

A text-based, story-driven sci-fi game that runs in the browser. You live in
Blue Star City between missions, Torn-style: bars refill over real time, you
train, work and fight for credits and XP, and the six story chapters unlock
as Story Missions as you level up.

## Play

Double-click `index.html` to open it in your browser. No install is needed.

- Click a choice, or press its number key.
- The game saves itself in this browser after every action.
- **SAVE / LOAD** has 3 save slots stored in this browser on this device, plus
  **EXPORT SAVE TO FILE** and **IMPORT SAVE FILE** so you can keep saves as files.
- After a game over you can retry from the last checkpoint.

## How it's built

| File | What it holds |
|---|---|
| `index.html` | The page layout |
| `css/style.css` | The green military-terminal look |
| `js/engine.js` | Story rules: dice checks, combat, puzzles, Starstone reshaping, saves |
| `js/city.js` | The city: bars, gym, sec-ops, patrol, job, market, hospital, brig, Story Missions. Tuning tables are at the top |
| `js/story.js` | All story content: squad, items, and scenes |

New chapters only need changes to `js/story.js`. The comment at the top of that
file explains how a scene is written.

## The city in short

| Place | What it does |
|---|---|
| Bars | Energy (gym, patrol), Nerve (sec-ops), Morale (bigger gym gains) and Life refill over real time, even with the game closed. Energy is full again in about an hour. |
| Gym | 5 energy per session raises one squad member's STR, AGI, TECH or WILL. Those stats feed every dice roll in the story. |
| Sec-Ops | Undercity jobs that cost nerve. Success pays credits and XP; failure can mean the brig or the hospital. |
| Patrol | Auto-resolved fights for 25 energy. Lose all your life and you spend time in the hospital. |
| BSDF Job | One paid shift every 8 hours. Promotions raise the pay. |
| Market / Inventory | Buy and use medkits, frags, bandages, meals, Volt cans and stims. |
| Story Missions | Chapters 1 to 6 unlock at levels 1, 3, 5, 7, 9 and 11. Losing a story fight sends you to the hospital, then you retry from the last checkpoint. After an ending you can replay the story and keep your progress. |

Saves from the old version (before the city) can't be loaded.

## Rules in short

- **Dice checks:** d20 + stat modifier against a difficulty (DC). Modifier is
  (stat − 10) ÷ 2, rounded down. A natural 20 always passes and a natural 1 always fails.
- **Combat:** each round you give one order, then every enemy fires back.
  Taking cover makes you harder to hit for that round. Knox's hack makes enemies
  easier to hit for the rest of the fight. Boone can revive a downed squad member.
  A fight is lost only when the whole squad is down.
- **The Starstone:** each charge reshapes one squad member (+2 to a stat or +4 max HP).
  Every use raises hidden Strain and costs some of Vale's trust.

Story guide: https://claude.ai/artifact/DKYjE5KGvACeFXFB5TzTvd
