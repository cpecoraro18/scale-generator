/* app.js - UI wiring: reads the controls, builds exercises, draws sheets,
   and hands the same material to the player and the MIDI writer. */
(function () {
  'use strict';
  var MG = window.MG;
  var BASIC = ['scale', 'thirds', 'g1234', 'triads'];
  var BEATS_PER_BAR = 4;

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    root: $('root'), octave: $('octave'), scale: $('scale'), spelling: $('spelling'),
    octaves: $('octaves'), direction: $('direction'), clef: $('clef'), npb: $('npb'),
    tempo: $('tempo'), tempoOut: $('tempo-out'), keysig: $('keysig'), tonic: $('tonic'),
    patterns: $('patterns'), cycle: $('cycle'), keycount: $('keycount'),
    keycountField: $('keycount-field'), keycountOut: $('keycount-out'),
    modes: $('modes'), modecount: $('modecount'), modecountField: $('modecount-field'),
    modecountOut: $('modecount-out'), modesNote: $('modes-note'),
    sheets: $('sheets'), summary: $('summary'),
    generate: $('btn-generate'), play: $('btn-play'), stop: $('btn-stop'),
    midi: $('btn-midi'), print: $('btn-print')
  };

  var current = null;   // { exercises: [{ ex, render, host }], events, opts }

  /* ---- populate controls ---------------------------------------------- */
  function fillControls() {
    MG.ROOTS.forEach(function (r) {
      var o = document.createElement('option');
      o.value = r.name; o.textContent = r.name;
      if (r.name === 'C') o.selected = true;
      el.root.appendChild(o);
    });

    for (var oct = 2; oct <= 6; oct++) {
      var o = document.createElement('option');
      o.value = oct; o.textContent = oct;
      if (oct === 4) o.selected = true;
      el.octave.appendChild(o);
    }

    var groups = {};
    MG.SCALES.forEach(function (s) {
      if (!groups[s.group]) {
        groups[s.group] = document.createElement('optgroup');
        groups[s.group].label = s.group;
        el.scale.appendChild(groups[s.group]);
      }
      var o = document.createElement('option');
      o.value = s.id; o.textContent = s.name;
      if (s.id === 'major') o.selected = true;
      groups[s.group].appendChild(o);
    });

    var last = null;
    MG.PATTERNS.forEach(function (p) {
      if (p.group !== last) {
        last = p.group;
        var h = document.createElement('h3');
        h.textContent = p.group;
        el.patterns.appendChild(h);
      }
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = p.id;
      cb.checked = BASIC.indexOf(p.id) >= 0;
      var span = document.createElement('span');
      span.innerHTML = '<b>' + p.name + '</b><small>' + p.desc + '</small>';
      label.appendChild(cb); label.appendChild(span);
      el.patterns.appendChild(label);
    });
  }

  function selectedPatterns() {
    var out = [];
    el.patterns.querySelectorAll('input:checked').forEach(function (cb) {
      out.push(MG.patternById(cb.value));
    });
    return out;
  }

  function showSpelling() {
    var r = MG.rootByName(el.root.value);
    var s = MG.scaleById(el.scale.value);
    var notes = MG.scaleSpelling(r, s, +el.octave.value);
    el.spelling.innerHTML = '';
    notes.forEach(function (n, i) {
      var c = document.createElement('span');
      c.className = 'chip' + (i === 0 || i === notes.length - 1 ? ' tonic' : '');
      c.textContent = n.name;
      el.spelling.appendChild(c);
    });
  }

  /* A scale has as many modes as it has notes, so the degree slider and the
     preview under it are re-fitted whenever the scale or root changes. */
  function syncModes() {
    var scale = MG.scaleById(el.scale.value);
    var len = scale.semitones.length;
    var kind = el.modes.value;
    el.modecount.max = len;
    if (+el.modecount.value > len) el.modecount.value = len;
    el.modecountOut.textContent = el.modecount.value;
    el.modecountField.hidden = kind === 'off';
    el.modesNote.hidden = kind === 'off';
    if (kind === 'off') return;
    var units = MG.modeUnits(MG.rootByName(el.root.value), scale, kind, +el.modecount.value);
    el.modesNote.innerHTML = units.map(function (u, i) {
      return '<b>' + escapeHtml(String(i + 1)) + '.</b> ' +
        escapeHtml(u.root.name + ' ' + u.scale.name);
    }).join(' &middot; ');
  }

  /* ---- build ---------------------------------------------------------- */
  function readOpts() {
    var scale = MG.scaleById(el.scale.value);
    var root = MG.rootByName(el.root.value);
    var cycle = el.cycle.value;
    var keys = cycle === 'single' ? [root] : MG.keyCycle(root, cycle).slice(0, +el.keycount.value);
    return {
      root: root, scale: scale, keys: keys,
      modeKind: el.modes.value,
      modeCount: +el.modecount.value,
      octave: +el.octave.value,
      octaves: +el.octaves.value,
      direction: el.direction.value,
      clef: el.clef.value,
      notesPerBeat: +el.npb.value,
      tempo: +el.tempo.value,
      useKeySig: el.keysig.checked,
      endOnTonic: el.tonic.checked,
      patterns: selectedPatterns()
    };
  }

  /* One { root, scale } per exercise: the chosen scale, or each of its modes. */
  function unitsFor(opts, key) {
    if (opts.modeKind === 'off') return [{ root: key, scale: opts.scale }];
    return MG.modeUnits(key, opts.scale, opts.modeKind, opts.modeCount);
  }

  function buildAll(opts) {
    var list = [];
    opts.keys.forEach(function (key) {
      unitsFor(opts, key).forEach(function (unit) {
        opts.patterns.forEach(function (pattern) {
          var ex = MG.buildExercise({
            root: unit.root, scale: unit.scale, octave: opts.octave, octaves: opts.octaves,
            direction: opts.direction, pattern: pattern, endOnTonic: opts.endOnTonic
          });
          ex.clef = opts.clef === 'auto' ? MG.suggestClef(ex.notes) : opts.clef;
          // Relative modes are the parent key's own notes, so they share its signature.
          ex.keySpec = opts.useKeySig
            ? (unit.keySpec || MG.keySpec(unit.root, unit.scale))
            : 'C';
          list.push(ex);
        });
      });
    });
    return list;
  }

  function sheetWidth() {
    return Math.max(520, (el.sheets.clientWidth || 900) - 24);
  }

  function filename(ex, ext) {
    return (ex.root.name + '-' + ex.scale.id + '-' + ex.pattern.id)
      .replace(/[^A-Za-z0-9#\-]/g, '') + '.' + ext;
  }

  function render(opts, exercises) {
    el.sheets.innerHTML = '';
    var rhythm = MG.RHYTHM[opts.notesPerBeat];
    var entries = [];

    exercises.forEach(function (ex) {
      var sheet = document.createElement('div');
      sheet.className = 'sheet';

      var head = document.createElement('div');
      head.className = 'sheet-head';
      head.innerHTML =
        '<h3 class="sheet-title">' + escapeHtml(ex.title) + '</h3>' +
        '<span class="sheet-sub">' + ex.octaves + ' octave' + (ex.octaves > 1 ? 's' : '') +
        ' &middot; ' + rhythm.label + ' &middot; ' + opts.tempo + ' bpm &middot; ' +
        ex.notes.length + ' notes</span>' +
        '<div class="sheet-tools">' +
        '<button data-act="svg">SVG</button><button data-act="midi">MIDI</button></div>';
      sheet.appendChild(head);

      var body = document.createElement('div');
      body.className = 'sheet-body';
      var score = document.createElement('div');
      body.appendChild(score);
      sheet.appendChild(body);
      el.sheets.appendChild(sheet);

      var res = MG.renderExercise(score, ex, {
        clef: ex.clef, keySpec: ex.keySpec, notesPerBeat: opts.notesPerBeat,
        beatsPerBar: BEATS_PER_BAR, width: sheetWidth()
      });
      entries.push({ ex: ex, render: res, host: score });

      head.querySelector('[data-act="svg"]').addEventListener('click', function () {
        downloadSvg(res.svg, filename(ex, 'svg'));
      });
      head.querySelector('[data-act="midi"]').addEventListener('click', function () {
        downloadMidi(opts, [ex], filename(ex, 'mid'));
      });
    });

    return entries;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---- playback timeline (shared shape with the MIDI writer) ----------- */
  function timeline(opts, exercises) {
    var secPerNote = 60 / opts.tempo / opts.notesPerBeat;
    var barSec = 60 / opts.tempo * BEATS_PER_BAR;
    var events = [], t = 0;
    exercises.forEach(function (entry, ei) {
      if (ei > 0) t += barSec;
      entry.ex.notes.forEach(function (n, ni) {
        events.push({ midi: n.midi, t: t, d: secPerNote, mark: { e: ei, n: ni } });
        t += secPerNote;
      });
      t = Math.ceil(t / barSec - 1e-9) * barSec;
    });
    return events;
  }

  function generate() {
    var opts = readOpts();
    if (!opts.patterns.length) {
      el.sheets.innerHTML = '<div class="error">Pick at least one pattern.</div>';
      el.summary.textContent = '';
      current = null;
      return;
    }
    MG.player.stop();
    setPlaying(false);
    try {
      var exercises = buildAll(opts);
      var entries = render(opts, exercises);
      current = { opts: opts, entries: entries, events: timeline(opts, entries) };
      var bars = 0;
      entries.forEach(function (e) {
        bars += Math.ceil(e.ex.notes.length / (BEATS_PER_BAR * opts.notesPerBeat));
      });
      var modeCount = unitsFor(opts, opts.root).length;
      el.summary.textContent = entries.length + ' exercise' + (entries.length > 1 ? 's' : '') +
        ' · ' + opts.keys.length + ' key' + (opts.keys.length > 1 ? 's' : '') +
        (modeCount > 1 ? ' · ' + modeCount + ' modes' : '') +
        ' · ' + bars + ' bars';
    } catch (err) {
      el.sheets.innerHTML = '<div class="error">Could not engrave that: ' +
        escapeHtml(String(err && err.message || err)) + '</div>';
      current = null;
      throw err;
    }
  }

  /* ---- exports --------------------------------------------------------- */
  function downloadMidi(opts, exercises, name) {
    var ticks = Math.round(MG.PPQ / opts.notesPerBeat);
    var data = MG.buildMidi({
      tempo: opts.tempo,
      beatsPerBar: BEATS_PER_BAR,
      title: exercises.length === 1 ? exercises[0].title : opts.scale.name + ' exercises',
      sections: exercises.map(function (ex) {
        return { name: ex.title, notes: ex.notes, ticksPerNote: ticks };
      })
    });
    MG.downloadBlob(data, name, 'audio/midi');
  }

  function downloadSvg(svg, name) {
    if (!svg) return;
    var clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%');
    bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);
    var text = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
    MG.downloadBlob(new Blob([text], { type: 'image/svg+xml' }), name);
  }

  /* ---- playback -------------------------------------------------------- */
  var lit = null;
  function highlight(mark) {
    if (lit) { lit.classList.remove('vf-playing'); lit = null; }
    if (!mark || !current) return;
    var entry = current.entries[mark.e];
    var node = entry && entry.render.noteEls[mark.n];
    if (node && node.classList) { node.classList.add('vf-playing'); lit = node; }
  }

  function setPlaying(on) {
    el.play.disabled = on;
    el.stop.disabled = !on;
    if (!on) highlight(null);
  }

  function play() {
    if (!current) generate();
    if (!current) return;
    setPlaying(true);
    MG.player.play(current.events, {
      onNote: highlight,
      onEnd: function () { setPlaying(false); }
    });
  }

  /* ---- events ---------------------------------------------------------- */
  function bind() {
    el.generate.addEventListener('click', generate);
    el.play.addEventListener('click', play);
    el.stop.addEventListener('click', function () { MG.player.stop(); setPlaying(false); });
    el.print.addEventListener('click', function () { window.print(); });
    el.midi.addEventListener('click', function () {
      if (!current) generate();
      if (!current) return;
      var opts = current.opts;
      downloadMidi(opts, current.entries.map(function (e) { return e.ex; }),
        opts.root.name + '-' + opts.scale.id + '-exercises.mid');
    });

    el.tempo.addEventListener('input', function () { el.tempoOut.textContent = el.tempo.value; });
    el.keycount.addEventListener('input', function () { el.keycountOut.textContent = el.keycount.value; });
    el.modecount.addEventListener('input', syncModes);
    el.modes.addEventListener('change', syncModes);
    el.cycle.addEventListener('change', function () {
      el.keycountField.hidden = el.cycle.value === 'single';
    });
    [el.root, el.scale, el.octave].forEach(function (c) {
      c.addEventListener('change', function () { showSpelling(); syncModes(); });
    });

    el.patterns.parentNode.querySelectorAll('[data-select]').forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.getAttribute('data-select');
        el.patterns.querySelectorAll('input').forEach(function (cb) {
          cb.checked = mode === 'all' ? true : mode === 'none' ? false : BASIC.indexOf(cb.value) >= 0;
        });
      });
    });

    // Re-engrave on resize so systems stay justified to the window.
    var t = null;
    window.addEventListener('resize', function () {
      if (!current) return;
      clearTimeout(t);
      t = setTimeout(function () {
        var wasPlaying = MG.player.playing;
        MG.player.stop();
        setPlaying(false);
        current.entries = render(current.opts, current.entries.map(function (e) { return e.ex; }));
        current.events = timeline(current.opts, current.entries);
        if (wasPlaying) play();
      }, 220);
    });

    document.addEventListener('keydown', function (e) {
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (e.code === 'Space') { e.preventDefault(); MG.player.playing ? (MG.player.stop(), setPlaying(false)) : play(); }
      if (e.key === 'g' || e.key === 'G') generate();
    });
  }

  fillControls();
  showSpelling();
  syncModes();
  bind();
  generate();
})();
