/* notation.js - engraves an exercise with VexFlow.
   Notes are chunked into bars, bars into justified systems, and the last bar
   is padded with rests so the line ends cleanly. */
(function () {
  'use strict';
  var MG = (window.MG = window.MG || {});
  var VF = null;

  function vf() {
    if (!VF) VF = window.Vex.Flow;
    return VF;
  }

  /* notesPerBeat -> the note value written, and whether it is a tuplet. */
  var RHYTHM = {
    1: { dur: 'q', tuplet: 0, label: 'quarter notes' },
    2: { dur: '8', tuplet: 0, label: 'eighth notes' },
    3: { dur: '8', tuplet: 3, label: 'eighth-note triplets' },
    4: { dur: '16', tuplet: 0, label: 'sixteenth notes' },
    6: { dur: '16', tuplet: 6, label: 'sixteenth-note sextuplets' }
  };
  MG.RHYTHM = RHYTHM;

  MG.suggestClef = function (notes) {
    var sum = 0;
    for (var i = 0; i < notes.length; i++) sum += notes[i].midi;
    return notes.length && sum / notes.length < 57 ? 'bass' : 'treble';
  };

  function restKey(clef) { return clef === 'bass' ? 'd/3' : 'b/4'; }

  /* Split the note list into bars of `perBar`, padding the tail with rests. */
  function toBars(notes, perBar, dur, clef) {
    var F = vf(), bars = [], bar = [], i, n, sn;
    for (i = 0; i < notes.length; i++) {
      n = notes[i];
      sn = new F.StaveNote({ keys: [n.key], duration: dur, clef: clef, auto_stem: true });
      sn.mgNote = n;
      sn.mgIndex = i;
      bar.push(sn);
      if (bar.length === perBar) { bars.push(bar); bar = []; }
    }
    if (bar.length) {
      while (bar.length < perBar) {
        bar.push(new F.StaveNote({ keys: [restKey(clef)], duration: dur + 'r', clef: clef }));
      }
      bars.push(bar);
    }
    return bars;
  }

  /* Render one exercise into `host`. Returns { noteEls } in playback order. */
  MG.renderExercise = function (host, exercise, opts) {
    var F = vf();
    var clef = opts.clef;
    var rhythm = RHYTHM[opts.notesPerBeat] || RHYTHM[2];
    var beatsPerBar = opts.beatsPerBar || 4;
    var perBar = beatsPerBar * opts.notesPerBeat;
    var keySpec = opts.keySpec || 'C';
    var bars = toBars(exercise.notes, perBar, rhythm.dur, clef);

    // One voice per bar: accidental state resets at each barline, which is
    // exactly what a per-bar voice gives us.
    var units = bars.map(function (barNotes) {
      var voice = new F.Voice({ num_beats: beatsPerBar, beat_value: 4 })
        .setMode(F.Voice.Mode.SOFT)
        .addTickables(barNotes);
      F.Accidental.applyAccidentals([voice], keySpec);
      var min = new F.Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice]);
      return { notes: barNotes, voice: voice, min: min };
    });

    // Ask the formatter how much room a bar really needs - a bar full of
    // accidentals is far wider than a bar of naturals, and guessing overflows it.
    var minBar = 24 + units.reduce(function (m, u) { return Math.max(m, u.min); }, 140);

    // How much the clef, key signature and time signature eat at the line start.
    function probeLead(withTime) {
      var p = new F.Stave(10, 0, 400);
      p.addClef(clef);
      if (keySpec !== 'C') p.addKeySignature(keySpec);
      if (withTime) p.addTimeSignature(beatsPerBar + '/4');
      return p.getNoteStartX() - p.getX();
    }
    var lead0 = probeLead(true), leadN = probeLead(false);

    var width = Math.max(520, opts.width || 900);
    var perLine = Math.max(1, Math.min(bars.length, Math.floor((width - 20 - lead0) / minBar)));
    // If a bar still won't fit, widen the canvas rather than cram it; the
    // sheet scrolls horizontally instead of printing notes on top of each other.
    width = Math.max(width, lead0 + minBar * perLine + 20);

    var lines = Math.ceil(bars.length / perLine);
    var lineHeight = 110;
    var height = lines * lineHeight + 30;

    host.innerHTML = '';
    var renderer = new F.Renderer(host, F.Renderer.Backends.SVG);
    renderer.resize(width, height);
    var ctx = renderer.getContext();
    ctx.setFont('Arial', 10);

    var noteEls = [];
    var geometry = [];
    var barIndex = 0;

    for (var line = 0; line < lines; line++) {
      var count = Math.min(perLine, bars.length - barIndex);
      var y = 10 + line * lineHeight;

      var lead = line === 0 ? lead0 : leadN;
      // Divide by perLine, not count, so a short final system stays short
      // instead of stretching a lone bar across the page.
      var barWidth = (width - 20 - lead) / perLine;

      for (var b = 0; b < count; b++) {
        var first = b === 0;
        var x = 10 + (first ? 0 : lead + b * barWidth);
        var w = first ? lead + barWidth : barWidth;
        var stave = new F.Stave(x, y, w);
        if (first) {
          stave.addClef(clef);
          if (keySpec !== 'C') stave.addKeySignature(keySpec);
          if (line === 0) stave.addTimeSignature(beatsPerBar + '/4');
        }
        if (line === lines - 1 && b === count - 1) stave.setEndBarType(F.Barline.type.END);
        stave.setContext(ctx).draw();

        var unit = units[barIndex + b];
        var barNotes = unit.notes;
        var voice = unit.voice;

        var beams = rhythm.dur === 'q' ? [] : F.Beam.generateBeams(barNotes, {
          groups: [new F.Fraction(opts.notesPerBeat, rhythm.dur === '16' ? 16 : 8)],
          beam_rests: false
        });

        var tuplets = [];
        if (rhythm.tuplet) {
          for (var t = 0; t + rhythm.tuplet <= barNotes.length; t += rhythm.tuplet) {
            tuplets.push(new F.Tuplet(barNotes.slice(t, t + rhythm.tuplet), {
              num_notes: rhythm.tuplet,
              notes_occupied: rhythm.tuplet === 3 ? 2 : 4,
              bracketed: rhythm.tuplet !== 3
            }));
          }
        }

        // formatToStave justifies into the stave's real note area, between
        // getNoteStartX() and getNoteEndX(), so nothing crosses the barline.
        voice.setStave(stave);
        new F.Formatter().joinVoices([voice]).formatToStave([voice], stave);
        voice.draw(ctx, stave);
        beams.forEach(function (bm) { bm.setContext(ctx).draw(); });
        tuplets.forEach(function (tp) { tp.setContext(ctx).draw(); });

        var xs = [];
        barNotes.forEach(function (sn) {
          xs.push(sn.getAbsoluteX());
          if (sn.mgNote === undefined) return;
          var el = null;
          try { el = sn.getSVGElement(); } catch (e) { el = null; }
          noteEls[sn.mgIndex] = el || null;
        });
        geometry.push({
          line: line, bar: barIndex + b, x: x, width: w,
          noteStartX: stave.getNoteStartX(), noteEndX: stave.getNoteEndX(), noteXs: xs
        });
      }
      barIndex += count;
    }
    return {
      noteEls: noteEls, geometry: geometry, svg: host.querySelector('svg'),
      width: width, height: height
    };
  };
})();
