/* patterns.js - turns a scale into an exercise.

   A scale is treated as an endless ladder of indices (see MG.scaleNote).
   Most patterns are a small "cell" of index offsets repeated up the ladder:
   the cell [0, 2] stepping by 1 gives 1-3, 2-4, 3-5 ... i.e. broken thirds.
   A step is either a plain index or { i: index, semi: n } for a chromatic
   neighbour that sits n semitones off the ladder. */
(function () {
  'use strict';
  var MG = (window.MG = window.MG || {});

  function idx(step) { return typeof step === 'number' ? step : step.i; }
  function semi(step) { return typeof step === 'number' ? 0 : (step.semi || 0); }

  /* Run a cell up (dir 1) or down (dir -1) the ladder across the whole range. */
  function runCell(cell, step, span, dir) {
    var out = [], lo = Math.min.apply(null, cell), hi = Math.max.apply(null, cell), s, k;
    if (dir > 0) {
      for (s = -lo; s + hi <= span; s += step) {
        for (k = 0; k < cell.length; k++) out.push(s + cell[k]);
      }
    } else {
      for (s = span - hi; s + lo >= 0; s -= step) {
        for (k = 0; k < cell.length; k++) out.push(s + cell[k]);
      }
    }
    return out;
  }

  /* Descending mirrors the cell so 1-2-3-4 becomes 8-7-6-5. */
  function mirrored(cell) { return cell.map(function (c) { return -c; }); }

  function cellPattern(cell, step) {
    var fn = function (ctx) {
      var stp = step || 1;
      if (ctx.direction === 'down') return runCell(mirrored(cell), stp, ctx.span, -1);
      var up = runCell(cell, stp, ctx.span, 1);
      if (ctx.direction === 'up') return up;
      var down = runCell(mirrored(cell), stp, ctx.span, -1);
      if (up.length && down.length && idx(up[up.length - 1]) === idx(down[0])) down = down.slice(1);
      return up.concat(down);
    };
    // How many scale steps the cell spans. A cell taller than the range has
    // nowhere to sit, so the range grows to fit it (see MG.buildExercise):
    // a 13th arpeggio is two octaves tall whatever you asked for.
    fn.reach = Math.max.apply(null, cell) - Math.min.apply(null, cell);
    return fn;
  }

  /* Plain ladder walk, used as the spine of the chromatic patterns. */
  function ladder(ctx) {
    var out = [], i;
    if (ctx.direction === 'down') { for (i = ctx.span; i >= 0; i--) out.push(i); return out; }
    for (i = 0; i <= ctx.span; i++) out.push(i);
    if (ctx.direction === 'updown') for (i = ctx.span - 1; i >= 0; i--) out.push(i);
    return out;
  }

  function approach(ctx) {
    var base = ladder(ctx), out = [], off = ctx.direction === 'down' ? 1 : -1;
    for (var i = 0; i < base.length; i++) { out.push({ i: base[i], semi: off }); out.push(base[i]); }
    return out;
  }

  function enclosure(ctx) {
    var base = ladder(ctx), out = [];
    for (var i = 0; i < base.length; i++) {
      out.push(base[i] + 1);                    // diatonic step above
      out.push({ i: base[i], semi: -1 });       // chromatic below
      out.push(base[i]);                        // target
    }
    return out;
  }

  function expanding(ctx) {
    var out = [], n = ctx.len, k;
    if (ctx.direction !== 'down') for (k = 1; k <= n; k++) { out.push(0); out.push(k); }
    if (ctx.direction !== 'up') {
      for (k = n; k >= 1; k--) {
        if (out.length && out[out.length - 1] !== ctx.span) out.push(ctx.span);
        out.push(ctx.span - k);
      }
    }
    return out;
  }

  function pedal(ctx) {
    var out = [], i;
    for (i = 1; i <= ctx.span; i++) { out.push(0); out.push(i); }
    if (ctx.direction === 'down') return out.reverse();
    return out;
  }

  function shuffled(ctx) {
    var out = [], s, k, cell;
    for (s = 0; s + 3 <= ctx.span; s += 4) {
      cell = [0, 1, 2, 3];
      for (k = 3; k > 0; k--) {
        var j = Math.floor(ctx.rand() * (k + 1)), t = cell[k]; cell[k] = cell[j]; cell[j] = t;
      }
      for (k = 0; k < 4; k++) out.push(s + cell[k]);
    }
    if (ctx.direction === 'down') out.reverse();
    return out;
  }

  function P(id, name, group, desc, build, len) {
    return {
      id: id, name: name, group: group, desc: desc, build: build,
      cellLen: len || 1, reach: build.reach || 0
    };
  }

  MG.PATTERNS = [
    P('scale', 'Straight scale', 'Scale forms', 'The scale, one note per beat unit.', cellPattern([0]), 1),
    P('thirds', 'Broken thirds', 'Scale forms', '1-3, 2-4, 3-5 ...', cellPattern([0, 2]), 2),
    P('fourths', 'Broken fourths', 'Scale forms', '1-4, 2-5, 3-6 ...', cellPattern([0, 3]), 2),
    P('fifths', 'Broken fifths', 'Scale forms', '1-5, 2-6, 3-7 ...', cellPattern([0, 4]), 2),
    P('sixths', 'Broken sixths', 'Scale forms', '1-6, 2-7, 3-8 ...', cellPattern([0, 5]), 2),
    P('sevenths', 'Broken sevenths', 'Scale forms', '1-7, 2-8, 3-9 ...', cellPattern([0, 6]), 2),
    P('octaves', 'Broken octaves', 'Scale forms', '1-8, 2-9, 3-10 ...', cellPattern([0, 7]), 2),

    P('g1234', 'Four in a row (1-2-3-4)', 'Groupings', 'The workhorse sixteenth-note pattern.', cellPattern([0, 1, 2, 3]), 4),
    P('g1235', 'Digital pattern 1-2-3-5', 'Groupings', 'Classic bebop cell.', cellPattern([0, 1, 2, 4]), 4),
    P('g1324', 'Zig-zag 1-3-2-4', 'Groupings', 'Interlocking thirds.', cellPattern([0, 2, 1, 3]), 4),
    P('g123', 'Three in a row (1-2-3)', 'Groupings', 'Triplet groups.', cellPattern([0, 1, 2]), 3),
    P('g12345', 'Five in a row (1-2-3-4-5)', 'Groupings', 'Quintuplet or shifting-accent practice.', cellPattern([0, 1, 2, 3, 4]), 5),
    P('g1353', 'Chord tones 1-3-5-3', 'Groupings', 'Triad with a turn back.', cellPattern([0, 2, 4, 2]), 4),
    P('turn', 'Turn (1-2-1-7)', 'Groupings', 'Ornament around each scale tone.', cellPattern([0, 1, 0, -1]), 4),
    P('g1543', 'Descending tail 1-5-4-3', 'Groupings', 'Leap up, walk down.', cellPattern([0, 4, 3, 2]), 4),
    P('zigzag6', 'Long zig-zag 1-3-2-4-3-5', 'Groupings', 'Six-note cell moving in thirds.', cellPattern([0, 2, 1, 3, 2, 4], 2), 6),

    P('triads', 'Diatonic triads', 'Arpeggios', '1-3-5 built on every scale degree.', cellPattern([0, 2, 4]), 3),
    P('triadsUD', 'Triads up and down', 'Arpeggios', '1-3-5-3 on every degree.', cellPattern([0, 2, 4, 2]), 4),
    P('sevenChords', 'Diatonic seventh chords', 'Arpeggios', '1-3-5-7 on every scale degree.', cellPattern([0, 2, 4, 6]), 4),
    P('sevenUD', 'Sevenths up and down', 'Arpeggios', '1-3-5-7-5-3 on every degree.', cellPattern([0, 2, 4, 6, 4, 2]), 6),
    P('triadInv', 'Triads, first inversion', 'Arpeggios', '3-5-8 shapes stepping upward.', cellPattern([0, 2, 5]), 3),
    P('ninths', 'Ninth arpeggios', 'Arpeggios', '1-3-5-7-9 on every scale degree.', cellPattern([0, 2, 4, 6, 8]), 5),
    P('elevenths', 'Eleventh arpeggios', 'Arpeggios', '1-3-5-7-9-11 - thirds stacked six high.', cellPattern([0, 2, 4, 6, 8, 10]), 6),
    P('thirteenths', 'Thirteenth arpeggios', 'Arpeggios', '1-3-5-7-9-11-13 - the whole scale in thirds.', cellPattern([0, 2, 4, 6, 8, 10, 12]), 7),
    P('thirteenthsUD', 'Thirteenths up and down', 'Arpeggios', 'Up to the 13th and back to the root.', cellPattern([0, 2, 4, 6, 8, 10, 12, 10, 8, 6, 4, 2]), 12),

    P('approach', 'Chromatic approach', 'Chromatic', 'A half step below each scale tone.', approach, 2),
    P('enclosure', 'Enclosure', 'Chromatic', 'Above, chromatic below, then the target.', enclosure, 3),

    P('expanding', 'Expanding intervals', 'Other', 'Tonic to 2nd, 3rd, 4th ... and back.', expanding, 2),
    P('pedal', 'Tonic pedal', 'Other', 'Alternates the tonic with each scale tone.', pedal, 2),
    P('random', 'Random permutations', 'Other', 'Shuffled four-note groups - fresh every generate.', shuffled, 4)
  ];
  MG.patternById = function (id) {
    for (var i = 0; i < MG.PATTERNS.length; i++) if (MG.PATTERNS[i].id === id) return MG.PATTERNS[i];
    return MG.PATTERNS[0];
  };

  /* Build one exercise: pattern + scale + key -> a flat list of notes. */
  MG.buildExercise = function (opts) {
    var scale = opts.scale, root = opts.root;
    var len = scale.semitones.length;
    // Whole octaves only, so index `span` is always a tonic for endOnTonic.
    var octaves = Math.max(opts.octaves || 1, Math.ceil((opts.pattern.reach || 0) / len));
    var ctx = {
      len: len,
      span: len * octaves,
      direction: opts.direction || 'updown',
      rand: opts.rand || Math.random
    };
    var steps = opts.pattern.build(ctx);

    if (opts.endOnTonic && steps.length) {
      var lastIdx = idx(steps[steps.length - 1]);
      var tonic = ctx.direction === 'down' ? 0 : (ctx.direction === 'up' ? ctx.span : 0);
      if (lastIdx !== tonic) steps.push(tonic);
    }

    var notes = [];
    for (var i = 0; i < steps.length; i++) {
      var n = MG.scaleNote(root, scale, opts.octave, idx(steps[i]));
      var s = semi(steps[i]);
      if (s) n = MG.altered(n, s);
      notes.push(n);
    }
    return {
      notes: notes,
      root: root,
      scale: scale,
      octaves: octaves,
      pattern: opts.pattern,
      title: root.name + ' ' + scale.name + ' - ' + opts.pattern.name
    };
  };
})();
