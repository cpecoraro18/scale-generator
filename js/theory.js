/* theory.js - notes, spelling, scales.
   Everything hangs off the global MG namespace so the app runs from file:// */
(function () {
  'use strict';
  var MG = (window.MG = window.MG || {});

  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
  var ACC = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' };
  var SHARP_PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT_PC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  function mod(n, m) { return ((n % m) + m) % m; }
  MG.mod = mod;

  /* ---- roots -------------------------------------------------------- */
  function root(name, letter, alter) {
    return { name: name, letter: letter, alter: alter, pc: mod(LETTER_PC[letter] + alter, 12) };
  }
  MG.ROOTS = [
    root('C', 0, 0), root('C#', 0, 1), root('Db', 1, -1), root('D', 1, 0),
    root('D#', 1, 1), root('Eb', 2, -1), root('E', 2, 0), root('F', 3, 0),
    root('F#', 3, 1), root('Gb', 4, -1), root('G', 4, 0), root('G#', 4, 1),
    root('Ab', 5, -1), root('A', 5, 0), root('A#', 5, 1), root('Bb', 6, -1),
    root('B', 6, 0), root('Cb', 0, -1)
  ];
  MG.rootByName = function (n) {
    for (var i = 0; i < MG.ROOTS.length; i++) if (MG.ROOTS[i].name === n) return MG.ROOTS[i];
    return MG.ROOTS[0];
  };

  /* ---- scale library ------------------------------------------------
     semitones: offsets from the root
     degrees:   the diatonic letter-step (0..6) each note is spelled on   */
  function S(id, name, group, semitones, degrees, keySig, easySpell) {
    return {
      id: id, name: name, group: group,
      semitones: semitones, degrees: degrees, keySig: keySig || null, easySpell: !!easySpell
    };
  }
  var D7 = [0, 1, 2, 3, 4, 5, 6];

  MG.SCALES = [
    S('major', 'Major (Ionian)', 'Major & modes', [0, 2, 4, 5, 7, 9, 11], D7, 'major'),
    S('dorian', 'Dorian', 'Major & modes', [0, 2, 3, 5, 7, 9, 10], D7, 'minor'),
    S('phrygian', 'Phrygian', 'Major & modes', [0, 1, 3, 5, 7, 8, 10], D7, 'minor'),
    S('lydian', 'Lydian', 'Major & modes', [0, 2, 4, 6, 7, 9, 11], D7, 'major'),
    S('mixolydian', 'Mixolydian', 'Major & modes', [0, 2, 4, 5, 7, 9, 10], D7, 'major'),
    S('aeolian', 'Natural minor (Aeolian)', 'Major & modes', [0, 2, 3, 5, 7, 8, 10], D7, 'minor'),
    S('locrian', 'Locrian', 'Major & modes', [0, 1, 3, 5, 6, 8, 10], D7, 'minor'),

    S('harmonicMinor', 'Harmonic minor', 'Minor', [0, 2, 3, 5, 7, 8, 11], D7, 'minor'),
    S('melodicMinor', 'Melodic minor (jazz)', 'Minor', [0, 2, 3, 5, 7, 9, 11], D7, 'minor'),
    S('harmonicMajor', 'Harmonic major', 'Minor', [0, 2, 4, 5, 7, 8, 11], D7, 'major'),
    S('phrygianDom', 'Phrygian dominant', 'Minor', [0, 1, 4, 5, 7, 8, 10], D7, null),
    S('hungarianMinor', 'Hungarian minor', 'Minor', [0, 2, 3, 6, 7, 8, 11], D7, null),
    S('doubleHarmonic', 'Double harmonic', 'Minor', [0, 1, 4, 5, 7, 8, 11], D7, null),
    S('neapolitanMinor', 'Neapolitan minor', 'Minor', [0, 1, 3, 5, 7, 8, 11], D7, null),
    S('neapolitanMajor', 'Neapolitan major', 'Minor', [0, 1, 3, 5, 7, 9, 11], D7, null),

    S('dorianb2', 'Dorian b2', 'Melodic minor modes', [0, 1, 3, 5, 7, 9, 10], D7, null),
    S('lydianAug', 'Lydian augmented', 'Melodic minor modes', [0, 2, 4, 6, 8, 9, 11], D7, null),
    S('lydianDom', 'Lydian dominant', 'Melodic minor modes', [0, 2, 4, 6, 7, 9, 10], D7, null),
    S('mixob6', 'Mixolydian b6', 'Melodic minor modes', [0, 2, 4, 5, 7, 8, 10], D7, null),
    S('locrian2', 'Locrian #2', 'Melodic minor modes', [0, 2, 3, 5, 6, 8, 10], D7, null),
    S('altered', 'Altered (super locrian)', 'Melodic minor modes', [0, 1, 3, 4, 6, 8, 10], D7, null),

    S('majorPent', 'Major pentatonic', 'Pentatonic & blues', [0, 2, 4, 7, 9], [0, 1, 2, 4, 5], 'major'),
    S('minorPent', 'Minor pentatonic', 'Pentatonic & blues', [0, 3, 5, 7, 10], [0, 2, 3, 4, 6], 'minor'),
    S('domPent', 'Dominant pentatonic', 'Pentatonic & blues', [0, 2, 4, 7, 10], [0, 1, 2, 4, 6], null),
    S('blues', 'Blues (minor)', 'Pentatonic & blues', [0, 3, 5, 6, 7, 10], [0, 2, 3, 4, 4, 6], null),
    S('majorBlues', 'Major blues', 'Pentatonic & blues', [0, 2, 3, 4, 7, 9], [0, 1, 2, 2, 4, 5], null),
    S('hirajoshi', 'Hirajoshi', 'Pentatonic & blues', [0, 2, 3, 7, 8], [0, 1, 2, 4, 5], null),
    S('kumoi', 'Kumoi', 'Pentatonic & blues', [0, 2, 3, 7, 9], [0, 1, 2, 4, 5], null),
    S('insen', 'In-sen', 'Pentatonic & blues', [0, 1, 5, 7, 10], [0, 1, 3, 4, 6], null),

    S('bebopDom', 'Bebop dominant', 'Bebop', [0, 2, 4, 5, 7, 9, 10, 11], [0, 1, 2, 3, 4, 5, 6, 6], 'major'),
    S('bebopMajor', 'Bebop major', 'Bebop', [0, 2, 4, 5, 7, 8, 9, 11], [0, 1, 2, 3, 4, 5, 5, 6], 'major'),
    S('bebopDorian', 'Bebop dorian', 'Bebop', [0, 2, 3, 4, 5, 7, 9, 10], [0, 1, 2, 2, 3, 4, 5, 6], 'minor'),
    S('bebopMelMin', 'Bebop melodic minor', 'Bebop', [0, 2, 3, 5, 7, 8, 9, 11], [0, 1, 2, 3, 4, 5, 5, 6], 'minor'),

    S('wholeTone', 'Whole tone', 'Symmetric', [0, 2, 4, 6, 8, 10], [0, 1, 2, 3, 4, 5], null, true),
    S('dimHW', 'Diminished (half-whole)', 'Symmetric', [0, 1, 3, 4, 6, 7, 9, 10], [0, 1, 2, 2, 3, 4, 5, 6], null, true),
    S('dimWH', 'Diminished (whole-half)', 'Symmetric', [0, 2, 3, 5, 6, 8, 9, 11], [0, 1, 2, 3, 4, 5, 5, 6], null, true),
    S('augmented', 'Augmented', 'Symmetric', [0, 3, 4, 7, 8, 11], [0, 2, 2, 4, 5, 6], null, true),
    S('chromatic', 'Chromatic', 'Symmetric',
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], null, true)
  ];
  MG.scaleById = function (id) {
    for (var i = 0; i < MG.SCALES.length; i++) if (MG.SCALES[i].id === id) return MG.SCALES[i];
    return MG.SCALES[0];
  };

  /* ---- note construction -------------------------------------------- */
  function finish(midi, letter, octave, alter) {
    var acc = ACC[String(alter)] || '';
    return {
      midi: midi, letter: letter, octave: octave, alter: alter, acc: acc,
      name: LETTERS[letter] + acc,
      full: LETTERS[letter] + acc + octave,
      key: LETTERS[letter].toLowerCase() + acc + '/' + octave
    };
  }

  /* Fallback spelling straight from the pitch class, for runaway accidentals. */
  function spellByPc(midi, useSharps) {
    var pc = mod(midi, 12);
    var nm = (useSharps ? SHARP_PC : FLAT_PC)[pc];
    var letter = LETTERS.indexOf(nm.charAt(0));
    var octave = Math.floor(midi / 12) - 1;
    return finish(midi, letter, octave, midi - (12 * (octave + 1) + LETTER_PC[letter]));
  }
  MG.spellByPc = spellByPc;

  function makeNote(midi, letter, octave) {
    var alter = midi - (12 * (octave + 1) + LETTER_PC[letter]);
    if (alter < -2 || alter > 2) return spellByPc(midi, alter > 0);
    return finish(midi, letter, octave, alter);
  }
  MG.makeNote = makeNote;

  /* Root midi keeps the written letter's octave: Cb4 sounds as B3 but is written in octave 4. */
  MG.rootMidi = function (r, octave) { return 12 * (octave + 1) + LETTER_PC[r.letter] + r.alter; };

  /* The scale as an endless indexed ladder: index 0 = root, negatives run below it. */
  MG.scaleNote = function (r, scale, octave, index) {
    var len = scale.semitones.length;
    var oct = Math.floor(index / len);
    var i = mod(index, len);
    var midi = MG.rootMidi(r, octave) + scale.semitones[i] + 12 * oct;
    var letterAbs = r.letter + scale.degrees[i] + 7 * oct;
    var note = makeNote(midi, mod(letterAbs, 7), octave + Math.floor(letterAbs / 7));
    // Symmetric scales don't fit seven letters; double accidentals there hurt more
    // than they help, so fall back to plain sharps or flats to match the root.
    if (scale.easySpell && (note.alter < -1 || note.alter > 1)) return spellByPc(midi, r.alter >= 0);
    return note;
  };

  /* A note some semitones off a target, spelled on the neighbouring letter. */
  MG.altered = function (note, semis) {
    var midi = note.midi + semis;
    var letterAbs = note.letter + (semis > 0 ? 1 : -1);
    return makeNote(midi, mod(letterAbs, 7), note.octave + Math.floor(letterAbs / 7));
  };

  /* ---- key signatures ------------------------------------------------ */
  var MAJOR_KEYS = {
    'C': 'C', 'G': 'G', 'D': 'D', 'A': 'A', 'E': 'E', 'B': 'B', 'F#': 'F#', 'C#': 'C#',
    'F': 'F', 'Bb': 'Bb', 'Eb': 'Eb', 'Ab': 'Ab', 'Db': 'Db', 'Gb': 'Gb', 'Cb': 'Cb'
  };
  var MINOR_KEYS = {
    'A': 'Am', 'E': 'Em', 'B': 'Bm', 'F#': 'F#m', 'C#': 'C#m', 'G#': 'G#m', 'D#': 'D#m',
    'A#': 'A#m', 'D': 'Dm', 'G': 'Gm', 'C': 'Cm', 'F': 'Fm', 'Bb': 'Bbm', 'Eb': 'Ebm', 'Ab': 'Abm'
  };
  MG.keySpec = function (r, scale) {
    if (scale.keySig === 'major') return MAJOR_KEYS[r.name] || 'C';
    if (scale.keySig === 'minor') return MINOR_KEYS[r.name] || 'C';
    return 'C';
  };

  /* Rotations that carry a name of their own, in scale-degree order.
     Anything not listed here falls back to "<scale> mode N". */
  var MODE_NAMES = {
    harmonicMinor: ['Harmonic minor', 'Locrian natural 6', 'Ionian #5', 'Dorian #4',
      'Phrygian dominant', 'Lydian #2', 'Altered diminished'],
    harmonicMajor: ['Harmonic major', 'Dorian b5', 'Phrygian b4', 'Lydian b3',
      'Mixolydian b2', 'Lydian augmented #2', 'Locrian bb7'],
    majorPent: ['Major pentatonic', 'Egyptian (suspended)', 'Blues minor',
      'Blues major (Ritusen)', 'Minor pentatonic'],
    minorPent: ['Minor pentatonic', 'Major pentatonic', 'Egyptian (suspended)',
      'Blues minor', 'Blues major (Ritusen)']
  };

  /* ---- modes (scale rotations) --------------------------------------
     Mode k of a scale starts on its k-th degree: the same notes, re-measured
     from there. Where the rotation happens to be a scale we already know by
     name (major -> dorian, melodic minor -> lydian dominant ...) we borrow
     that entry so the title and key signature read properly. */
  function sameSteps(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  function knownScale(semitones) {
    for (var i = 0; i < MG.SCALES.length; i++) {
      if (sameSteps(MG.SCALES[i].semitones, semitones)) return MG.SCALES[i];
    }
    return null;
  }

  MG.modeOf = function (scale, k) {
    var len = scale.semitones.length;
    k = mod(k, len);
    if (k === 0) return scale;
    var semitones = [], degrees = [], i, j;
    for (i = 0; i < len; i++) {
      j = k + i;
      // Past the top of the scale we wrap round and add the octave back on,
      // so both ladders stay ascending (a degree of 7 is the root's letter again).
      semitones.push(scale.semitones[j % len] - scale.semitones[k] + (j >= len ? 12 : 0));
      degrees.push(scale.degrees[j % len] - scale.degrees[k] + (j >= len ? 7 : 0));
    }
    var known = knownScale(semitones);
    var named = MODE_NAMES[scale.id];
    var s = S(scale.id + '-m' + (k + 1),
      (named && named[k]) || (known && known.name) || scale.name + ' mode ' + (k + 1),
      scale.group, semitones, degrees,
      known ? known.keySig : null,
      known ? known.easySpell : scale.easySpell);
    s.modeOf = scale;
    s.modeDegree = k;
    return s;
  };

  /* The root of a scale's k-th degree, spelled out of the parent key. */
  MG.rootAtDegree = function (r, scale, k) {
    k = mod(k, scale.semitones.length);
    var pc = mod(r.pc + scale.semitones[k], 12);
    var letter = mod(r.letter + scale.degrees[k], 7);
    var alter = mod(pc - LETTER_PC[letter] + 6, 12) - 6;
    if (alter < -2 || alter > 2) {              // runaway spelling: fall back to a plain name
      var nm = (alter > 0 ? SHARP_PC : FLAT_PC)[pc];
      letter = LETTERS.indexOf(nm.charAt(0));
      alter = nm.length > 1 ? (nm.charAt(1) === '#' ? 1 : -1) : 0;
    }
    return root(LETTERS[letter] + (ACC[String(alter)] || ''), letter, alter);
  };

  /* Every mode of a scale as { root, scale } units.
     'relative' keeps the notes and moves the root up each degree
     (C ionian, D dorian, E phrygian ...) - the parent key signature fits them all.
     'parallel' keeps the root and rotates the scale under it
     (C ionian, C dorian, C phrygian ...). */
  MG.modeUnits = function (r, scale, kind, count) {
    var len = scale.semitones.length;
    var n = Math.max(1, Math.min(count || len, len));
    var out = [], k, mode, i, seen;
    for (k = 0; k < n; k++) {
      mode = MG.modeOf(scale, k);
      if (kind === 'parallel') {
        // A symmetric scale repeats itself as it rotates (whole tone has one
        // mode, not six); on one root those repeats are the same exercise.
        for (i = 0, seen = false; i < out.length && !seen; i++) {
          seen = sameSteps(out[i].scale.semitones, mode.semitones);
        }
        if (!seen) out.push({ root: r, scale: mode });
      } else {
        out.push({ root: MG.rootAtDegree(r, scale, k), scale: mode, keySpec: MG.keySpec(r, scale) });
      }
    }
    return out;
  };

  /* ---- key cycles ---------------------------------------------------- */
  var CYCLES = {
    fourths: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G'],
    fifths: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'],
    halfUp: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'],
    wholeUp: ['C', 'D', 'E', 'F#', 'Ab', 'Bb'],
    minorThirds: ['C', 'Eb', 'Gb', 'A'],
    majorThirds: ['C', 'E', 'Ab']
  };
  MG.keyCycle = function (startRoot, cycleId) {
    var names = CYCLES[cycleId];
    if (!names) return [startRoot];
    var order = names.map(MG.rootByName);
    var at = -1;
    for (var i = 0; i < order.length; i++) if (order[i].pc === startRoot.pc) { at = i; break; }
    if (at < 0) return [startRoot];               // chosen root isn't on this cycle
    var out = [startRoot];
    for (var k = 1; k < order.length; k++) out.push(order[(at + k) % order.length]);
    return out;
  };
  MG.CYCLE_IDS = Object.keys(CYCLES);

  MG.scaleSpelling = function (r, scale, octave) {
    var out = [];
    for (var i = 0; i <= scale.semitones.length; i++) out.push(MG.scaleNote(r, scale, octave, i));
    return out;
  };
})();
