/*
 * Starstone story data.
 *
 * Each scene has:
 *   title     heading shown above the scene
 *   text      list of paragraphs (or a function returning one)
 *   choices   [{ text, to, effects?, if?, check?, action? }]
 *               check:  { who, stat, dc, success, fail }  rolls d20 + stat modifier
 *               action: 'reshape' | 'restart' | 'checkpoint'
 *   onEnter   function run once when the scene starts
 *   combat    { enemies, win, lose, opening? } (or a function returning one)
 *   puzzle    { prompt, answer, hint, success }
 *   checkpoint true to make "retry" return here after a game over
 */
// Helpers for the finale: how much the squad trusts Jaz, and whether they hold together.
const SQUAD_IDS = ['raines', 'cross', 'vale', 'boone', 'knox'];
const avgTrust = (a) => SQUAD_IDS.reduce((t, id) => t + a.member(id).trust, 0) / SQUAD_IDS.length;
const holdsTheLine = (a) => a.state.strain <= 3 && avgTrust(a) >= 3;
const trustWord = (a) => {
  const t = avgTrust(a);
  return t >= 4 ? 'unshakable' : t >= 3 ? 'solid' : t >= 2 ? 'strained' : 'broken';
};

window.STORY = {
  start: 'ch1',
  leader: 'jaz',

  squad: {
    jaz: {
      name: 'Sgt. Maj. Jaz Stone', short: 'Stone', role: 'Squad Leader',
      stats: { maxHp: 22, str: 13, agi: 12, tech: 11, will: 15 },
      combat: { label: 'Lead the assault', type: 'attack', stat: 'will' },
    },
    raines: {
      name: 'Staff Sgt. Malik Raines', short: 'Raines', role: 'Breacher',
      stats: { maxHp: 26, str: 15, agi: 10, tech: 9, will: 12 },
      combat: { label: 'Breach and hammer', type: 'attack', stat: 'str' },
    },
    cross: {
      name: 'Sgt. Nia Cross', short: 'Cross', role: 'Recon',
      stats: { maxHp: 18, str: 11, agi: 15, tech: 12, will: 11 },
      combat: { label: 'Flank and strike', type: 'attack', stat: 'agi' },
    },
    vale: {
      name: 'Sgt. Darius Vale', short: 'Vale', role: 'Marksman',
      stats: { maxHp: 18, str: 10, agi: 14, tech: 11, will: 13 },
      combat: { label: 'Take the shot', type: 'attack', stat: 'agi' },
    },
    boone: {
      name: 'Spc. Tessa Boone', short: 'Boone', role: 'Medic',
      stats: { maxHp: 18, str: 10, agi: 12, tech: 14, will: 13 },
      combat: { label: 'Patch up the wounded', type: 'heal', stat: 'tech' },
    },
    knox: {
      name: 'Cpl. Elijah Knox', short: 'Knox', role: 'Comms/Tech',
      stats: { maxHp: 16, str: 9, agi: 11, tech: 15, will: 10 },
      combat: { label: 'Scramble their optics', type: 'hack', stat: 'tech' },
    },
  },

  items: {
    medkit: { name: 'Field medkit', desc: 'Restores 8 HP to the most wounded squad member.' },
    frag: { name: 'Frag grenade', desc: 'Deals 2d6 damage to every enemy.' },
    box: { name: 'Secret box', desc: 'A dented steel case. Warm to the touch.' },
    ledger: { name: 'NorthStar intake ledger', desc: 'Names, ages and "intake dates" of shelter residents. None were ever discharged.' },
    drawing: { name: "Child's drawing", desc: 'A crayon star over a stick-figure family. Signed "Mira, age 7".' },
    widowmark: { name: 'Spider-web glyph', desc: 'The signature hidden in the code that hacked Knox\'s slate. The mark of Widow Saint.' },
    clinicfiles: { name: 'Clinic 4 records', desc: 'Prisoners held for Starstone trials, orders signed by Cmdr. A. Veyr, and transfers to the Orchard.' },
    tracker: { name: 'NorthStar tracker', desc: 'Pulled from Hound Zero\'s wrist. It points home: the Orchard.' },
    manifest: { name: 'Transport manifest', desc: 'NorthStar "deliveries" to a site called the Orchard. The cargo column lists people.' },
  },

  startInventory: { medkit: 2, frag: 1 },

  // Hidden Strain rises each time the Starstone is used.
  strainMessages: {
    1: 'A cold ache settles behind your eyes.',
    2: 'Your hands shake for a second. Boone notices.',
    3: 'You can hear the Starstone humming even when you are not touching it.',
  },

  onReshape(api, m) {
    if (m.id === 'vale') {
      api.note('Vale flexes his fingers, staring at them. "Don\'t do that to me again without asking."', 'warn');
      api.trust('vale', -1);
    } else {
      api.note(`Vale watches ${m.short} and says nothing. His jaw is tight.`, 'warn');
      api.trust('vale', -1);
    }
    if (m.id === 'raines') api.note('Raines rolls his shoulders. "Huh. I feel like I could put my head through a wall. Again."');
    if (m.id === 'cross') api.note('Cross blinks hard. "Everything is so sharp. I can hear your heartbeat, Sergeant Major."');
    if (m.id === 'boone') api.note('Boone checks her own pulse, then yours. "Whatever that was, it costs you something."');
    if (m.id === 'knox') api.note('Knox laughs, too loud. "Oh, that\'s weird. That\'s really weird. I can see the signal."');
  },

  scenes: {
    ch1: {
      title: 'Chapter 1',
      text: [
        '<b>CHAPTER 1 // LANTERN</b>',
        'Blue Star has been at peace for eleven years. The Great War took a generation of soldiers and left the cities to rebuild on top of their own ruins.',
        'Lowtown never got rebuilt. It just got quiet.',
      ],
      choices: [{ text: 'Begin.', to: 'intro' }],
    },

    intro: {
      title: 'Dropship Kestrel-9',
      text: [
        '<b>BLUE STAR // LOWTOWN DISTRICT // 0214 HOURS</b>',
        'Rain hammers the hull of dropship Kestrel-9 as it skims the dead rooftops of Lowtown. Red cabin light. Six soldiers. One mission.',
        'Cpl. Elijah Knox has the brief open on his wrist slate. He has read it eleven times. "Asset codename LANTERN. A researcher inside the NorthStar Foundation shelter. Wants out, and is bringing a package. We get both home to Blue Star Defense Forces."',
        'Staff Sgt. Malik Raines cracks his knuckles. "A charity shelter. Last time I kicked down a door at a charity, a nun hit me with a ladle."',
        '"You deserved the ladle," Spc. Tessa Boone says, without looking up from her med kit.',
        'Every eye in the cabin drifts to you. Sgt. Maj. Jaz Stone. The still center.',
      ],
      choices: [
        { text: 'Go over the intel with Knox.', effects: (a) => { a.flag('intel'); a.trust('knox', 1); }, to: 'intel' },
        { text: 'Let them talk. Banter keeps them loose.', effects: (a) => a.trust('raines', 1), to: 'banter' },
        { text: '"Quiet. Eyes on the mission."', effects: (a) => a.flag('focused'), to: 'drop' },
      ],
    },

    intel: {
      title: 'Dropship Kestrel-9',
      text: [
        'Knox swipes the thermal feed onto the cabin wall. "Four heat signatures inside. Two outside, by the door. The outside two aren\'t shelter staff. They\'re standing too well."',
        '"Sentries," Sgt. Darius Vale says.',
        '"And there\'s this." Knox taps a white bloom in the basement. "Some kind of power source. It\'s warm. Like, really warm. Nothing in that building should run that hot."',
        'He looks at you. "Probably nothing, right?" It is not nothing.',
      ],
      choices: [{ text: 'Strap in.', to: 'drop' }],
    },

    banter: {
      title: 'Dropship Kestrel-9',
      text: [
        '"Ten credits says Raines trips on the ramp," says Sgt. Nia Cross.',
        '"Ten says Cross gets lost in a straight hallway," Raines fires back.',
        '"I\'ll take both bets," Vale says.',
        '"I\'ll take whoever\'s bleeding," Boone says. "Same as always."',
        'Knox raises a hand. "Can I bet that nobody bleeds?" The whole cabin laughs at him. For a moment the red light feels warmer.',
      ],
      choices: [{ text: 'Strap in.', to: 'drop' }],
    },

    drop: {
      title: 'NorthStar Shelter',
      checkpoint: true,
      text: (a) => [
        'Kestrel-9 drops you two blocks out and is gone before your boots hit the water. Lowtown has no power and no people. Except for one building.',
        'A converted warehouse glows at the end of the street, a blue star sign humming above the door: <b>NORTHSTAR FOUNDATION · WE LIGHT THE WAY HOME</b>. A charity that keeps its lights on in a district with none.',
        'Two figures in long black coats stand by the entrance. Cross lowers her scope. "Fang pins on the collars. Those aren\'t volunteers."',
        a.has('intel') ? 'Knox whispers, "Told you. Standing too well."' : 'Raines grins. "Finally. People I\'m allowed to hit."',
      ],
      choices: [
        { text: 'Send Cross ahead to scout.', check: { who: 'cross', stat: 'agi', dc: 12, success: 'scout_ok', fail: 'scout_bad' } },
        { text: 'Have Vale take one out from the rooftop.', check: { who: 'vale', stat: 'agi', dc: 13, success: 'snipe_ok', fail: 'scout_bad' } },
        { text: 'Go in loud. Raines, take point.', effects: (a) => { a.flag('loud'); a.trust('raines', 1); }, to: 'fight' },
      ],
    },

    scout_ok: {
      title: 'NorthStar Shelter',
      onEnter: (a) => a.flag('ambush'),
      text: [
        'Cross melts into the rain. Ninety seconds later your earpiece clicks twice.',
        '"Two sentries. One smoking, one bored. Both carrying. Neither has looked up once." A pause. "Amateurs. I\'m almost insulted."',
        'You have the drop on them.',
      ],
      choices: [{ text: 'Hit them.', to: 'fight' }],
    },

    snipe_ok: {
      title: 'NorthStar Shelter',
      onEnter: (a) => { a.flag('sniped'); a.trust('vale', 1); },
      text: [
        'Vale settles on the rooftop opposite. One breath in. One breath out. A single suppressed crack, and the smoking sentry folds without a sound.',
        '"One down," Vale says. "The other one\'s yours. He\'s just noticed his friend is taking a nap."',
      ],
      choices: [{ text: 'Move in.', to: 'fight' }],
    },

    scout_bad: {
      title: 'NorthStar Shelter',
      onEnter: (a) => a.flag('alerted'),
      text: [
        'A bottle skitters across the wet concrete. Both sentries spin. One of them shouts into his collar, and the warehouse door bangs open.',
        'A third coat steps out. Bigger. Carrying something with a drum magazine.',
        '"Well," Raines says. "Loud it is."',
      ],
      choices: [{ text: 'Engage.', to: 'fight' }],
    },

    fight: {
      title: 'Contact',
      text: ['Muzzle flash lights up the rain. The Cobra\'s Fang does not ask questions.'],
      combat: (a) => {
        const enemies = [
          { name: 'Fang Sentry', hp: 12, def: 12, atk: 3, dmg: 6 },
          { name: 'Fang Sentry', hp: 12, def: 12, atk: 3, dmg: 6 },
        ];
        if (a.has('sniped')) enemies.pop();
        if (a.has('alerted')) enemies.push({ name: 'Fang Enforcer', hp: 18, def: 13, atk: 4, dmg: 8 });
        return { enemies, win: 'fight_won', lose: 'gameover', opening: a.has('ambush') ? 3 : 0 };
      },
    },

    fight_won: {
      title: 'Inside the Shelter',
      text: [
        'Inside, rows of cots fill the warehouse floor. Every one is empty. Too empty. Blankets folded with military precision. Children\'s drawings of stars are taped to the wall.',
        'Boone pulls one down and stares at it. "Where are the people, Sergeant Major?"',
        'At the back, a steel door marked <b>AUTHORIZED STAFF ONLY</b>, with a four-digit keypad. A brass plaque beside it reads: <b>NORTHSTAR FOUNDATION · FOUNDED 2189</b>.',
        'Taped under the keypad is a note in small, neat handwriting: <i>"For the ones who come for me. The door remembers when we began, read the way the stars fall."</i>',
      ],
      choices: [
        { text: 'Search the shelter office first.', if: (a) => !a.has('searchedOffice'), to: 'office' },
        { text: 'Take the drawing from Boone.', if: (a) => !a.has('tookDrawing'), effects: (a) => { a.flag('tookDrawing'); a.addItem('drawing'); a.trust('boone', 1); a.note('Boone hands it over without a word. You fold it into your vest.'); } },
        { text: 'Work out the keypad code yourself.', to: 'door_puzzle' },
        { text: 'Knox, crack it.', check: { who: 'knox', stat: 'tech', dc: 13, success: 'lab', fail: 'hack_fail' } },
      ],
    },

    office: {
      title: 'Shelter Office',
      onEnter: (a) => { a.flag('searchedOffice'); a.addItem('ledger'); },
      text: [
        'The office is spotless. A fern on the desk. A framed photo of smiling volunteers. A coffee mug that says <i>WORLD\'S OKAYEST CHARITY WORKER</i>.',
        'Cross jimmies the filing cabinet. Inside is a thick ledger: names, ages, intake dates. Hundreds of them. She runs her finger down the last column.',
        '"Discharge date," she says. "It\'s blank. Every single one. Nobody who came in here ever left."',
        'Raines picks up the mug, reads it, and puts it down very gently. Nobody laughs.',
      ],
      choices: [{ text: 'Take the ledger and go back to the door.', to: 'fight_won' }],
    },

    hack_fail: {
      title: 'Inside the Shelter',
      onEnter: (a) => a.damage('knox', 3),
      text: [
        'The keypad spits blue sparks. Knox yelps and shakes out his hand. "Okay. Okay! It has a counter-intrusion loop. Fried my glove. Possibly my eyebrows."',
        'Raines leans in. "Eyebrows look fine, kid. Can\'t say the same for the rest of your face."',
        'The door is still locked. The note is still there.',
      ],
      choices: [{ text: 'Read the note again.', to: 'door_puzzle' }],
    },

    door_puzzle: {
      title: 'The Keypad',
      text: [
        'The plaque: <b>NORTHSTAR FOUNDATION · FOUNDED 2189</b>.',
        'The note: <i>"The door remembers when we began, read the way the stars fall."</i>',
      ],
      puzzle: {
        prompt: 'ENTER 4-DIGIT CODE',
        answer: ['9812'],
        hint: 'Cross: "Stars fall down. Backward. Read the founding year backward, Sergeant Major."',
        success: 'lab',
      },
    },

    lab: {
      title: 'The Basement Lab',
      onEnter: (a) => { a.flag('metBanister'); a.addItem('box'); },
      text: [
        'The door hisses open on a stairwell lit pale blue. At the bottom, a lab. Restraint chairs. Medical monitors. Too many of them.',
        'A man in a stained lab coat stands with his hands up, clutching a dented steel case to his chest. "Don\'t shoot! I\'m LANTERN, I\'m the one who called, I\'m..."',
        'He stops. He stares at you. "...Jaz?"',
        'Dr. Brace Banister. Your uncle. The man who raised you after your father died in the Great War. He taught you to fix an engine, to throw a punch, and to never quit. You have not seen him in two years. Deployments. Excuses.',
        '"Sergeant Major," Raines says slowly. "You know the package?"',
        '"He\'s my uncle."',
        'Vale sighs. "Of course he is."',
        'Banister presses the case into your hands. His fingers are shaking. "They said they\'d send the best. I didn\'t think they meant you. This box is why the Fang wants me dead. Whatever\'s inside, NorthStar has been feeding people to it."',
        'Knox presses a hand to his earpiece. "Uh, boss? Something just landed on the roof. Moving fast. Way too fast."',
        'Cross is already checking her rifle. "Then we\'re out of time."',
      ],
      choices: [
        { text: '"Uncle Brace. Open the box. Now."', effects: (a) => a.trust('cross', -1), to: 'starstone' },
        { text: '"Questions later. We move."', effects: (a) => a.trust('vale', 1), to: 'starstone' },
      ],
    },

    starstone: {
      title: 'The Starstone',
      onEnter: (a) => {
        a.flag('starstone');
        a.charge(1);
        a.removeItem('box');
      },
      text: [
        'The case splits along its seam before anyone touches the lock. Light pours out. Cold, blue, alive.',
        'Inside sits a shard of fallen star the size of a fist, humming at a pitch you feel in your teeth. It pulls at your hand like a magnet. You do not decide to touch it. You just do.',
        'The world goes quiet. You see six threads of light, one for each of your people. Strength. Speed. Nerve. Every one of them is written out like numbers on a screen. And you understand, the way you understand breathing, that you can rewrite them.',
        '"It\'s responding to you," Banister whispers. "In three years it never responded to anyone."',
        'Boone grabs your wrist. "Sarge. Your veins are glowing."',
        '<i>You can channel the Starstone at any time outside a fight with the button under SQUAD STATUS.</i>',
      ],
      choices: [
        { text: 'Channel the Starstone into one of your squad.', action: 'reshape', to: 'hound_arrives' },
        { text: 'Pull your hand away. Not yet.', to: 'hound_arrives' },
      ],
    },

    hound_arrives: {
      title: 'Hound Zero',
      text: [
        'Above you, the skylight explodes. A shape drops through the falling glass and lands on all fours at the bottom of the stairs.',
        'It stands up. It is a man, or it was. Tall and starved-thin, with black veins crawling up his neck and a NorthStar patient band still on his wrist under the armor. His nostrils flare. His eyes catch the light like a dog\'s.',
        'He breathes in deep and smiles. "There it is. I can smell it on you. <i>Starlight.</i>"',
        'Banister makes a small, broken sound. "Subject Zero. That\'s Subject Zero. They pumped him full of tracking compounds for a year. I... I signed his intake form."',
        '"Hound Zero, actually," the man says, tilting his head. "I picked the name myself. Hello, doctor."',
      ],
      choices: [
        { text: '"Light him up!"', to: 'hound_fight' },
        { text: 'Frag out and run.', if: (a) => a.hasItem('frag'), effects: (a) => { a.removeItem('frag'); a.flag('headStart'); }, to: 'hound_frag' },
        { text: '"Knox, kill the lights!"', check: { who: 'knox', stat: 'tech', dc: 12, success: 'hound_dark', fail: 'hound_fight' } },
      ],
    },

    hound_fight: {
      title: 'Hound Zero',
      onEnter: (a) => {
        if (a.member('raines').stats.str >= 17) {
          a.flag('rainesHeld');
          a.damage('raines', 5);
          a.trust('raines', 1);
        } else {
          a.damage('raines', 8);
          a.damage('vale', 4);
        }
      },
      text: (a) => [
        'The squad opens up. Every round lands. It does not matter. Hound Zero moves through the gunfire like it is weather, laughing.',
        a.has('rainesHeld')
          ? 'Raines meets him head on. The Starstone\'s strength is in his arms now, and for three long seconds he holds the Hound against the wall. "GO! I got him! I GOT HIM!" Then he lets go and runs with you, bleeding and grinning.'
          : 'He catches Raines by the vest and throws him into a steel cabinet like he weighs nothing. Vale takes a backhand that spins him off his feet.',
        'Vale scrambles up, spitting blood. "He\'s not going down, Sergeant Major. Rounds don\'t do anything!"',
        'There is only one order left to give.',
      ],
      choices: [{ text: '"Fall back! Everybody out!"', to: 'escape' }],
    },

    hound_frag: {
      title: 'Hound Zero',
      text: [
        'The grenade bounces once and rolls between his feet. Hound Zero looks down at it, almost curious.',
        'The blast fills the stairwell with smoke and burning chemicals. Somewhere inside it, he is howling. Not in pain. In delight.',
        'His scent trail just got buried in smoke. You have a head start. Use it.',
      ],
      choices: [{ text: '"Move! Move!"', to: 'escape' }],
    },

    hound_dark: {
      title: 'Hound Zero',
      onEnter: (a) => { a.flag('headStart'); a.trust('knox', 1); },
      text: [
        'Knox slams his slate against the lab breaker. Every light in the building dies.',
        'In the dark, Hound Zero sniffs. "Clever. But I don\'t need my eyes, little soldiers."',
        'He doesn\'t. But he still has to cross a room full of overturned restraint chairs to reach you. That buys you the seconds you need.',
        'Knox is grinning in the green glow of his visor. "Did that work? That worked. Oh, that\'s a first."',
      ],
      choices: [{ text: '"Out. Now."', to: 'escape' }],
    },

    escape: {
      title: 'Escape',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 5);
        a.note('[MED] Boone slaps field dressings on everyone as you run. +5 HP to the squad.', 'ok');
      },
      text: (a) => [
        'You haul Banister up the stairs and through the empty shelter. Behind you, a long, rising howl. It echoes off the cots like something from the old war films.',
        a.has('headStart') ? 'You have a lead. Maybe a minute. Maybe less.' : 'He is close. You can hear him breathing.',
        'Three ways out:',
        'Through the kitchens to the loading dock. Cross knows the layout.',
        'Up the fire stairs and across the rooftops. Raines would have to bridge the gap between buildings.',
        'Banister grabs your arm. "Or down. There\'s a drain hatch in the laundry. NorthStar uses the storm drains to move... deliveries."',
      ],
      choices: [
        { text: 'Kitchens and loading dock. Cross, lead.', check: { who: 'cross', stat: 'agi', dc: 12, success: 'dock', fail: 'dock_hurt' } },
        { text: 'Rooftops. Raines, get us across.', check: { who: 'raines', stat: 'str', dc: 13, success: 'rooftops', fail: 'rooftop_slip' } },
        { text: 'Into the storm drains.', to: 'drains' },
      ],
    },

    dock: {
      title: 'Loading Dock',
      onEnter: (a) => { a.addItem('manifest'); a.trust('cross', 1); },
      text: [
        'Cross takes you through the kitchens at a dead sprint, around a walk-in freezer, and through a fire door she has already propped open.',
        'On the loading dock, a clipboard hangs on a nail. She snatches it on the way past. Transport manifests. Destination: <b>THE ORCHARD</b>. In the cargo column, where it should list crates, it lists names.',
        'Cross reads it, and her face goes very still. "Sergeant Major. We\'re going to need to talk about your uncle\'s employer."',
        'Then she stops dead at the edge of the dock. Headlights. A Fang patrol is blocking the street.',
      ],
      choices: [{ text: 'Engage the patrol.', to: 'blockade' }],
    },

    dock_hurt: {
      title: 'Loading Dock',
      onEnter: (a) => a.damage('cross', 4),
      text: [
        'Cross takes the corner too fast and goes down hard on a greasy kitchen floor. A pot of something still boiling goes over with her.',
        '"I\'m fine," she hisses, scalded and limping. "I\'m fine. Go."',
        'You burst out onto the loading dock, straight into the headlights of a Fang patrol.',
      ],
      choices: [{ text: 'Engage the patrol.', to: 'blockade' }],
    },

    rooftops: {
      title: 'Rooftops',
      onEnter: (a) => { a.flag('highGround'); a.trust('raines', 1); },
      text: [
        'On the roof, Raines rips a steel access ladder off its brackets and throws it across the gap to the next building. It lands with a clang that echoes down the whole street.',
        '"After you," he says, bowing. "Mind the gap."',
        'You cross one by one in the rain. From up here, Vale spots a Fang patrol blocking the street below, looking the wrong way.',
        '"High ground," Vale murmurs, settling his rifle. "My favorite kind."',
      ],
      choices: [{ text: 'Hit the patrol from above.', to: 'blockade' }],
    },

    rooftop_slip: {
      title: 'Rooftops',
      onEnter: (a) => { a.damage('raines', 4); a.trust('knox', 1); },
      text: [
        'The ladder makes it across. Knox doesn\'t. Halfway over, a rung snaps, and he drops.',
        'Raines throws himself flat and catches Knox by the wrist. Something in his shoulder pops. He hauls Knox up anyway, swearing in three languages.',
        '"You owe me a shoulder, kid."',
        '"Put it on my tab," Knox gasps.',
        'Below you, a Fang patrol has heard the commotion. Flashlights swing upward.',
      ],
      choices: [{ text: 'Engage the patrol.', to: 'blockade' }],
    },

    blockade: {
      title: 'Fang Patrol',
      text: ['Engine noise, shouting, and the dry click of safeties coming off. The Cobra\'s Fang wants its doctor back.'],
      combat: (a) => ({
        enemies: [
          { name: 'Fang Enforcer', hp: 16, def: 13, atk: 3, dmg: 8 },
          { name: 'Fang Sentry', hp: 10, def: 12, atk: 2, dmg: 6 },
          { name: 'Fang Sentry', hp: 10, def: 12, atk: 2, dmg: 6 },
        ],
        win: 'blockade_won',
        lose: 'gameover',
        opening: a.has('highGround') ? 3 : 0,
      }),
    },

    blockade_won: {
      title: 'Fang Patrol',
      text: [
        'The last patrolman goes down in a puddle that reflects the blue NorthStar sign two blocks back.',
        'Then the howl comes again. Closer.',
        'Boone looks at the dead patrol, then at you. "We need somewhere to stop, Sarge. Half of us are bleeding."',
      ],
      choices: [{ text: 'Find cover and get off the street.', to: 'brace_scene' }],
    },

    drains: {
      title: 'Storm Drains',
      text: [
        'The laundry hatch drops you into black water up to your knees. The smell hits like a punch.',
        'Boone gags. "Sewage. Finally something that smells worse than Raines."',
        '"I take offense to that," Raines says. "Mostly because it\'s true."',
        'Banister leads you through the tunnels by memory. Above, footsteps. Then they fade. The Hound can\'t smell anything through this. After ten minutes you reach a rusted gate with a voice lock. Someone has scratched words into the concrete beside it: <i>COURIERS: TONIGHT\'S WORD IS WHAT WE LIGHT.</i>',
      ],
      choices: [{ text: 'Step up to the voice lock.', to: 'drain_gate' }],
    },

    drain_gate: {
      title: 'Voice Lock',
      text: [
        'The scratched message: <i>COURIERS: TONIGHT\'S WORD IS WHAT WE LIGHT.</i>',
        'A red light blinks, waiting.',
      ],
      puzzle: {
        prompt: 'SPEAK THE PASSWORD',
        answer: ['the way', 'way', 'the way home'],
        hint: 'Banister: "It\'s the slogan. On the sign outside. We light... the way home."',
        success: 'drain_open',
      },
    },

    drain_open: {
      title: 'Storm Drains',
      onEnter: (a) => a.flag('tookDrains'),
      text: [
        'The gate grinds open. Banister looks ill. "We light the way home. I used to believe that."',
        'Beyond the gate is a maintenance room, dry and forgotten. No Fang. No Hound. Just a bare bulb and a rusted bench.',
      ],
      choices: [{ text: 'Rest here.', to: 'brace_scene' }],
    },

    brace_scene: {
      title: 'A Quiet Hour',
      checkpoint: true,
      onEnter: (a) => {
        if (a.has('rested')) return;
        a.flag('rested');
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 8);
        a.note('[MED] Boone patches everyone up. +8 HP to the squad.', 'ok');
      },
      text: (a) => [
        a.has('tookDrains')
          ? 'In the maintenance room, the squad finally breathes. Raines falls asleep sitting up. Knox sets a perimeter alarm with shaking hands.'
          : 'You find an abandoned laundromat with a steel shutter. Rain drums on the roof. Raines falls asleep sitting up. Knox sets a perimeter alarm with shaking hands.',
        'Uncle Brace sits apart from everyone, staring at his hands.',
        'You sit down next to him. For a long moment neither of you says anything.',
        '"You still crack your knuckles before a fight," he says finally. "I taught you that. Your mother hated it."',
        'You remember the garage. The old hover-bike you rebuilt together the summer after the funeral. Your father\'s medals in a box on the shelf, the only thing Brace never let you touch. Every school event, every bad night, every time you called. He was always there. Until you stopped calling.',
        '"I joined NorthStar because they said we could fix people," he says quietly. "Addicts. Broken families. The ones the war left behind. I wanted to help people like your father\'s friends. And then I found out what the basement was for."',
        'He looks at you. "I\'m not a good man, Jaz. I\'m just a man who got scared too late."',
      ],
      choices: [
        { text: '"You raised me. I\'m not leaving you behind. Whatever it takes."', effects: (a) => { a.flag('braceLoyal'); a.trust('cross', -1); a.note('Across the room, Cross is listening. She looks away.'); }, to: 'brace_after' },
        { text: '"You helped build that thing out there. You\'ll answer for it. After I get you home."', effects: (a) => { a.flag('braceCold'); a.trust('vale', 1); }, to: 'brace_after' },
        { text: '"Does Aunt Selene know where you are?"', if: (a) => !a.has('askedWife'), to: 'brace_wife' },
      ],
    },

    brace_wife: {
      title: 'A Quiet Hour',
      onEnter: (a) => a.flag('askedWife'),
      text: [
        'Something softens in his face. "Selene? No. God, no. She thinks I\'m at a conference in Highport. I left her a letter, just in case."',
        '"She worries about me. She was the one who told me to take the NorthStar job, you know. Said it was a chance to do real good." He smiles. "She\'s the only good thing I ever did right, Jaz. Besides you."',
        'Somewhere out in the rain, very far away, something howls.',
      ],
      choices: [{ text: 'Let the silence sit for a moment.', to: 'brace_scene' }],
    },

    brace_after: {
      title: 'A Quiet Hour',
      text: (a) => [
        a.has('braceLoyal')
          ? 'Brace grips your hand, hard, the way he did at the funeral. He doesn\'t say anything. He doesn\'t need to.'
          : 'Brace nods slowly. "That\'s fair. That\'s more than fair." He looks older than you remember.',
        a.hasItem('drawing') ? 'Later, Boone sits next to you and you unfold the drawing between you. A crayon star over a stick-figure family. <i>Mira, age 7.</i> "We find her," Boone says. It is not a question.' : 'Later, Boone checks your pulse twice and says nothing about the glow still fading from your veins.',
        a.hasItem('ledger') ? 'Cross pages through the intake ledger by flashlight, her lips moving as she counts. She stops somewhere past three hundred.' : 'Vale cleans his rifle in silence, watching Brace the whole time.',
      ],
      choices: [{ text: 'Get some sleep.', to: 'chapter1_end' }],
    },

    chapter1_end: {
      title: 'Dawn',
      onEnter: (a) => { a.charge(1); a.flag('chapter1Done'); },
      text: [
        'At dawn Knox finally gets a signal through to Blue Star Defense Forces. He listens, nods, and lowers his slate.',
        '"Extraction tomorrow night. The old rail yard at Sector 12. They\'re sending a gunship." He hesitates. "They asked for our exact route. I gave it to them. That\'s... normal, right?"',
        'Nobody answers him.',
        'The Starstone pulses once in your vest, warm against your ribs. It has recovered a charge.',
        'Far away, somewhere above the city, a voice carries on the wind like it was meant for you alone: <i>"Run all you like, starlight. I never lose a scent."</i>',
        '<b>CHAPTER 1 COMPLETE.</b>',
      ],
      choices: [{ text: 'Continue to Chapter 2.', to: 'ch2' }],
    },

    ch2: {
      title: 'Chapter 2',
      text: [
        '<b>CHAPTER 2 // THE HUNT</b>',
        'Sector 12 was the biggest rail yard on Blue Star before the war. Now it is a graveyard of rusted freight cars, half-sunk in weeds and rainwater.',
        'Extraction is at 0100. Kestrel-9 is coming back for you.',
      ],
      choices: [{ text: 'Move out.', to: 'railyard' }],
    },

    railyard: {
      title: 'Sector 12 Rail Yard',
      checkpoint: true,
      text: [
        '0047 hours. The squad waits in the shadow of an overturned freight car. Brace sits with his back to the steel, clutching the empty box out of habit.',
        'Knox keeps checking his slate. "Kestrel-9 confirms. Thirteen minutes. Same route I sent them." He swallows. "That\'s good. That\'s good, right?"',
        '"Kid," Raines says, "if you ask if things are good one more time, I\'m going to start thinking they\'re not."',
        'You have a few minutes to set up.',
      ],
      choices: [
        { text: 'Put Vale on the old water tower for overwatch.', effects: (a) => { a.flag('overwatch'); a.trust('vale', 1); }, to: 'gunship_down' },
        { text: 'Keep everyone tight around Uncle Brace.', effects: (a) => { a.flag('tight'); a.trust('raines', 1); }, to: 'gunship_down' },
        { text: 'Have Cross sweep the yard for anything wrong.', check: { who: 'cross', stat: 'agi', dc: 13, success: 'sweep_ok', fail: 'gunship_down' } },
      ],
    },

    sweep_ok: {
      title: 'Sector 12 Rail Yard',
      onEnter: (a) => { a.flag('warned'); a.trust('cross', 1); },
      text: [
        'Cross comes back fast and low. "Fresh boot prints by the signal house. Lots of them. And a launcher tube, sir. Someone\'s planning to shoot something out of the sky."',
        'Knox goes white. "Kestrel-9. I have to warn them..."',
        'He keys the radio. Static. The channel is being jammed.',
      ],
      choices: [{ text: '"Everyone into cover. Now."', to: 'gunship_down' }],
    },

    gunship_down: {
      title: 'Kestrel-9',
      text: (a) => [
        'Kestrel-9 comes in low over the freight cars, landing lights blazing. For one second, it looks like you are going home.',
        'Then a streak of fire leaps up from the signal house.',
        a.has('warned')
          ? 'Because Cross found them, the squad is already in cover when the rocket hits the gunship\'s tail rotor.'
          : 'The rocket hits the gunship\'s tail rotor and the squad dives for anything solid.',
        'Kestrel-9 spins, screams, and plows into the yard in a shower of sparks, tearing through two freight cars before it stops on its side, burning.',
        'Black coats pour out of the signal house. The Cobra\'s Fang was here first. They knew exactly where you would be.',
      ],
      choices: [{ text: 'Return fire!', to: 'railyard_fight' }],
    },

    railyard_fight: {
      title: 'Ambush',
      text: ['Gunfire rattles off the freight cars. The burning gunship lights the whole yard orange.'],
      combat: (a) => ({
        enemies: [
          { name: 'Fang Gunner', hp: 14, def: 12, atk: 3, dmg: 8 },
          { name: 'Fang Sentry', hp: 10, def: 12, atk: 2, dmg: 6 },
          { name: 'Fang Sentry', hp: 10, def: 12, atk: 2, dmg: 6 },
        ],
        win: 'wreck',
        lose: 'gameover',
        opening: (a.has('overwatch') ? 3 : 0) + (a.has('warned') ? 2 : 0),
      }),
    },

    wreck: {
      title: 'The Wreck',
      text: [
        'You reach the wreck through the smoke. The cockpit glass is cracked and smeared red.',
        'The pilot is Flight Lieutenant Wren Hollis, a lanky veteran who once flew your squad out of a burning city with half an engine. She is alive, barely. Her leg is pinned. She does not wake when you say her name.',
        'Boone is already at her side. "Internal bleeding. Head trauma. If I don\'t stabilize her now, we\'re carrying a body."',
      ],
      choices: [
        { text: 'Use a field medkit on her.', if: (a) => a.hasItem('medkit'), effects: (a) => { a.removeItem('medkit'); a.flag('pilotStable'); a.trust('boone', 1); }, to: 'wreck_done' },
        { text: '"Boone, do what you can."', check: { who: 'boone', stat: 'tech', dc: 12, success: 'wreck_stable', fail: 'wreck_critical' } },
      ],
    },

    wreck_stable: {
      title: 'The Wreck',
      onEnter: (a) => { a.flag('pilotStable'); a.trust('boone', 1); },
      text: ['Boone works fast. Clamp, pack, inject. Hollis\'s breathing evens out. "She\'s stable. Unconscious, but stable. Someone has to carry her."'],
      choices: [{ text: 'Raines pulls her free of the cockpit.', to: 'wreck_done' }],
    },

    wreck_critical: {
      title: 'The Wreck',
      onEnter: (a) => a.flag('pilotCritical'),
      text: ['Boone swears and keeps working. "I\'ve slowed the bleeding. I haven\'t stopped it. She needs a real medbay in the next day, or she doesn\'t make it."'],
      choices: [{ text: 'Raines pulls her free of the cockpit.', to: 'wreck_done' }],
    },

    wreck_done: {
      title: 'The Wreck',
      text: [
        'Raines lifts Hollis out of the cockpit like she weighs nothing and settles her over his shoulder. "Got you, Lieutenant. You can buy the drinks when you wake up."',
        'Then Knox\'s slate starts beeping. Not an alarm. A transmission confirmation. Something on his slate just sent a message, and he did not send it.',
        'Knox stares at the screen. "No. No, no, no. That\'s not me. That\'s not..."',
        'Cross has her pistol up and pointed at his chest before he finishes the sentence. "Drop the slate, Knox."',
      ],
      choices: [
        { text: '"Stand down, Cross. Knox is one of ours."', effects: (a) => { a.flag('trustedKnox'); a.trust('knox', 2); a.trust('cross', -1); }, to: 'leak_trust' },
        { text: '"Knox. Hand over the slate. Now."', effects: (a) => { a.flag('slateTaken'); a.trust('knox', -1); a.trust('cross', 1); }, to: 'leak_take' },
        { text: '"Knox, can you trace it? Right now?"', check: { who: 'knox', stat: 'tech', dc: 14, success: 'trace_ok', fail: 'trace_fail' } },
      ],
    },

    leak_trust: {
      title: 'The Leak',
      text: [
        'Cross holds the pistol on him for one more second. Then she lowers it. "If you\'re wrong, Sergeant Major, we\'re all dead."',
        'Knox looks at you like you just pulled him out of a fire. "I didn\'t do it. I swear I didn\'t. Someone\'s in my slate. I\'ll find them. I\'ll find them."',
        'You believe him. You think.',
      ],
      choices: [{ text: '"Find them later. We have to move."', to: 'hound_returns' }],
    },

    leak_take: {
      title: 'The Leak',
      text: [
        'Knox hands it over. His hands are shaking. He does not look at you.',
        'Cross pockets the slate. "Nothing personal, kid."',
        '"Yeah," Knox says quietly. "Everyone always says that."',
      ],
      choices: [{ text: '"We move. Now."', to: 'hound_returns' }],
    },

    trace_ok: {
      title: 'The Leak',
      onEnter: (a) => { a.flag('knowsWidowMark'); a.trust('knox', 1); a.addItem('widowmark'); },
      text: [
        'Knox\'s fingers fly. "There. A ghost process piggybacking every transmission I send. It\'s been in my slate for weeks. Someone planted it when I was on leave."',
        'He freezes the screen. Buried in the code is a signature: a tiny glyph shaped like a spider\'s web with a single drop at the center.',
        'Cross slowly lowers her pistol. "I\'ve seen that mark. On bodies. The Fang have an assassin who leaves it. They call her Widow Saint."',
        'Behind you, Brace has gone very quiet.',
      ],
      choices: [{ text: '"Kill the slate. We move."', to: 'hound_returns' }],
    },

    trace_fail: {
      title: 'The Leak',
      onEnter: (a) => a.trust('cross', 1),
      text: [
        'Knox jabs at the screen. The ghost process sees him coming. The slate flashes white and dies in his hands, smoking.',
        '"It wiped itself," he whispers. "Whatever it was, it\'s gone. I can\'t prove anything now."',
        'Cross keeps her pistol up a little longer this time before she lowers it.',
      ],
      choices: [{ text: '"We move. Now."', to: 'hound_returns' }],
    },

    hound_returns: {
      title: 'The Hunt',
      checkpoint: true,
      text: [
        'A howl rolls across the rail yard, long and delighted. On top of a freight car at the far end of the yard, a thin figure crouches against the firelight.',
        '"Starlight!" Hound Zero calls. "You brought me a bleeding one! How thoughtful!"',
        'The only way out is the old freight tunnel under the yard, down into the undercity. With Hollis on his shoulder, Raines is going to be slow.',
      ],
      choices: [
        { text: 'Everyone goes together. Cross, find us the fastest route.', check: { who: 'cross', stat: 'agi', dc: 13, success: 'tunnel_clear', fail: 'hound_catch' } },
        { text: 'Leave Hollis with a beacon. BSDF can pick her up.', effects: (a) => { a.flag('leftPilot'); a.trust('boone', -2); a.trust('raines', -1); }, to: 'left_pilot' },
        { text: 'Vale stays back with a flare and buys us time.', check: { who: 'vale', stat: 'will', dc: 12, success: 'vale_flare', fail: 'hound_catch' } },
      ],
    },

    left_pilot: {
      title: 'The Hunt',
      text: [
        'Raines sets Hollis down against the rail with a blinking beacon on her chest. He doesn\'t say anything. He doesn\'t have to.',
        'Boone kneels by her for a moment, then stands up and walks past you without meeting your eyes.',
        'You make the tunnel easily. Behind you, the howling stops. You try very hard not to think about why.',
      ],
      choices: [{ text: 'Keep going.', to: 'undercity' }],
    },

    tunnel_clear: {
      title: 'Freight Tunnel',
      onEnter: (a) => a.trust('cross', 1),
      text: [
        'Cross finds a maintenance crawlway the Hound doesn\'t know about. It is tight, wet, and pitch black, and Raines has to drag Hollis through on her back.',
        '"Remind me," Raines grunts, "why I didn\'t become a dentist."',
        '"Couldn\'t pass the exam," Vale says.',
        'The howling fades behind you.',
      ],
      choices: [{ text: 'Keep going.', to: 'undercity' }],
    },

    vale_flare: {
      title: 'Freight Tunnel',
      onEnter: (a) => a.trust('vale', 1),
      text: [
        'Vale waits at the tunnel mouth until the Hound is twenty meters out. Then he fires a magnesium flare straight into his face.',
        'For a nose built to track a single drop of sweat across a city, it is like being hit with a hammer. Hound Zero reels back, shrieking.',
        'Vale catches up a minute later, breathing hard. "He\'ll be smelling burnt magnesium for a week. You\'re welcome."',
      ],
      choices: [{ text: 'Keep going.', to: 'undercity' }],
    },

    hound_catch: {
      title: 'Freight Tunnel',
      onEnter: (a) => { a.damage('vale', 5); a.damage('raines', 4); a.damage('jaz', 4); },
      text: [
        'He is faster than anything human. Halfway down the tunnel, Hound Zero hits the back of the line.',
        'He rakes Vale across the back, slams Raines into the wall, and is reaching for Hollis when you put yourself between them.',
        'For one second you are face to face. His breath smells like chemicals. "Not yet," he whispers, almost fondly. "I want to watch you run a little longer."',
        'Then he is gone, back up the tunnel, laughing.',
      ],
      choices: [{ text: 'Get everyone moving.', to: 'undercity' }],
    },

    undercity: {
      title: 'The Sink',
      checkpoint: true,
      text: [
        'The tunnel opens into an old subway station turned into a town. Lanterns hang from the ceiling. Market stalls fill the platforms. Hundreds of people live down here, under the city that forgot them.',
        'They call it the Sink.',
        'Two kinds of people catch your eye right away. Some wear blue armbands with a white star: <b>Lamplighters</b>, people NorthStar feeds and houses. Others have an empty circle painted on their jackets: <b>the Hollow</b>, families of people NorthStar took.',
        'Everyone is watching six armed soldiers carry a bleeding pilot through their market.',
        'Brace pulls his collar up. "If the Lamplighters recognize me, they\'ll sell us to the Fang in a heartbeat."',
        'Three people step forward.',
      ],
      choices: [{ text: 'Hear them out.', to: 'sink_offers' }],
    },

    sink_offers: {
      title: 'The Sink',
      text: [
        '<b>Mother Agnes</b>, a tiny old woman with a blue star armband, smiles kindly. "Oh, you poor things. You\'re hurt. I have soup, beds and a doctor. NorthStar takes care of us, and we take care of everyone."',
        '<b>Tomas "Rat" Veen</b>, a teenage scavenger with too many pockets, leans on a pillar. "I know every hidey-hole in the Sink. For the right price, I can make you disappear."',
        '<b>Dara Quill</b>, a scarred woman with an empty circle tattooed on her neck, doesn\'t step closer. She just watches you. "Soldiers. Carrying a NorthStar coat." She looks right at Brace. "Give me one reason I shouldn\'t call the whole Hollow down on you."',
      ],
      choices: [
        { text: 'Accept Mother Agnes\'s offer.', to: 'agnes' },
        { text: 'Pay Rat to hide you.', to: 'rat' },
        { text: 'Show Dara the child\'s drawing.', if: (a) => a.hasItem('drawing'), to: 'dara_drawing' },
        { text: 'Show Dara the NorthStar intake ledger.', if: (a) => a.hasItem('ledger'), to: 'dara_proof' },
        { text: 'Show Dara the transport manifest.', if: (a) => a.hasItem('manifest'), to: 'dara_proof' },
        { text: 'Talk Dara around. Tell her the truth.', if: (a) => !a.has('daraRefused'), check: { who: 'jaz', stat: 'will', dc: 15, success: 'dara_proof', fail: 'dara_refuses' } },
      ],
    },

    dara_refuses: {
      title: 'The Sink',
      onEnter: (a) => a.flag('daraRefused'),
      text: [
        'You tell her everything. The shelter. The lab. The empty cots. Dara listens to every word without blinking.',
        '"Pretty story," she says. "NorthStar tells pretty stories too." She turns and disappears into the crowd.',
      ],
      choices: [{ text: 'Turn back to the other two.', to: 'sink_offers' }],
    },

    dara_drawing: {
      title: 'The Hollow',
      onEnter: (a) => { a.flag('hollowAllies'); a.flag('miraNiece'); a.trust('boone', 1); },
      text: [
        'You unfold the drawing. A crayon star over a stick-figure family. <i>Mira, age 7.</i>',
        'Dara stops breathing. She takes the paper with both hands, very carefully, like it might fall apart.',
        '"Mira is my sister\'s girl," she says. Her voice cracks on the last word. "They went into the NorthStar shelter last winter. They said it was warm there."',
        'She looks up, and the hostility is gone. Something harder has replaced it. "Where did you find this? Tell me everything. And then you\'re coming with me."',
        'Boone puts a hand on her shoulder. Dara lets her.',
      ],
      choices: [{ text: 'Follow Dara.', to: 'safehouse' }],
    },

    dara_proof: {
      title: 'The Hollow',
      onEnter: (a) => a.flag('hollowAllies'),
      text: [
        'Dara studies what you show her for a long time. Then she looks at Brace again, differently.',
        '"You\'re running from them. Not working for them." She tucks her hands into her jacket. "The Hollow has a place. Come on. Stay close, and don\'t talk to anyone wearing a star."',
      ],
      choices: [{ text: 'Follow Dara.', to: 'safehouse' }],
    },

    rat: {
      title: 'The Sink',
      text: (a) => [
        'Rat eyes your gear. "Price is a frag grenade or a medkit. Fang pays better, but the Fang are jerks."',
        a.hasItem('frag') || a.hasItem('medkit') ? 'You have something he wants.' : 'You have nothing he wants. He shrugs. "Charity case, then. Just this once. You owe me."',
      ],
      choices: [
        { text: 'Give him a frag grenade.', if: (a) => a.hasItem('frag'), effects: (a) => a.removeItem('frag'), to: 'rat_guide' },
        { text: 'Give him a field medkit.', if: (a) => a.hasItem('medkit'), effects: (a) => a.removeItem('medkit'), to: 'rat_guide' },
        { text: '"We\'ll owe you."', if: (a) => !a.hasItem('frag') && !a.hasItem('medkit'), effects: (a) => a.flag('oweRat'), to: 'rat_guide' },
        { text: 'Change your mind.', to: 'sink_offers' },
      ],
    },

    rat_guide: {
      title: 'The Sink',
      onEnter: (a) => { a.flag('ratAlly'); a.flag('hollowAllies'); },
      text: [
        'Rat leads you through a maze of tarps and pipes so fast even Cross struggles to keep up. He talks the whole way. He has opinions on everything, especially soldiers, and especially their haircuts.',
        'He stops at a rusted door with an empty circle painted on it and knocks a pattern. "Hollow safehouse. They hate NorthStar more than you do." He grins. "I didn\'t bring you here. Never saw you."',
        'The door opens. Dara Quill stands behind it. She looks at Rat, then at you, and sighs. "Get in before someone sees you."',
      ],
      choices: [{ text: 'Go inside.', to: 'safehouse' }],
    },

    agnes: {
      title: 'Mother Agnes',
      text: [
        'Agnes leads you to a warm room behind a noodle stall. There really is soup. It smells incredible.',
        'She pats Brace\'s hand. "Doctor Banister. We all know your face. NorthStar has been so worried about you."',
        'Brace\'s spoon stops halfway to his mouth.',
        'Through the curtain, you catch the reflection of black coats in a cracked mirror. Agnes is still smiling. "They\'ll take care of you, dear. They take care of everyone."',
      ],
      choices: [{ text: 'Flip the table. Fight.', to: 'agnes_trap' }],
    },

    agnes_trap: {
      title: 'Betrayal',
      onEnter: (a) => a.flag('agnesBetrayed'),
      text: ['The soup goes everywhere. Fang enforcers pour through the curtain with stun batons and pistols.'],
      combat: () => ({
        enemies: [
          { name: 'Fang Enforcer', hp: 14, def: 13, atk: 2, dmg: 8 },
          { name: 'Fang Enforcer', hp: 14, def: 13, atk: 2, dmg: 8 },
        ],
        win: 'agnes_after',
        lose: 'gameover',
      }),
    },

    agnes_after: {
      title: 'The Sink',
      onEnter: (a) => a.flag('hollowAllies'),
      text: [
        'When it is over, Mother Agnes is gone, and the noodle stall is wrecked. Out in the market, the crowd is staring.',
        'Dara Quill steps out of it. She has been watching the whole time. "You fought the Fang. In front of everybody." She almost smiles. "Maybe you\'re not with them after all."',
        '"You\'ll want to leave before Agnes comes back with more. Follow me."',
      ],
      choices: [{ text: 'Follow Dara.', to: 'safehouse' }],
    },

    safehouse: {
      title: 'The Bellows',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 12);
        a.note('[MED] Hot food, clean water, and real beds. +12 HP to the squad.', 'ok');
      },
      text: (a) => [
        'The Hollow safehouse is an old pump station called the Bellows. Giant iron pipes, a dozen cots, a working stove, and three exits. The walls are covered in photos of missing people with empty circles drawn around their faces.',
        'Dara gives you the tour. "Families of the taken. We watch NorthStar. We keep records. We wait." She looks at your squad. "We\'ve never had soldiers before."',
        a.has('leftPilot')
          ? 'Boone sits alone in a corner, staring at the wall. Nobody mentions Hollis.'
          : (a.has('pilotCritical')
            ? 'The Hollow have a medic, a former nurse named Ollie. He takes one look at Hollis and gets to work. "She\'s bad. But I\'ve seen worse come back." Hollis still hasn\'t woken up.'
            : 'The Hollow have a medic, a former nurse named Ollie. He checks Hollis and nods. "Whoever stabilized her did good work." Hollis still hasn\'t woken up.'),
        'For the first time in two days, nobody is shooting at you.',
      ],
      choices: [{ text: 'Settle in.', to: 'safehouse_night' }],
    },

    safehouse_night: {
      title: 'The Bellows',
      text: (a) => [
        a.has('knowsWidowMark')
          ? 'Late that night, Knox shows Brace the spider-web glyph from his slate. Brace stares at it for a long time. "Selene has a pendant like that," he says slowly. "Silver. A web with a drop in the middle. She said it was her grandmother\'s." Nobody says anything after that.'
          : 'Late that night, Brace sits by the stove, turning his wedding ring around and around his finger.',
        a.has('slateTaken')
          ? 'Knox sleeps on the far side of the room from everyone else.'
          : 'Knox stays up late, rebuilding a comms rig from Hollow scrap. "Clean this time," he mutters. "Nobody gets in this time."',
        a.has('miraNiece') ? 'Dara pins Mira\'s drawing to the wall with the others. Then she pins up a photo of Mira beside it.' : 'Dara writes something in a notebook full of names, then closes it.',
        'Raines looks around the pump station, at the pipes and the cots and the photos on the walls. "Not bad," he says. "Could use a dartboard."',
        'It isn\'t home. But for now, it is your base.',
      ],
      choices: [{ text: 'Rest.', to: 'chapter2_end' }],
    },

    chapter2_end: {
      title: 'Morning',
      onEnter: (a) => { a.charge(1); a.flag('chapter2Done'); },
      text: [
        'You wake to Dara shaking your shoulder. She is holding a battered notebook full of names.',
        '"I know where NorthStar takes them," she says. "There\'s a NorthStar clinic in the Glass District. Everyone who goes in comes out \'transferred.\' If you want proof of what they\'re doing, that\'s where it is."',
        'The Starstone pulses warm against your ribs. It has recovered a charge.',
        '<b>CHAPTER 2 COMPLETE.</b>',
      ],
      choices: [{ text: 'Continue to Chapter 3.', to: 'ch3' }],
    },

    ch3: {
      title: 'Chapter 3',
      text: [
        '<b>CHAPTER 3 // THE LEDGER</b>',
        'The Glass District was built after the war to show Blue Star had a future. Mirrored towers. Clean streets. Clinics with fountains in the lobby.',
        'NorthStar Clinic 4 has the biggest fountain of all.',
      ],
      choices: [{ text: 'Begin.', to: 'bellows_brief' }],
    },

    bellows_brief: {
      title: 'The Bellows',
      checkpoint: true,
      text: (a) => [
        'The squad gathers around a hand-drawn map on a Hollow table. Dara pins down the corners with a mug and a pistol.',
        'Brace taps the map. "Clinic 4. Intake on the ground floor. Records on three. And under it all, a sub-basement they call <b>the Ward</b>. I was never allowed down there."',
        '"I\'ll stay here," he adds quietly. "My face would get you all killed. And someone should sit with Lieutenant Hollis."',
        a.has('leftPilot') ? 'Nobody answers that. Hollis isn\'t here.' : 'Hollis is still unconscious on a cot by the stove. Ollie says she might wake in a day or two.',
        'Dara slides a bundle across the table: two stolen NorthStar orderly uniforms and a keycard. "Or there\'s the front door," she says, looking at Raines. "I hear you\'re good with those."',
        'Raines cracks his knuckles. "I\'m great with those."',
      ],
      choices: [
        { text: 'Go in quiet. Cross and Knox in disguise, the rest in the service tunnel.', effects: (a) => a.flag('stealth'), to: 'glass_stealth' },
        { text: 'Go in loud. Raines takes the front door.', effects: (a) => { a.flag('loudRaid'); a.trust('raines', 1); }, to: 'glass_loud' },
      ],
    },

    glass_stealth: {
      title: 'Clinic 4 Lobby',
      text: [
        'Cross and Knox walk through the lobby in white uniforms, past the fountain and a smiling receptionist who doesn\'t look up.',
        'Every corner has a camera. Knox mutters into his collar mic. "If I loop the feed for ninety seconds, the rest of you can get through the service door. If I mess it up, everyone in this building sees six soldiers at once."',
      ],
      choices: [
        { text: '"Do it, Knox."', check: { who: 'knox', stat: 'tech', dc: 13, success: 'stealth_in', fail: 'stealth_spotted' } },
        { text: 'Cross distracts the guard station while Knox works.', check: { who: 'cross', stat: 'will', dc: 12, success: 'stealth_in', fail: 'stealth_spotted' } },
      ],
    },

    stealth_in: {
      title: 'Clinic 4',
      onEnter: (a) => { a.trust('knox', 1); a.flag('unseen'); },
      text: [
        'The feed loops. The service door clicks. Ninety seconds later the whole squad is in a supply elevator, wedged between laundry carts.',
        'Raines is folded into a space meant for towels. "This," he whispers, "is why I prefer the front door."',
        'The elevator climbs to the third floor. Records.',
      ],
      choices: [{ text: 'Step out.', to: 'records' }],
    },

    stealth_spotted: {
      title: 'Clinic 4 Lobby',
      text: [
        'A guard looks at a monitor, then at Knox, then at the monitor again. "Hey. Hey! Your ID photo is a cartoon dog."',
        '"It\'s a very professional cartoon dog," Knox says weakly.',
        'Alarms start to wail. Security pours out of a side door.',
      ],
      choices: [{ text: 'So much for quiet.', to: 'lobby_fight' }],
    },

    glass_loud: {
      title: 'Clinic 4 Lobby',
      text: [
        'Raines walks up to the mirrored front doors, looks at his reflection, fixes his collar, and puts his boot through the glass.',
        'The fountain keeps burbling. The receptionist screams. NorthStar security comes running, and behind them, black coats.',
        '"Good evening!" Raines shouts. "We\'re here about the experiments!"',
      ],
      choices: [{ text: 'Fight through the lobby.', to: 'lobby_fight' }],
    },

    lobby_fight: {
      title: 'Lobby',
      text: ['Glass, water, and gunfire. The Glass District has never seen anything like it.'],
      combat: (a) => ({
        enemies: [
          { name: 'NorthStar Security', hp: 12, def: 12, atk: 2, dmg: 6 },
          { name: 'NorthStar Security', hp: 12, def: 12, atk: 2, dmg: 6 },
          { name: 'Fang Enforcer', hp: 16, def: 13, atk: 3, dmg: 8 },
        ],
        win: 'lobby_won',
        lose: 'gameover',
        opening: a.has('loudRaid') ? 2 : 0,
      }),
    },

    lobby_won: {
      title: 'Clinic 4',
      onEnter: (a) => a.flag('alarm'),
      text: [
        'The lobby is wrecked. Somewhere above, a recorded voice repeats: <i>"Please remain calm. NorthStar is here to help."</i>',
        'Knox checks a wall panel. "Lockdown in ten minutes. After that, every door in this place seals."',
        '"Then we get what we came for in nine," you say.',
      ],
      choices: [{ text: 'Take the stairs to Records.', to: 'records' }],
    },

    records: {
      title: 'Records',
      text: [
        'The third floor is quiet, carpeted, and full of filing terminals. A staff break room. A plant someone forgot to water.',
        'Knox jacks into the main terminal. "It\'s Uncle Brace\'s old account. He gave us his password, but..." He reads the screen. "They changed the policy last month."',
        'A notice is taped to the monitor: <i>NEW PASSWORD POLICY: your new password is your old password, reversed.</i>',
        'Brace\'s old password was his wife\'s name. He told you that at the Bellows with a sad little smile: <b>Selene</b>.',
      ],
      puzzle: {
        prompt: 'ENTER PASSWORD',
        answer: ['eneles'],
        hint: 'Knox: "Reversed. Like, backwards. S-E-L-E-N-E, but the other way."',
        success: 'records_open',
      },
    },

    records_open: {
      title: 'Records',
      onEnter: (a) => a.addItem('clinicfiles'),
      text: [
        'The files open, and the room goes quiet as everyone reads over Knox\'s shoulder.',
        'Hundreds of patient records. None of them are being treated. They are being <b>held</b>. Every file ends the same way: <i>RETAIN IN WARD. RESERVED FOR ARTIFACT COMPATIBILITY TRIALS.</i>',
        'Cross says it out loud. "They\'re keeping them for the Starstone. Waiting until they get it back, so they can test it on them."',
        'Every order is signed by the same name: <b>Cmdr. A. Veyr</b>.',
        'Knox searches for Quill. Two hits. <i>Lena Quill, 34. Mira Quill, 7. TRANSFERRED TO THE ORCHARD.</i> Three weeks ago.',
        'Then Boone points at a file near the top, and her hand is shaking. <i>SUBJECT 31. FORMER BSDF. PFC. DANIEL REYES. RETAINED AS WARD ASSET.</i>',
        '"That\'s Danny," Boone whispers. "That\'s my Danny. He died on my table four years ago. They told me he died."',
      ],
      choices: [{ text: '"Boone. We\'re going down to the Ward."', effects: (a) => a.trust('boone', 1), to: 'ward' }],
    },

    ward: {
      title: 'The Ward',
      checkpoint: true,
      text: [
        'The sub-basement smells like bleach and fear. Row after row of cells with glass fronts. Inside each one, someone lies on a cot, sedated, wearing a NorthStar gown with a number on it.',
        'Old men. Young women. Teenagers. A man still wearing a dirty BSDF jacket from the Great War.',
        'At the end of the row, a figure steps out of the guard station. He is big, gray-skinned, with black veins like Hound Zero\'s, and a stun prod in each hand. His eyes are blank. The number 31 is burned into his neck.',
        'Boone steps forward before anyone can stop her. "Danny? Danny, it\'s me. It\'s Tess."',
        'Subject 31 stops. Something flickers behind his eyes. Then it is gone, and he raises the prods.',
      ],
      choices: [
        { text: 'Let Boone try to reach him.', check: { who: 'boone', stat: 'will', dc: 14, success: 'reyes_saved', fail: 'reyes_fight' } },
        { text: '"Boone, get back! Take him down!"', effects: (a) => a.trust('boone', -1), to: 'reyes_fight' },
      ],
    },

    reyes_fight: {
      title: 'Subject 31',
      text: ['Subject 31 comes at you without a sound. Boone is screaming his name.'],
      combat: () => ({
        enemies: [{ name: 'Subject 31', hp: 26, def: 13, atk: 4, dmg: 8 }],
        win: 'reyes_down',
        lose: 'gameover',
      }),
    },

    reyes_down: {
      title: 'Subject 31',
      onEnter: (a) => a.flag('reyesDead'),
      text: [
        'Subject 31 goes down hard and doesn\'t get up.',
        'Boone is on her knees beside him before the echo dies. For a moment his eyes clear. He looks at her and knows her.',
        '"Tess," he says. "You came back for me." And then he is gone.',
        'Boone closes his eyes with two fingers. When she stands up, her face is completely calm, and that is worse than if she were crying.',
        '"Let\'s get these people out," she says.',
      ],
      choices: [{ text: 'Open the cells.', to: 'cells' }],
    },

    reyes_saved: {
      title: 'Subject 31',
      onEnter: (a) => { a.flag('reyesSaved'); a.trust('boone', 2); },
      text: [
        'Boone drops her rifle and walks straight up to him, hands open. "Danny. You hated the rain. You hummed old war songs badly when you were scared. You owe me twenty credits from cards."',
        'The prods shake in his hands.',
        '"You don\'t work for them," she says. "You never did. Come home."',
        'Subject 31 drops the prods. Then he drops to his knees, and Daniel Reyes starts to cry like a little kid. Boone holds onto him and doesn\'t let go.',
        'Vale lowers his rifle slowly. "I\'ve never seen anyone do that," he says. "Not with words."',
      ],
      choices: [{ text: 'Open the cells.', to: 'cells' }],
    },

    cells: {
      title: 'The Ward',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 6);
        a.note('[MED] Boone raids the Ward\'s medical cabinet. +6 HP to the squad.', 'ok');
      },
      text: (a) => [
        'Knox finds the cell controls. "I can open them all at once. That\'s forty-two people, most of them sedated, and every alarm in the building goes off."',
        '"Or I open the ones who can walk. Maybe a dozen. Quiet. We come back for the rest."',
        a.has('alarm') ? 'Above you, the lockdown countdown is still running.' : 'Nobody upstairs knows you\'re here. Yet.',
        'Cross looks at the cells, then at you. "We won\'t get a second chance at this place, Sergeant Major. They\'ll move them all by morning."',
      ],
      choices: [
        { text: 'Open every cell. Nobody gets left behind.', effects: (a) => { a.flag('freedAll'); a.trust('boone', 1); a.trust('cross', 1); }, to: 'escape_all' },
        { text: 'Only the ones who can walk. Quiet.', effects: (a) => { a.flag('freedSome'); a.trust('vale', 1); }, to: 'escape_some' },
      ],
    },

    escape_all: {
      title: 'Breakout',
      text: (a) => [
        'Every cell door slides open at once, and the alarm becomes a scream.',
        'Raines throws a sedated old man over each shoulder. ' + (a.has('reyesSaved') ? 'Reyes carries a teenager on his back, with Boone right beside him.' : 'Boone carries a teenager on her back.') + ' The squad becomes a moving wall around forty-two stumbling people.',
        'At the top of the stairs, a NorthStar response team is waiting.',
      ],
      choices: [{ text: 'Clear the way.', to: 'escape_fight' }],
    },

    escape_some: {
      title: 'Breakout',
      text: (a) => [
        'Twelve cells open quietly. Twelve people stagger out, blinking, holding each other up. Thirty more watch them leave through the glass.',
        'One of them, an old woman, presses her hand to the glass and nods at you. <i>Go.</i> You will remember that for a long time.',
        a.has('alarm') ? 'The building is already locking down. A response team is waiting at the top of the stairs.' : 'Cross leads the way out through the service tunnels.',
      ],
      choices: [
        { text: 'Fight through.', if: (a) => a.has('alarm'), to: 'escape_fight' },
        { text: 'Follow Cross out quietly.', if: (a) => !a.has('alarm'), check: { who: 'cross', stat: 'agi', dc: 12, success: 'clinic_out', fail: 'escape_fight' } },
      ],
    },

    escape_fight: {
      title: 'Response Team',
      text: ['NorthStar response team in riot armor, with a Fang enforcer giving the orders.'],
      combat: (a) => ({
        enemies: [
          { name: 'NorthStar Response', hp: 12, def: 12, atk: 2, dmg: 6 },
          { name: 'NorthStar Response', hp: 12, def: 12, atk: 2, dmg: 6 },
          ...(a.has('freedAll') ? [{ name: 'Fang Enforcer', hp: 14, def: 13, atk: 3, dmg: 8 }] : []),
        ],
        win: 'clinic_out',
        lose: 'gameover',
      }),
    },

    clinic_out: {
      title: 'Glass District',
      text: (a) => [
        'You come out into the rain behind Clinic 4 with the people you freed. Dara\'s Hollow runners are waiting with tarps, a delivery truck, and a stolen ambulance.',
        a.has('freedAll') ? 'It takes three trips. Every single person makes it out.' : 'It only takes one trip. You do not look back at the building.',
        a.has('reyesSaved') ? 'Reyes sits in the back of the truck with Boone\'s jacket around his shoulders, staring at the rain like he has never seen it before.' : 'Boone rides in silence, holding a pair of BSDF dog tags.',
      ],
      choices: [{ text: 'Back to the Bellows.', to: 'bellows_return' }],
    },

    bellows_return: {
      title: 'The Bellows',
      onEnter: (a) => {
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 12);
        a.note('[MED] Back at base. +12 HP to the squad.', 'ok');
      },
      text: (a) => [
        'The Bellows has never been this full. Hollow families run from cot to cot, searching faces. Some of them find who they are looking for. The sound people make when that happens is something you will never forget.',
        'Dara reads the transfer order for Lena and Mira three times. Then she folds it very small and puts it in her pocket. "The Orchard," she says. "Then that\'s where we\'re going next."',
        a.has('reyesSaved') ? 'Boone sits with Reyes by the stove. He is asleep with his head on her shoulder, and she won\'t let anyone move him.' : 'Boone hangs Danny\'s dog tags on the wall of photos, under the empty circles. She stands there for a long time.',
        'Cross spreads the clinic files across the table. "This is enough to bring down NorthStar. If we can get it to anyone who would actually listen."',
      ],
      choices: [{ text: 'Find Uncle Brace.', to: 'chapter3_end' }],
    },

    chapter3_end: {
      title: 'A Phone Call',
      onEnter: (a) => { a.charge(1); a.flag('chapter3Done'); },
      text: (a) => [
        'You find Brace outside the pump station, under the dripping pipes, holding a cheap Sink phone to his ear. He hangs up when he sees you, looking guilty and happy at the same time.',
        '"I called Selene," he says. "I know. I know. But she was out of her mind with worry, Jaz. I didn\'t tell her where we are. Just that I\'m safe. That I\'m with you."',
        a.has('knowsWidowMark')
          ? 'You think of the spider-web pendant. You think of the glyph in Knox\'s slate. Brace sees your face change. "What?" he says. "What is it?"'
          : 'Somewhere behind you, Knox is staring at his rebuilt comms rig. "Uh, Sergeant Major? That phone just pinged something it shouldn\'t have."',
        'The Starstone pulses warm against your ribs. It has recovered a charge.',
        '<b>CHAPTER 3 COMPLETE.</b>',
      ],
      choices: [{ text: 'Continue to Chapter 4.', to: 'ch4' }],
    },

    ch4: {
      title: 'Chapter 4',
      text: [
        '<b>CHAPTER 4 // THE INCISION</b>',
        'For two days, nothing happens. The freed prisoners sleep. The Hollow cooks. Raines builds a dartboard out of a manhole cover.',
        'On the third evening, someone knocks on the door of the Bellows.',
      ],
      choices: [{ text: 'Answer it.', to: 'selene_arrives' }],
    },

    selene_arrives: {
      title: 'A Visitor',
      checkpoint: true,
      text: (a) => [
        'Rat stands in the doorway, looking embarrassed. Beside him is a woman in a long gray raincoat, soaked through, with dark hair pinned up and kind, tired eyes. A thin silver chain disappears under her collar.',
        '"She was asking every stall in the Sink for Brace Banister," Rat says. "Cried at the noodle stand. I figured... family, right?"',
        'Brace pushes past you. "Selene!" He wraps her up in his arms, laughing, and she holds onto him like she\'s drowning.',
        'Over his shoulder, she meets your eyes. "You must be Jaz," she says warmly. "He talks about you constantly. Thank you for keeping him safe."',
        a.has('knowsWidowMark') ? 'You look at the silver chain. You think of a spider-web glyph glowing on Knox\'s slate.' : 'Dara is watching from across the room with her arms folded.',
      ],
      choices: [
        { text: 'Welcome her inside.', effects: (a) => { a.flag('welcomedSelene'); }, to: 'selene_dinner' },
        { text: 'Have Cross search her. Quietly.', check: { who: 'cross', stat: 'agi', dc: 14, success: 'selene_caught', fail: 'selene_search_fail' } },
        { text: '"Mrs. Banister. May I see your necklace?"', if: (a) => a.has('knowsWidowMark'), to: 'selene_pendant' },
      ],
    },

    selene_search_fail: {
      title: 'A Visitor',
      onEnter: (a) => { a.flag('braceHurt'); a.trust('cross', -1); },
      text: [
        'Cross takes Selene\'s coat with a polite smile and runs her hands along the lining. Selene notices. Of course she notices.',
        '"Are you searching me?" she says, very quietly, with tears in her eyes. "I walked through the Sink alone to find my husband."',
        'Brace turns on you. "Jaz. She\'s my wife. What is <i>wrong</i> with you?"',
        'Cross hands back the coat. "Clean," she mutters. But she doesn\'t look like she believes it.',
      ],
      choices: [{ text: 'Apologize. Let her in.', to: 'selene_dinner' }],
    },

    selene_pendant: {
      title: 'A Visitor',
      onEnter: (a) => a.flag('caughtEarly'),
      text: [
        'Selene\'s hand goes to her throat. For half a second, nothing moves on her face at all. It\'s like watching a mask slip.',
        'Then she smiles, and draws out the pendant. A silver web, with a single drop at the center.',
        '"Oh, Jaz," she says. "You really are the clever one in the family."',
      ],
      choices: [{ text: 'Draw your weapon.', to: 'widow_reveal' }],
    },

    selene_caught: {
      title: 'A Visitor',
      onEnter: (a) => { a.flag('caughtEarly'); a.trust('cross', 1); },
      text: [
        'Cross takes Selene\'s coat with a polite smile. Her fingers find a seam that is too thick. She tears it open. Inside is a row of slim glass injectors, and a blade no longer than a finger.',
        'Cross holds them up. "Funny thing to bring to a family reunion."',
        'Selene sighs, and the warmth drains out of her face like water down a drain.',
      ],
      choices: [{ text: 'Draw your weapon.', to: 'widow_reveal' }],
    },

    widow_reveal: {
      title: 'Widow Saint',
      onEnter: (a) => { a.flag('widowRevealed'); a.damage('cross', 6); a.damage('knox', 4); },
      text: [
        'Brace is staring at her. "Selene? What is this?"',
        '"Twelve years, darling," she says gently. "You never once asked what I did on my business trips."',
        'She moves. A flick of her wrist and Knox drops, an injector in his neck. Cross lunges and takes a blade across the forearm. Selene catches Brace by the collar, presses a needle to his throat, and every gun in the room freezes.',
        '"Widow Saint," Cross spits, clutching her arm.',
        '"Only to my friends." Selene backs toward the door, Brace stumbling with her, his face gray with shock. "Commander Veyr wants the stone, Jaz. Bring it to the Orchard and you can have your uncle back. Mostly intact."',
        'The lights die. Smoke fills the room. When it clears, they are gone.',
      ],
      choices: [{ text: '"Knox! Boone, check Knox!"', to: 'aftermath' }],
    },

    selene_dinner: {
      title: 'Dinner',
      text: [
        'That night the Hollow make a real dinner. Selene helps. She remembers every name. She laughs at Raines\'s jokes and tells stories about Brace burning toast.',
        'But you notice something. During the evening, she finds a quiet moment with almost every member of your squad. A hand on a shoulder. A few soft words. Then she moves on.',
        'Vale goes quiet after she talks to him. Cross keeps glancing at Brace. Knox stops eating.',
        'You can only get to one of them before lights out.',
      ],
      choices: [
        { text: 'Check on Cross.', effects: (a) => { a.flag('checkedCross'); a.trust('cross', 1); a.trust('vale', -1); a.trust('knox', -1); }, to: 'talk_cross' },
        { text: 'Check on Vale.', effects: (a) => { a.flag('checkedVale'); a.trust('vale', 1); a.trust('cross', -1); a.trust('knox', -1); }, to: 'talk_vale' },
        { text: 'Check on Knox.', effects: (a) => { a.flag('checkedKnox'); a.trust('knox', 1); a.trust('cross', -1); a.trust('vale', -1); }, to: 'talk_knox' },
      ],
    },

    talk_cross: {
      title: 'Lights Out',
      text: [
        'Cross is cleaning her rifle with too much force. "Selene told me something," she says without looking up. "She said Brace knew about the Ward the whole time. That he chose not to go down there."',
        '"She said it like she was sad about it. Like she was confiding in me." Cross finally looks up. "Why would a loving wife tell a stranger that about her husband?"',
        'You don\'t have an answer. Neither does she. But she trusts you a little more for listening.',
      ],
      choices: [{ text: 'Get some sleep.', to: 'the_incision' }],
    },

    talk_vale: {
      title: 'Lights Out',
      text: [
        'Vale is on the roof of the pump station, in the rain. "Selene asked me how many times you\'ve used the stone on us," he says. "Then she said Veyr used to promise his soldiers they\'d be made stronger, too."',
        '"She said it\'s always the same. First it\'s for the mission. Then it\'s for the people you love. Then you can\'t stop."',
        'He looks at you for a long moment. "Prove her wrong, Sergeant Major." You promise him you will.',
      ],
      choices: [{ text: 'Get some sleep.', to: 'the_incision' }],
    },

    talk_knox: {
      title: 'Lights Out',
      text: [
        'Knox is hunched over his comms rig, pale. "Selene said that when this is over, BSDF is going to need someone to blame for the leak. She said it so nicely. She said she\'d hate for it to be me."',
        '"How does she even know about the leak, Sergeant Major? I never told her. Nobody told her."',
        'You both sit there with that for a long, cold minute.',
      ],
      choices: [{ text: 'Wake the others. Something is wrong.', effects: (a) => a.flag('knoxWarned'), to: 'the_incision' }],
    },

    the_incision: {
      title: 'The Incision',
      onEnter: (a) => { a.flag('widowRevealed'); if (!a.has('knoxWarned')) { a.damage('raines', 5); a.damage('boone', 5); } },
      text: (a) => [
        a.has('knoxWarned')
          ? 'You are pulling on your boots when you hear it. A soft click from the far end of the pump station. You are running before the second click.'
          : '0200. You wake to Knox\'s comms rig shrieking. The air smells sweet and chemical. Raines and Boone are groggy, barely able to stand. Someone gassed the room.',
        'Brace\'s cot is empty. So is Selene\'s.',
        'Ollie, the Hollow medic, is slumped by the door with an injector in his neck. Alive. Barely.',
        'On the wall, above the photos of the missing, someone has painted a spider web in fresh black ink. In the center, neat handwriting: <i>"Thank you for keeping him safe, Sergeant Major. Bring the stone to the Orchard and you may have him back. Mostly intact. W.S."</i>',
        a.has('knoxWarned') ? 'At the far exit, you catch one glimpse of a gray raincoat, and Brace stumbling beside it, before the smoke grenade goes off.' : 'Brace\'s wedding ring is lying on his pillow.',
      ],
      choices: [{ text: 'Get everyone up.', to: 'aftermath' }],
    },

    aftermath: {
      title: 'The Incision',
      checkpoint: true,
      text: (a) => [
        'The squad stands in the wreck of the Bellows, and for the first time since Lowtown, they are not standing together.',
        '"Family isn\'t a tactic, Sergeant Major," Cross says. Her voice is shaking. "I said it. I said something was wrong with him from the start."',
        '"Brace didn\'t know," Boone snaps. "You saw his face."',
        '"Doesn\'t matter what he knew," Vale says. "Now Veyr wants the stone, and the only person who can use it is standing right here. Funny how that works out."',
        a.has('knoxWarned') ? 'Knox is the only one who isn\'t shouting. He is looking at you, waiting.' : 'Knox is staring at the floor. "She was in my slate," he says. "She was in my slate for weeks."',
        'They are coming apart. This is exactly what Widow Saint wanted.',
      ],
      choices: [
        { text: '"Cross is right. I let family cloud my judgment. That ends now."', effects: (a) => { a.trust('cross', 2); a.trust('vale', 1); a.flag('ownedIt'); }, to: 'howl' },
        { text: '"Enough! We get him back. That\'s an order."', effects: (a) => { a.trust('raines', 1); a.trust('cross', -1); a.trust('vale', -1); a.flag('ordered'); }, to: 'howl' },
        { text: 'Reach for the Starstone. Make them steady.', if: (a) => a.state.charges > 0, effects: (a) => { a.state.charges -= 1; a.state.strain += 1; a.trust('vale', -2); a.flag('forcedCalm'); a.note('[STARSTONE] You push calm into all of them at once. It works. They go quiet. Too quiet.', 'star'); }, to: 'howl' },
      ],
    },

    howl: {
      title: 'The Hound',
      text: (a) => [
        a.has('ownedIt') ? 'The room goes still. Cross nods once, sharply. Vale lets out a breath. It\'s not fixed. But it holds.' : (a.has('forcedCalm') ? 'Vale looks at you with something close to horror. "Did you just do that to us?" Nobody else says anything at all.' : 'The arguing stops. Not because anyone agrees. Because you\'re the Sergeant Major.'),
        'And then, from the Sink outside, a long, rising howl. Screams in the market. Gunfire.',
        'Dara bursts in. "There\'s something in the Sink. It\'s tearing through the stalls. It\'s coming here."',
        'Of course. Selene didn\'t just find the Bellows for herself. She left the door open for her dog.',
        'Hound Zero has followed the scent of the Starstone right to your base. Forty freed prisoners are sleeping behind you. There is nowhere left to run.',
        'This time, you finish it.',
      ],
      choices: [{ text: 'Prepare the Bellows.', to: 'hound_prep' }],
    },

    hound_prep: {
      title: 'Prepare',
      checkpoint: true,
      text: (a) => [
        'You have maybe two minutes. Every advantage counts.',
        a.has('reyesSaved') ? 'Reyes steps up beside Boone. "I know how they made him," he says. "I know where it hurts. Let me help."' : '',
        a.has('hollowAllies') ? 'Dara\'s Hollow runners are already dragging scrap metal into a barricade.' : '',
      ].filter(Boolean),
      choices: [
        { text: 'Knox rigs a sonic trap to overload his senses.', if: (a) => !a.has('prepSonic') && !a.has('prepTried'), check: { who: 'knox', stat: 'tech', dc: 13, success: 'prep_sonic', fail: 'prep_fail' } },
        { text: 'Vale sets up in the pipes with flares.', if: (a) => !a.has('prepFlare') && !a.has('prepTried'), effects: (a) => { a.flag('prepFlare'); a.flag('prepTried'); a.note('Vale climbs into the pipes with every flare the Hollow own. "He\'ll remember me."'); }, to: 'hound_ready' },
        { text: 'Reyes shows Boone where the Hound\'s implants are.', if: (a) => a.has('reyesSaved') && !a.has('prepTried'), effects: (a) => { a.flag('prepReyes'); a.flag('prepTried'); a.trust('boone', 1); a.note('Reyes draws on Boone\'s arm with a marker: three points along the spine. "Hit there. The pumps that keep him running."'); }, to: 'hound_ready' },
        { text: 'No time. Get everyone in position.', to: 'hound_ready' },
      ],
    },

    prep_sonic: {
      title: 'Prepare',
      onEnter: (a) => { a.flag('prepSonic'); a.flag('prepTried'); a.trust('knox', 1); },
      text: ['Knox wires six Hollow speakers into a car battery. "One shriek at the right frequency. For a nose like his, it\'s going to feel like his whole skull is ringing."'],
      choices: [{ text: 'Positions.', to: 'hound_ready' }],
    },

    prep_fail: {
      title: 'Prepare',
      onEnter: (a) => a.flag('prepTried'),
      text: ['The battery sparks and dies. Knox throws a wrench across the room. "No time. I\'m sorry. No time."'],
      choices: [{ text: 'Positions.', to: 'hound_ready' }],
    },

    hound_ready: {
      title: 'The Hound',
      text: (a) => [
        'The door of the Bellows comes off its hinges.',
        'Hound Zero stands in the doorway, drenched and bleeding from a dozen Sink knives, grinning wider than a face should. "Starlight," he breathes. "You smell like home."',
        a.has('prepSonic') ? 'Knox slams the switch. The speakers shriek. Hound Zero screams and drops to one knee, clawing at his ears.' : '',
        a.has('prepFlare') ? 'A flare arcs out of the pipes and bursts white in his face. "Remember me?" Vale shouts.' : '',
        a.has('prepReyes') ? 'Boone checks the marker lines on her arm and raises her rifle. "Three points. I see them."' : '',
      ].filter(Boolean),
      choices: [{ text: 'Open fire.', to: 'hound_boss' }],
    },

    hound_boss: {
      title: 'Hound Zero',
      text: ['No more running.'],
      combat: (a) => {
        let hp = 44;
        let def = 14;
        if (a.has('prepSonic')) { hp -= 8; def -= 1; }
        if (a.has('prepFlare')) def -= 2;
        if (a.has('prepReyes')) hp -= 10;
        return {
          enemies: [{ name: 'Hound Zero', hp, def, atk: 4, dmg: 9 }],
          win: 'hound_dead',
          lose: 'gameover',
          opening: a.has('prepSonic') || a.has('prepFlare') ? 2 : 0,
        };
      },
    },

    hound_dead: {
      title: 'Hound Zero',
      onEnter: (a) => a.flag('houndDead'),
      text: [
        'Hound Zero goes down in the middle of the Bellows, among the overturned cots, and this time he doesn\'t get back up.',
        'The black drains slowly from his veins. Without it, he is just a thin, tired man, much younger than you thought.',
        'He looks up at you. The grin is gone. "Smells... like rain," he whispers. "I forgot. What rain smells like."',
        '"My name was Tobias," he says. "Before. Tell the doctor. Tell him... I remember my name."',
        'Then he is still.',
        'Boone kneels and closes his eyes. Nobody cheers.',
      ],
      choices: [{ text: 'Search the body.', to: 'chapter4_end' }],
    },

    chapter4_end: {
      title: 'Coordinates',
      onEnter: (a) => { a.charge(1); a.flag('chapter4Done'); a.addItem('tracker'); },
      text: (a) => [
        'Sewn under the skin of Tobias\'s wrist is a NorthStar tracker. Knox pries it out and plugs it into his rig. "It\'s been calling home. Two-way. If it calls home, it knows where home is."',
        'A map flickers up. Coordinates in the hills north of the city. A NorthStar agricultural research site. Its name on the old registry: <b>THE ORCHARD</b>.',
        'Dara looks at the screen for a long time. "Lena and Mira," she says. "And your uncle."',
        '"And Veyr," Cross says.',
        a.has('forcedCalm') ? 'Vale keeps his distance from you. He hasn\'t spoken since the Hound.' : 'Vale checks his rifle and says nothing, but he stands beside you.',
        'The Starstone pulses warm against your ribs. It has recovered a charge. Somewhere north of here, the man who built all of this is waiting for it.',
        '<b>CHAPTER 4 COMPLETE.</b>',
      ],
      choices: [{ text: 'Continue to Chapter 5.', to: 'ch5' }],
    },

    ch5: {
      title: 'Chapter 5',
      text: [
        '<b>CHAPTER 5 // THE ARCHITECT</b>',
        'North of the city, the hills are green again. After the war, farms came back there first.',
        'One of them grows apples. And something else.',
      ],
      choices: [{ text: 'Begin.', to: 'orchard_plan' }],
    },

    orchard_plan: {
      title: 'The Bellows',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 14);
        a.note('[MED] A day of rest at the Bellows. +14 HP to the squad.', 'ok');
      },
      text: (a) => [
        'Knox projects the tracker data onto the pump station wall. An apple farm in the northern hills: rows of trees, a farmhouse, three big barns. Pretty. Peaceful.',
        '"Thermal says the farm is just a lid," Knox says. "Under the barns there\'s something big. Six levels down. Power draw like a small city."',
        a.has('leftPilot')
          ? 'Ollie wheels out a stolen NorthStar produce truck. "Your way in," he says. "They get deliveries every morning."'
          : 'Then a hoarse voice from the corner: "If you\'ve got something with wings, I can fly it." Flight Lt. Wren Hollis is sitting up on her cot, pale and bandaged and grinning. "Somebody owes me a drink."',
        'Dara straps on a pistol. "I\'m coming. Lena and Mira are down there. Don\'t argue."',
      ],
      choices: [
        { text: 'Hollis flies a stolen NorthStar transport straight in.', if: (a) => !a.has('leftPilot'), effects: (a) => a.flag('flyIn'), to: 'night_before' },
        { text: 'Ride in on the morning produce truck.', effects: (a) => a.flag('truckIn'), to: 'night_before' },
        { text: 'Hike over the hills by night and come in the back way.', effects: (a) => a.flag('hikeIn'), to: 'night_before' },
      ],
    },

    night_before: {
      title: 'The Night Before',
      text: [
        'Nobody sleeps much. You find Vale and Raines up on the pump station roof, sharing one cigarette between them in the rain.',
        'Raines nods at you. "Sergeant Major. Couldn\'t sleep either?"',
        'It\'s the kind of night when people say things they normally wouldn\'t.',
      ],
      choices: [
        { text: '"Raines. Why do you do this? Really."', if: (a) => !a.has('heardRaines'), to: 'raines_story' },
        { text: '"Vale. What are you thinking about?"', if: (a) => !a.has('heardVale'), to: 'vale_story' },
        { text: 'Let them be. Get some rest.', to: 'orchard_arrive' },
      ],
    },

    raines_story: {
      title: 'The Night Before',
      onEnter: (a) => { a.flag('heardRaines'); a.trust('raines', 1); },
      text: [
        'Raines is quiet for a long time, which isn\'t like him.',
        '"I had a little brother. Marcus. Lowtown, right after the war. No food, no power, gangs on every corner. I was the big one, so I was the one who stood in front of him."',
        '"One night I went out for bread, and I was gone too long." He flicks ash into the rain. "When I got back, there was nobody standing in front of him."',
        '"So now I stand in front of everybody. That\'s it. That\'s the whole reason. Every door I kick in, somebody\'s behind me who doesn\'t get hurt." He grins, but it doesn\'t reach his eyes. "Plus, I really like kicking doors."',
      ],
      choices: [{ text: 'Stay a little longer.', to: 'night_before' }],
    },

    vale_story: {
      title: 'The Night Before',
      onEnter: (a) => { a.flag('heardVale'); a.trust('vale', 1); },
      text: [
        '"Ridgeback," Vale says. "Last year of the war. You know it?"',
        'Everyone knows it. Two hundred Blue Star soldiers dug into a ridge, waiting for relief that never came. The enemy knew exactly where every trench was. Nobody survived.',
        '"My big brother was there. Elias. He taught me to shoot. Somebody sold the position. An officer. For money. Nobody ever found out who." He stares out at the city lights. "That\'s why I don\'t fire until I\'m sure. Somebody has to be the one who\'s sure."',
        'You don\'t tell him that your father died at Ridgeback too. You have never told anyone that. Somehow, tonight, it feels like you should have.',
      ],
      choices: [{ text: 'Stay a little longer.', to: 'night_before' }],
    },

    orchard_arrive: {
      title: 'The Orchard',
      checkpoint: true,
      text: (a) => [
        a.has('flyIn')
          ? 'Hollis brings the stolen transport in low over the hills at dawn, chatting with the Orchard\'s air control in a perfect bored NorthStar voice. "Delivery for barn three. Yes, again. No, I don\'t know why either."'
          : (a.has('truckIn')
            ? 'You ride in among crates of fertilizer in the back of the produce truck. Dara drives, wearing a blue star armband and a fixed smile.'
            : 'You come over the last hill in the gray hour before dawn, soaked and freezing, and look down at the Orchard from above.'),
        'It looks like a postcard. Rows and rows of apple trees, heavy with fruit. A white farmhouse with a porch swing. Three red barns. Workers in blue armbands with baskets on their arms.',
        'And scarecrows. Too many scarecrows. Each one has a camera where the face should be.',
        'Knox points at the biggest barn. "That\'s the lid. The lift down is inside."',
      ],
      choices: [
        { text: 'Slip through the trees to the barn.', check: { who: 'cross', stat: 'agi', dc: 13, success: 'barn', fail: 'orchard_spotted' } },
        { text: 'Walk straight up like you belong here.', check: { who: 'jaz', stat: 'will', dc: 13, success: 'barn', fail: 'orchard_spotted' } },
      ],
    },

    orchard_spotted: {
      title: 'The Orchard',
      text: [
        'A scarecrow turns its head. Its camera lens whirs and focuses on you.',
        'Across the orchard, the workers drop their baskets. Under the aprons are rifles.',
      ],
      choices: [{ text: 'Fight to the barn.', to: 'orchard_fight' }],
    },

    orchard_fight: {
      title: 'Among the Trees',
      text: ['Apples explode in the branches as rounds tear through the orchard.'],
      combat: () => ({
        enemies: [
          { name: 'Orchard Guard', hp: 12, def: 12, atk: 2, dmg: 6 },
          { name: 'Orchard Guard', hp: 12, def: 12, atk: 2, dmg: 6 },
          { name: 'Fang Enforcer', hp: 14, def: 13, atk: 3, dmg: 8 },
        ],
        win: 'barn',
        lose: 'gameover',
      }),
    },

    barn: {
      title: 'Barn Three',
      text: [
        'Inside the barn: hay bales, tractors, and a steel freight lift big enough for a truck, hidden behind a false wall of crates.',
        'The lift has a keypad. Above it, a chalkboard with the morning duties: <i>"Lift code = trees per row × number of rows. Updated every harvest. — Management"</i>',
        'Cross remembers the view from outside. "Twelve rows," she says. "I counted them coming in."',
        'Knox squints out the barn door with his scope. "And... sixteen trees in a row."',
      ],
      puzzle: {
        prompt: 'ENTER LIFT CODE',
        answer: ['192'],
        hint: 'Knox: "Twelve times sixteen. Come on, Sergeant Major. Ten sixteens is a hundred sixty, plus two more sixteens..."',
        success: 'descent',
      },
    },

    descent: {
      title: 'Going Down',
      text: [
        'The lift drops six levels. The air gets colder and cleaner. The farm smell disappears, replaced by antiseptic and ozone.',
        'The doors open on a corridor of white tile and glass. Everything hums. Through the windows you see labs, operating rooms, and rows of cells exactly like the Ward. Only bigger. Much bigger.',
        'Dara is already running down the row, reading names on the doors.',
      ],
      choices: [{ text: 'Follow her.', to: 'vault_cells' }],
    },

    vault_cells: {
      title: 'The Vault',
      text: [
        'Dara stops at a door near the end and makes a sound you\'ve never heard a person make.',
        'Inside, a woman and a little girl sit on a cot together. The woman has Dara\'s eyes. The girl is holding a crayon.',
        '"Lena," Dara says. "Mira."',
        'Knox gets the door open. Dara and her sister collide, both crying. Mira hangs back, frightened of the soldiers and the guns.',
        'Raines kneels down slowly until he is her height and holds out his big scarred hand. "Hey, Mira. I\'m Malik. I saw your drawing. That star was really good."',
        'Mira looks at him for a long moment. Then she takes his hand.',
      ],
      choices: [{ text: 'Get them moving.', effects: (a) => { a.flag('quillsSaved'); a.trust('raines', 1); }, to: 'vault_guards' }],
    },

    vault_guards: {
      title: 'The Vault',
      checkpoint: true,
      text: (a) => [
        'Alarms. Red light floods the corridor. Doors slam open at both ends, and Orchard security in black armor comes pouring in.',
        a.has('heardRaines')
          ? 'Raines puts Mira behind him without even thinking about it. "Stay behind me, kid. That\'s my whole job." You remember Marcus, and you understand.'
          : 'Raines puts Mira behind him without a word, and plants his feet.',
      ],
      choices: [{ text: 'Hold the corridor.', to: 'vault_fight' }],
    },

    vault_fight: {
      title: 'The Corridor',
      text: ['White tile. Red light. Nowhere to hide.'],
      combat: (a) => ({
        enemies: [
          { name: 'Vault Security', hp: 13, def: 13, atk: 2, dmg: 7 },
          { name: 'Vault Security', hp: 13, def: 13, atk: 2, dmg: 7 },
        ],
        win: 'veyr_appears',
        lose: 'gameover',
        opening: a.has('heardRaines') ? 2 : 0,
      }),
    },

    veyr_appears: {
      title: 'The Architect',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of ['jaz', 'raines', 'cross', 'vale', 'boone', 'knox']) a.heal(id, 6);
        a.note('[MED] Boone patches the worst of it. +6 HP to the squad.', 'ok');
      },
      text: [
        'The last guard falls. Every screen in the corridor flickers to life at once.',
        'A man looks out of them. Sixties, silver-haired, in an old BSDF dress uniform covered in medals. He has a soft, reasonable voice, like a teacher.',
        '"Sergeant Major Stone. I\'m Commander Aurelian Veyr. Welcome to the Orchard."',
        'Above the corridor, behind thick glass, a steel catwalk. Veyr is standing on it in person. Beside him: Selene, in black, with a knife at Brace\'s throat. Brace looks gray and exhausted, but alive.',
        '"Uncle Brace!"',
        '"Jaz, don\'t," Brace croaks. "Don\'t give him anything."',
        'Veyr smiles. "Your father was at Ridgeback, wasn\'t he? A good soldier. I remember the name from the list." He touches one of the medals on his chest. "I sold that ridge for enough money to build all of this. War is a business, Sergeant Major. I was simply early."',
        'Vale goes absolutely still.',
      ],
      choices: [{ text: 'Look at Vale.', to: 'vale_choice' }],
    },

    vale_choice: {
      title: 'Judgment',
      text: (a) => [
        'Vale has his rifle up. His eye is on the scope. The crosshairs are on Veyr\'s forehead, through the glass.',
        '"Elias," he whispers. "That\'s him. That\'s the one who sold Ridgeback."',
        'Veyr spreads his hands. "Go on, son. That glass is rated for anti-armor rounds. But by all means. And if you miss, Selene opens the doctor\'s throat."',
        'Vale\'s finger is on the trigger. He is waiting for you. He has always waited for you.',
      ],
      choices: [
        { text: '"Vale. Hold your fire. Not like this."', if: (a) => a.member('vale').trust >= 3, effects: (a) => { a.flag('valeHeld'); a.trust('vale', 1); }, to: 'vale_holds' },
        { text: '"Vale. Hold your fire. Not like this."', if: (a) => a.member('vale').trust < 3, to: 'vale_shoots' },
        { text: '"Take the shot."', effects: (a) => a.flag('orderedShot'), to: 'vale_shoots' },
      ],
    },

    vale_holds: {
      title: 'Judgment',
      text: [
        'For three long seconds Vale doesn\'t move. Then he lowers the rifle a single inch.',
        '"Somebody has to be the one who\'s sure," he says quietly. "I\'m not sure yet. But I\'m sure about you."',
        'Veyr looks almost disappointed. "Discipline. How old-fashioned."',
        'Selene laughs softly, then hands Brace off to two guards and steps through a door onto the corridor level. "My turn, then."',
      ],
      choices: [{ text: 'Face Widow Saint.', to: 'widow_fight' }],
    },

    vale_shoots: {
      title: 'Judgment',
      onEnter: (a) => { a.flag('valeShot'); a.damage('vale', 4); },
      text: (a) => [
        a.has('orderedShot') ? '' : 'He doesn\'t hold. Not this time. Not for this.',
        'The shot is deafening in the tiled corridor. The glass stars and cracks, but holds. Veyr doesn\'t even flinch.',
        'Selene\'s knife moves. Brace cries out. A line of red opens along his collarbone, shallow, deliberate. A warning.',
        '"That one was free," Selene says. She hands Brace to two guards and steps through a door onto the corridor level, spinning a blade. "The next one isn\'t."',
        'The ricochet caught Vale across the cheek. He doesn\'t seem to notice.',
      ].filter(Boolean),
      choices: [{ text: 'Face Widow Saint.', to: 'widow_fight' }],
    },

    widow_fight: {
      title: 'Widow Saint',
      text: ['She moves like smoke and cuts like glass.'],
      combat: (a) => ({
        enemies: [{ name: 'Widow Saint', hp: 30, def: 15, atk: 4, dmg: 8 }],
        win: 'widow_escapes',
        lose: 'gameover',
        opening: a.has('caughtEarly') ? 2 : 0,
      }),
    },

    widow_escapes: {
      title: 'Widow Saint',
      onEnter: (a) => a.flag('widowWounded'),
      text: [
        'A round finally clips her. Selene staggers back against the wall, clutching her side, and for the first time she isn\'t smiling.',
        '"Good," she breathes. "You\'ve gotten better. That will make the next time so much more fun."',
        'She snaps something on her wrist. The corridor floods with white smoke. When it clears, a maintenance hatch is swinging shut, and Widow Saint is gone.',
        'On the catwalk above, Veyr is still there. He applauds slowly.',
      ],
      choices: [{ text: '"Veyr!"', to: 'veyr_offer' }],
    },

    veyr_offer: {
      title: 'The Architect',
      text: (a) => [
        '"Let me show you what this is all for," Veyr says.',
        'Behind him, a wall of glass lights up. Beyond it, a vast chamber drops away into darkness. In the middle stands a machine like a cathedral of steel ribs and cables, with an empty cradle at its heart, exactly the size of a fist.',
        '"The Lattice," Veyr says. "Every prisoner in NorthStar\'s care was a test. To find out how the stone rewrites a person. Now I know. Put the stone in the cradle, and the Lattice draws its power into one host. Me."',
        '"No more selling ridges, Sergeant Major. No more paymasters. I won\'t need to buy power. I will <i>be</i> it."',
        'He leans toward the glass. "Or. You can be. The stone already answers to you. Imagine what you could make of your squad. Of Blue Star. Your father would have been proud."',
        a.state.strain >= 3 ? 'Something in you wants to say yes. The Starstone hums against your ribs, and for one terrible second, you can see it: an army, perfect and unbreakable, every thread rewritten.' : 'You feel the stone hum, and you feel nothing but cold.',
        '"Bring the stone to the Core. The lowest level. Come alone, by dawn tomorrow," Veyr says. "Or your uncle is the Lattice\'s first live test."',
        'The catwalk lights go out. Veyr and Brace are gone.',
      ],
      choices: [{ text: 'Get the prisoners out.', to: 'orchard_out' }],
    },

    orchard_out: {
      title: 'Daylight',
      onEnter: (a) => { a.charge(1); a.flag('chapter5Done'); },
      text: (a) => [
        a.has('flyIn')
          ? 'Hollis flies three loads of prisoners out of the Orchard in the stolen transport, cursing NorthStar air control the whole way.'
          : 'You load the prisoners into every truck and tractor on the farm and drive them out through the apple trees in a long, slow convoy.',
        'Mira falls asleep on Raines\'s shoulder. He doesn\'t move for the whole ride. Dara and Lena hold hands and don\'t let go.',
        a.has('valeHeld') ? 'Vale sits beside you. After a while he says, "Ridgeback. Your father was there too, wasn\'t he?" You nod. He nods back. Nothing else needs saying.' : 'Vale sits alone, staring at his rifle. "I should have had him," he says to nobody. "I should have had him."',
        'You have until dawn tomorrow. Veyr wants you to come alone.',
        'Your squad is watching you, waiting to see what you\'ll decide.',
        'The Starstone pulses warm against your ribs. It has recovered a charge.',
        '<b>CHAPTER 5 COMPLETE.</b>',
      ],
      choices: [{ text: 'Continue to Chapter 6.', to: 'ch6' }],
    },

    ch6: {
      title: 'Chapter 6',
      text: [
        '<b>CHAPTER 6 // FALLEN STAR</b>',
        'Four hours until dawn.',
        'Everything you have done since Lowtown comes down to the next four hours.',
      ],
      choices: [{ text: 'Begin.', to: 'dawn_choice' }],
    },

    dawn_choice: {
      title: 'Before Dawn',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of SQUAD_IDS.concat('jaz')) a.heal(id, 30);
        a.note('[MED] The squad rests and rearms. Everyone is back on their feet.', 'ok');
      },
      text: (a) => [
        'The convoy has stopped in a dead orchard a mile from the farm. The freed prisoners are on their way to the Bellows. Your squad is not.',
        'They are standing in a half-circle, waiting for you.',
        `Squad trust: ${trustWord(a)}. ${a.state.strain >= 3 ? 'The Starstone has not stopped humming since the Orchard. You can hear it in your teeth.' : 'The Starstone is quiet against your ribs.'}`,
        '"Veyr said alone," Knox says. "So obviously we\'re all going. Right? Please say right."',
      ],
      choices: [
        { text: '"We go together. That\'s how we\'ve done everything."', effects: (a) => { a.flag('together'); for (const id of SQUAD_IDS) a.trust(id, 1); }, to: 'core_descent' },
        { text: '"He said alone. I go alone. That\'s an order."', effects: (a) => a.flag('alone'), to: 'alone_order' },
      ],
    },

    alone_order: {
      title: 'Before Dawn',
      text: (a) => [
        avgTrust(a) >= 3
          ? 'Raines laughs out loud. "With respect, Sergeant Major? No." Cross is already checking her rifle. Boone is packing bandages. "You can court-martial us after," Vale says. Nobody waits for your answer.'
          : 'Nobody argues. That is worse than if they had. They stand there and watch you walk into the trees alone.',
      ],
      choices: [
        { text: 'Head for the Orchard.', if: (a) => avgTrust(a) >= 3, effects: (a) => a.flag('together'), to: 'core_descent' },
        { text: 'Head for the Orchard.', if: (a) => avgTrust(a) < 3, to: 'alone_walk' },
      ],
    },

    alone_walk: {
      title: 'Alone',
      onEnter: (a) => a.damage('jaz', 6),
      text: [
        'You go down the lift alone. Two Fang guards meet you at the bottom. They don\'t expect you to fight. You do anyway, and it costs you.',
        'Then footsteps on the lift ladder behind you. Raines drops down first, then the rest. "Took us a while to decide," he says. "We decided."',
        'It isn\'t the same as if they had come with you from the start. But they came.',
      ],
      choices: [{ text: 'Go deeper.', to: 'core_descent' }],
    },

    core_descent: {
      title: 'The Core',
      checkpoint: true,
      text: (a) => [
        'The lift takes you past the six levels you saw yesterday, and keeps going. Seven. Eight. Nine. The walls change from white tile to bare black rock.',
        'At the bottom is a long steel bridge over a chasm. At the far end, a blast door. Beyond it, you can feel the Lattice humming, like a second heartbeat.',
        'Halfway across the bridge, someone is waiting.',
        a.member('knox').trust >= 3
          ? 'Knox touches your arm. "Fang chatter on the local band. They\'ve got a squad waiting behind that door to hit us in the back. I can lock it." His fingers fly. "Done. They\'re not coming out."'
          : 'Knox is staring at his rig, uncertain. Something is moving on the local band, but he doesn\'t say anything. Maybe he doesn\'t think you\'d listen.',
      ],
      choices: [{ text: 'Walk out onto the bridge.', effects: (a) => { if (a.member('knox').trust >= 3) a.flag('ambushStopped'); }, to: 'widow_final' }],
    },

    widow_final: {
      title: 'Widow Saint',
      text: (a) => [
        'Selene is sitting on the bridge rail with her legs crossed, a bandage across her side, two blades in her lap.',
        '"Jaz," she says pleasantly. "Brace is still alive, if you\'re wondering. He cried for you last night. It was sweet."',
        a.has('reyesSaved') ? '"Your medic\'s pet is still walking around, I hear. Veyr was very cross about that."' : '',
        '"I don\'t care about Veyr, you know. I don\'t care about the stone. I care about being the best at what I do." She stands. "And you\'re the only thing left on Blue Star I haven\'t beaten."',
      ].filter(Boolean),
      choices: [{ text: 'End this.', to: 'widow_last_fight' }],
    },

    widow_last_fight: {
      title: 'Widow Saint',
      text: ['The bridge sways over the dark. She dances on the rail like it\'s solid ground.'],
      combat: (a) => ({
        enemies: [{ name: 'Widow Saint', hp: 34, def: 15, atk: 4, dmg: 9 }],
        win: 'widow_falls',
        lose: 'gameover',
        opening: a.has('widowWounded') ? 2 : 0,
      }),
    },

    widow_falls: {
      title: 'Widow Saint',
      text: [
        'She goes down to one knee on the bridge, blades skittering away into the dark. She is bleeding badly. She is smiling anyway.',
        '"Well," she says. "That\'s that."',
        '"Tell Brace I did love the toast," she adds. "Even burnt."',
      ],
      choices: [
        { text: 'Cuff her. She stands trial.', effects: (a) => { a.flag('widowCaptured'); a.trust('vale', 1); a.trust('cross', 1); }, to: 'widow_captured' },
        { text: 'Turn your back on her and walk away.', effects: (a) => a.flag('widowLeft'), to: 'widow_left' },
      ],
    },

    widow_captured: {
      title: 'Widow Saint',
      text: [
        'Cross snaps the cuffs on her personally. "Twelve years of business trips," she says. "Hope you liked them. You\'ll be taking a long one now."',
        'Selene laughs, and then she doesn\'t, and for a moment she just looks very tired.',
      ],
      choices: [{ text: 'Open the blast door.', to: 'veyr_core' }],
    },

    widow_left: {
      title: 'Widow Saint',
      text: [
        'You step past her. Behind you, a soft sound. When you look back, the bridge rail is empty.',
        'Nobody saw her fall. Nobody saw her not fall.',
      ],
      choices: [{ text: 'Open the blast door.', to: 'veyr_core' }],
    },

    veyr_core: {
      title: 'The Lattice',
      checkpoint: true,
      onEnter: (a) => {
        for (const id of SQUAD_IDS.concat('jaz')) a.heal(id, 10);
        a.note('[MED] Boone patches you up one last time. +10 HP to the squad.', 'ok');
      },
      text: (a) => [
        'The Lattice fills a cavern the size of a cathedral. Steel ribs curve up into the dark, and cables as thick as tree trunks run into the center, where a cradle sits empty, waiting.',
        'Next to the cradle, Brace is strapped into a steel chair, wired into the machine. He lifts his head when he sees you. "Jaz. No."',
        'Commander Veyr stands in front of the cradle in a heavy black exo-frame, plated and humming, with the old medals still pinned to the chest.',
        '"You brought friends," he says. "I assumed you would. Soldiers never listen."',
        '"Put the stone in the cradle, Sergeant Major. Or I put the doctor through the Lattice, and we find out what happens to a man with no stone to anchor him."',
        a.has('ambushStopped') ? 'Behind you, a door hammers once, twice, and goes quiet. Veyr\'s reinforcements aren\'t coming.' : 'Behind you, a side door bangs open. Fang soldiers pour in.',
      ],
      choices: [
        { text: 'Fight the reinforcements.', if: (a) => !a.has('ambushStopped'), to: 'core_ambush' },
        { text: '"You want the stone? Come and take it."', if: (a) => a.has('ambushStopped'), to: 'veyr_fight' },
      ],
    },

    core_ambush: {
      title: 'The Lattice',
      text: ['Gunfire echoes off the steel ribs of the Lattice.'],
      combat: () => ({
        enemies: [
          { name: 'Fang Enforcer', hp: 14, def: 13, atk: 3, dmg: 8 },
          { name: 'Fang Enforcer', hp: 14, def: 13, atk: 3, dmg: 8 },
        ],
        win: 'veyr_after_ambush',
        lose: 'gameover',
      }),
    },

    veyr_after_ambush: {
      title: 'The Lattice',
      text: ['The last of the Fang go down. Veyr watches, unconcerned, flexing the steel fingers of the exo-frame.', '"Fine," he says. "I\'ll take it myself."'],
      choices: [{ text: 'Face Veyr.', to: 'veyr_fight' }],
    },

    veyr_fight: {
      title: 'The Architect',
      text: ['Commander Aurelian Veyr steps forward, and the floor shakes.'],
      combat: (a) => ({
        enemies: [{ name: 'Cmdr. Veyr (exo-frame)', hp: 46, def: 14, atk: 4, dmg: 9 }],
        win: 'veyr_down',
        lose: 'gameover',
        opening: a.has('valeHeld') ? 2 : 0,
      }),
    },

    veyr_down: {
      title: 'The Architect',
      text: (a) => [
        'The exo-frame locks up, sparking, and Veyr crashes to his knees in front of the cradle.',
        'He is not done. With his last strength he slams a fist into the control panel. The Lattice roars awake. Light pours up the steel ribs. The whole cavern starts to shake.',
        '"Overload," he gasps, laughing. "If I can\'t have it, nobody walks out of here."',
        'Brace is screaming. The cables to his chair are glowing white-hot.',
        'The Starstone is burning against your chest, pulling toward the cradle like a magnet. You understand, the way you understood the first time you touched it: the Lattice will take its power and pour it into whoever stands in that cradle.',
        a.state.strain >= 3 ? 'Part of you wants it. A big part.' : 'It would be so easy.',
        'Seconds left.',
      ],
      choices: [
        { text: 'Step into the cradle. Take the power. Save everyone your way.', to: 'end_heir' },
        { text: 'Smash the stone into the Lattice and shut it down.', to: 'final_stand' },
      ],
    },

    final_stand: {
      title: 'Fallen Star',
      text: (a) => holdsTheLine(a)
        ? [
          '"Raines! Brace! Boone, the cables! Knox, the panel! Cross, Vale, cover the doors!"',
          'You don\'t have to say anything else. They have been with you since Lowtown. Every one of them moves at once, exactly where you need them.',
          'Raines tears Brace out of the chair. Boone cuts the cables. Knox rips the panel open. Cross and Vale hold the doors.',
          'You take the Starstone out of your vest for the last time and drive it into the heart of the Lattice.',
        ]
        : [
          '"Raines! Brace! Knox, the panel! Everyone, on me!"',
          'But they hesitate. Just for a second. Too many orders that didn\'t make sense. Too many times you rewrote them without asking. A second is all it takes.',
          'Veyr\'s hand closes on the Starstone and tears it from your grip. He is dying, but he throws it, hard, across the cavern, into the hands of the last Fang soldier standing in the doorway.',
          'The soldier runs. The Lattice is tearing itself apart. And Brace is still strapped into the chair.',
        ],
      choices: [
        { text: 'Hold on.', if: (a) => holdsTheLine(a), to: 'end_hold' },
        { text: 'Get them out. Whatever it costs.', if: (a) => !holdsTheLine(a), to: 'end_fallen' },
      ],
    },

    end_hold: {
      title: 'Hold the Line',
      onEnter: (a) => a.flag('endingHold'),
      text: (a) => [
        'The Starstone breaks like glass in a fire. The light goes out of it, out of the Lattice, out of your veins, all at once.',
        'In the silence afterward, Veyr is still. The cavern stops shaking. Somewhere, water is dripping.',
        'Brace is alive, leaning on Raines, staring at you. "You gave it up," he says. "You could have had anything, and you gave it up."',
        '"I had everything I needed already," you say. You look at your squad. All of them, still themselves.',
        '<b>EPILOGUE</b>',
        'The clinic files go to the Blue Star High Court with a hundred witnesses behind them. NorthStar collapses in a week. The Cobra\'s Fang scatters.',
        a.has('quillsSaved') ? 'Mira Quill draws a new picture: six stick figures in uniform under a big star. It hangs on the wall of the Bellows, which the Hollow turn into a real shelter. A real one.' : '',
        a.has('reyesSaved') ? 'Danny Reyes learns what rain smells like again. Boone visits every week. He still owes her twenty credits.' : 'Boone keeps Danny\'s dog tags on her own chain.',
        a.has('valeHeld') ? 'Vale testifies at the Ridgeback hearings. They finally put Elias\'s name on the memorial, next to your father\'s.' : 'Vale goes to the Ridgeback memorial alone and stands there a long time.',
        a.has('leftPilot') ? 'Nobody ever found out what happened to Flight Lt. Wren Hollis. You still look for her name.' : 'Flight Lt. Wren Hollis buys the first round. Then the second. Then Raines buys the rest.',
        'Brace comes home. Every Sunday you rebuild something in his garage, like you used to.',
        '<b>ENDING 1 OF 3: HOLD THE LINE.</b>',
      ].filter(Boolean),
      choices: [{ text: 'Play again from the start.', action: 'restart' }],
    },

    end_heir: {
      title: 'The Architect\'s Heir',
      onEnter: (a) => a.flag('endingHeir'),
      text: (a) => [
        'You step into the cradle. The Lattice sings.',
        'Power pours into you, through you, out of you. You can see every thread of every person in the cavern now. Veyr\'s, guttering out. Brace\'s, frightened. Your squad\'s, bright and fragile and so easy to fix.',
        'You stop the overload with a thought. You lift Brace out of the chair with a thought. You make the whole cavern quiet with a thought.',
        'Then you look at your squad, and you think: <i>I could make you better.</i>',
        'You do.',
        '<b>EPILOGUE</b>',
        'NorthStar falls in a day. The Cobra\'s Fang falls in a week. Nobody on Blue Star has ever seen soldiers like yours. Faster. Stronger. Unbreakable. They never disobey and never hesitate.',
        a.has('valeHeld') || a.member('vale').trust >= 3 ? 'Vale is the last one to stop arguing with you. You fix that too.' : 'Vale stopped arguing with you a long time ago.',
        'Raines doesn\'t joke anymore. Knox doesn\'t ask if things are good. Boone doesn\'t check your pulse.',
        'Brace leaves the city a month later without saying goodbye. He sends one letter: <i>"You have your father\'s face. But I don\'t know who\'s behind it anymore."</i>',
        'At the Ridgeback memorial, you stand where Veyr once stood, in a uniform covered in medals, and you are very, very sure that you are right.',
        '<b>ENDING 2 OF 3: THE ARCHITECT\'S HEIR.</b>',
      ],
      choices: [{ text: 'Play again from the start.', action: 'restart' }],
    },

    end_fallen: {
      title: 'Fallen Star',
      onEnter: (a) => a.flag('endingFallen'),
      text: (a) => [
        'You are at Brace\'s chair before anyone else moves. You tear the straps, then the cables. They burn your hands down to the bone. You don\'t feel it.',
        '"Raines. Take him."',
        'Raines throws Brace over his shoulder. The squad runs for the lift. You don\'t.',
        'Someone has to hold the blast door from this side, or the overload follows them all the way up.',
        '"Sergeant Major!" Cross is screaming. "Jaz!"',
        'You take off your dog tags and throw them to Boone. She catches them. You hit the switch. The door comes down between you.',
        'The last thing you see is the Lattice burning white, like a star falling the wrong way.',
        '<b>EPILOGUE</b>',
        'The Orchard collapses into the hills. Veyr is never found. Neither is the Starstone. Somewhere out there, the Cobra\'s Fang has it, and somewhere out there, they are learning what it can do.',
        'Your squad gets home. All of them. That was the deal you made with yourself, and you kept it.',
        a.has('quillsSaved') ? 'Mira Quill draws a picture of a star falling into a hill. She gives it to Boone, who doesn\'t know what to say.' : '',
        'Brace hangs your dog tags in the garage, next to your father\'s medals. On Sundays he still goes out there and rebuilds something, alone.',
        'Raines puts a seventh chair at the table at the Bellows. Nobody ever sits in it.',
        '<b>ENDING 3 OF 3: FALLEN STAR.</b>',
      ].filter(Boolean),
      choices: [{ text: 'Play again from the start.', action: 'restart' }],
    },

    gameover: {
      title: 'Signal Lost',
      text: [
        'The rain keeps falling. Your earpiece fills with static.',
        '<b>SQUAD COMBAT INEFFECTIVE. MISSION FAILED.</b>',
      ],
      choices: [
        { text: 'Retry from the last checkpoint.', action: 'checkpoint' },
        { text: 'Start a new game.', action: 'restart' },
      ],
    },
  },
};
