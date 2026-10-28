# Starstone

A text-based, story-driven sci-fi game that runs in the browser.

## Play

Double-click `index.html` to open it in your browser. No install is needed.

- Click a choice, or press its number key.
- **SAVE / LOAD** has 3 save slots stored in this browser on this device, plus
  **EXPORT SAVE TO FILE** and **IMPORT SAVE FILE** so you can keep saves as files.
- After a game over you can retry from the last checkpoint.

## How it's built

| File | What it holds |
|---|---|
| `index.html` | The page layout |
| `css/style.css` | The green military-terminal look |
| `js/engine.js` | Game rules: dice checks, combat, puzzles, Starstone reshaping, saves |
| `js/story.js` | All story content: squad, items, and scenes |

New chapters only need changes to `js/story.js`. The comment at the top of that
file explains how a scene is written.

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
