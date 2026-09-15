/* app.js - UI wiring: reads the controls, builds exercises, draws sheets,
   and hands the same material to the player and the MIDI writer. */
(function () {
  'use strict';
  var MG = window.MG;
  var BASIC = ['scale', 'thirds', 'g1234', 'triads'];
  var BEATS_PER_BAR = 4;
  var MIN_SHEET = 260;          // narrowest staff we will engrave
  var NARROW = '(max-width: 900px)';
  // 48 exercises engrave in about 180ms and 336 in over a second, so that is
  // where applying changes as you make them stops being free.
  var AUTO_MAX = 48;
  var STORE_KEY = 'scale-workshop:settings';
  var SECTION_KEY = 'scale-workshop:sections';

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
    midi: $('btn-midi'), print: $('btn-print'), loop: $('loop'), link: $('btn-link'),
    panel: $('panel'), panelBtn: $('btn-panel'), panelClose: $('btn-panel-close'),
    panelGenerate: $('btn-panel-generate'), scrim: $('scrim'),
    countin: $('countin'), metronome: $('metronome'), trainer: $('trainer'),
    trainerOut: $('trainer-out'), trainerNote: $('trainer-note'),
    patternFilter: $('pattern-filter'), patternCount: $('pattern-count')
  };

  var current = null;   // { exercises: [{ ex, render, host }], events, opts }
  var rows = [];        // one per pattern checkbox, for the filter
  var headings = [];    // the group headings above them
  var noMatch = null;   // shown when the filter matches nothing

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

    var last = null, heading = null;
    MG.PATTERNS.forEach(function (p) {
      if (p.group !== last) {
        last = p.group;
        heading = document.createElement('h3');
        heading.textContent = p.group;
        el.patterns.appendChild(heading);
        headings.push(heading);
      }
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = p.id;
      cb.checked = BASIC.indexOf(p.id) >= 0;
      var span = document.createElement('span');
      span.innerHTML = '<b>' + p.name + '</b><small>' + p.desc + '</small>';
      label.appendChild(cb); label.appendChild(span);
      el.patterns.appendChild(label);
      // What the filter box searches: everything written on the row.
      rows.push({
        label: label, box: cb, heading: heading,
        text: (p.name + ' ' + p.desc + ' ' + p.group + ' ' + p.id).toLowerCase()
      });
    });

    noMatch = document.createElement('p');
    noMatch.className = 'no-match';
    noMatch.hidden = true;
    el.patterns.appendChild(noMatch);
  }

  /* ---- filtering the pattern list -------------------------------------- */
  /* Thirty checkboxes is a lot to read through when you know the name of the
     one you want. Every term has to match, so "bebop arp" narrows twice. */
  function filterPatterns() {
    var query = el.patternFilter.value.trim().toLowerCase();
    var terms = query ? query.split(/\s+/) : [];
    var shown = 0, hiddenPicks = 0, picked = 0;

    rows.forEach(function (row) {
      var hit = terms.every(function (t) { return row.text.indexOf(t) >= 0; });
      row.label.hidden = !hit;
      if (hit) shown++;
      if (row.box.checked) {
        picked++;
        if (!hit) hiddenPicks++;
      }
    });

    headings.forEach(function (h) {
      var visible = false;
      rows.forEach(function (row) {
        if (row.heading === h && !row.label.hidden) visible = true;
      });
      h.hidden = !visible;
    });

    noMatch.hidden = shown > 0;
    noMatch.textContent = 'No pattern matches \u201c' + el.patternFilter.value.trim() + '\u201d.';

    var parts = [query ? shown + ' of ' + rows.length + ' shown' : rows.length + ' patterns'];
    parts.push(picked + ' selected');
    // Otherwise a filter that hides a ticked row looks like it unticked it.
    if (hiddenPicks) parts.push(hiddenPicks + ' not shown');
    el.patternCount.textContent = parts.join(' \u00b7 ');
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

  /* The sheet is only as wide as the column it sits in - about 330px on a
     phone - and the engraver puts fewer bars on a line to suit. */
  function sheetWidth() {
    return Math.max(MIN_SHEET, (el.sheets.clientWidth || 900) - 24);
  }

  function filename(ex, ext) {
    return (ex.root.name + '-' + ex.scale.id + '-' + ex.pattern.id)
      .replace(/[^A-Za-z0-9#\-]/g, '') + '.' + ext;
  }

  /* The line under each sheet title, rebuilt whenever the tempo moves. */
  function sheetSub(ex, opts) {
    return ex.octaves + ' octave' + (ex.octaves > 1 ? 's' : '') +
      ' \u00b7 ' + MG.RHYTHM[opts.notesPerBeat].label +
      ' \u00b7 ' + opts.tempo + ' bpm \u00b7 ' + ex.notes.length + ' notes';
  }

  function render(opts, exercises) {
    el.sheets.innerHTML = '';
    var entries = [];

    exercises.forEach(function (ex, exIndex) {
      var sheet = document.createElement('div');
      sheet.className = 'sheet';

      var head = document.createElement('div');
      head.className = 'sheet-head';
      head.innerHTML =
        '<h3 class="sheet-title">' + escapeHtml(ex.title) + '</h3>' +
        '<span class="sheet-sub">' + escapeHtml(sheetSub(ex, opts)) + '</span>' +
        '<div class="sheet-tools">' +
        '<button data-act="play" class="sheet-play" title="Play this exercise">&#9654;</button>' +
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
        beatsPerBar: BEATS_PER_BAR, width: sheetWidth(), minWidth: MIN_SHEET
      });
      entries.push({
        ex: ex, render: res, host: score, sheet: sheet,
        playBtn: head.querySelector('[data-act="play"]'),
        sub: head.querySelector('.sheet-sub')
      });
      bindNoteClicks(score, res.noteEls, exIndex);

      head.querySelector('[data-act="play"]').addEventListener('click', function () {
        toggleExercise(exIndex);
      });

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
      stopPlayback();
      return;
    }
    stopPlayback();
    try {
      var exercises = buildAll(opts);
      var entries = render(opts, exercises);
      current = { opts: opts, entries: entries, events: timeline(opts, entries) };
      var bars = 0;
      entries.forEach(function (e) {
        bars += Math.ceil(e.ex.notes.length / (BEATS_PER_BAR * opts.notesPerBeat));
      });
      clearStale();
      var modeCount = unitsFor(opts, opts.root).length;
      el.summary.textContent = entries.length + ' exercise' + (entries.length > 1 ? 's' : '') +
        ' · ' + opts.keys.length + ' key' + (opts.keys.length > 1 ? 's' : '') +
        (modeCount > 1 ? ' · ' + modeCount + ' modes' : '') +
        ' · ' + bars + ' bars';
      syncTransport();
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

  /* ---- transport ------------------------------------------------------- */
  /* Playback always runs over a scope - the whole set, or a single exercise.
     The player holds the position inside that scope, so pausing, resuming,
     replaying one exercise or picking up from a clicked note never means
     starting the set over. */
  var scope = null;      // { from, to }: inclusive entry indexes being played
  var lit = null;        // note element currently lit
  var litSheet = null;   // sheet that note belongs to
  var litMark = null;    // { e, n } of that note, for retiming in place

  /* Events for entries from..to, rebased so the range starts at t = 0. */
  function scopeEvents(from, to) {
    var out = [];
    current.events.forEach(function (e) {
      if (e.mark.e >= from && e.mark.e <= to) out.push(e);
    });
    var base = out.length ? out[0].t : 0;
    return out.map(function (e) {
      return { midi: e.midi, t: e.t - base, d: e.d, mark: e.mark };
    });
  }

  function highlight(mark) {
    if (lit) { lit.classList.remove('vf-playing'); lit = null; }
    if (!mark || !current) return;
    var entry = current.entries[mark.e];
    var node = entry && entry.render.noteEls[mark.n];
    if (node && node.classList) { node.classList.add('vf-playing'); lit = node; }
    litMark = mark;
    if (entry && entry.sheet !== litSheet) {
      if (litSheet) litSheet.classList.remove('is-playing');
      litSheet = entry.sheet;
      litSheet.classList.add('is-playing');
      litSheet.scrollIntoView({ block: 'nearest' });
    }
  }

  function clearHighlight() {
    highlight(null);
    litMark = null;
    if (litSheet) { litSheet.classList.remove('is-playing'); litSheet = null; }
  }

  var handlers = {
    onNote: highlight,
    onPause: function () { syncTransport(); },
    onLoop: function () { advanceTrainer(); },
    onEnd: function () { scope = null; clearHighlight(); syncTransport(); }
  };

  /* Paint every transport control from the player's state. */
  function syncTransport() {
    var p = MG.player;
    el.play.innerHTML = p.playing ? '&#10073;&#10073; Pause'
      : p.paused ? '&#9654; Resume' : '&#9654; Play';
    el.stop.disabled = !(p.playing || p.paused);
    if (!current) return;
    current.entries.forEach(function (entry, i) {
      if (!entry.playBtn) return;
      var mine = !!scope && scope.from === i && scope.to === i;
      entry.playBtn.innerHTML = mine && p.playing ? '&#10073;&#10073;' : '&#9654;';
      entry.playBtn.title = mine && p.playing ? 'Pause'
        : mine && p.paused ? 'Resume this exercise' : 'Play this exercise';
      entry.playBtn.className = 'sheet-play' + (mine && (p.playing || p.paused) ? ' is-active' : '');
    });
  }

  function startScope(from, to, offset) {
    if (!current) return;
    scope = { from: from, to: to };
    MG.player.loop = el.loop.checked;
    MG.player.play(scopeEvents(from, to), handlers, offset || 0);
    syncTransport();
  }

  function resumePlayback() {
    MG.player.loop = el.loop.checked;
    MG.player.resume();
    syncTransport();
  }

  function stopPlayback() {
    MG.player.stop();
    scope = null;
    clearHighlight();
    syncTransport();
  }

  /* Toolbar button: pause what is playing, resume what is paused, or start
     the whole set from the top. */
  function togglePlay() {
    var p = MG.player;
    if (p.playing) { p.pause(); return; }
    if (p.paused) { resumePlayback(); return; }
    if (!current) generate();
    if (!current) return;
    startScope(0, current.entries.length - 1, 0);
  }

  /* Per-sheet button: the same three states, scoped to one exercise. */
  function toggleExercise(i) {
    var p = MG.player;
    var mine = !!scope && scope.from === i && scope.to === i;
    if (mine && p.playing) { p.pause(); return; }
    if (mine && p.paused) { resumePlayback(); return; }
    startScope(i, i, 0);
  }

  /* Click a note to pick up from there: inside the running scope when it
     covers that exercise, otherwise on that exercise alone. */
  function playFromNote(entryIndex, noteIndex) {
    if (!current) return;
    if (!scope || entryIndex < scope.from || entryIndex > scope.to) {
      scope = { from: entryIndex, to: entryIndex };
    }
    var events = scopeEvents(scope.from, scope.to);
    var at = 0;
    for (var i = 0; i < events.length; i++) {
      if (events[i].mark.e === entryIndex && events[i].mark.n === noteIndex) {
        at = events[i].t;
        break;
      }
    }
    MG.player.loop = el.loop.checked;
    MG.player.play(events, handlers, at);
    syncTransport();
  }

  /* One delegated listener per sheet rather than one per notehead. */
  function bindNoteClicks(host, noteEls, entryIndex) {
    var index = new Map();
    noteEls.forEach(function (node, i) { if (node) index.set(node, i); });
    host.addEventListener('click', function (ev) {
      var node = ev.target;
      while (node && node !== host && !index.has(node)) node = node.parentNode;
      if (node && index.has(node)) playFromNote(entryIndex, index.get(node));
    });
  }

  /* ---- live tempo ------------------------------------------------------ */
  /* Tempo changes nothing that is engraved, so the sheets stay as they are:
     only the timeline and the bpm captions are rebuilt, and playback picks
     up on the note it was already on. */
  function applyTempo() {
    if (!current) return;
    current.opts.tempo = +el.tempo.value;
    MG.player.grid = { beat: 60 / current.opts.tempo, perBar: BEATS_PER_BAR };
    current.entries.forEach(function (entry) {
      if (entry.sub) entry.sub.textContent = sheetSub(entry.ex, current.opts);
    });
    current.events = timeline(current.opts, current.entries);
    rearmPlayback();
  }

  /* ---- practice settings ----------------------------------------------- */
  /* The count-in, the click and the speed trainer change nothing that is
     engraved, so they are handed to the player and playback is re-armed
     where it stands. */
  function applyPractice() {
    var step = +el.trainer.value;
    el.trainerOut.textContent = step ? '+' + step + ' bpm' : 'off';
    el.trainerNote.hidden = !step;
    if (step && !el.loop.checked) {
      el.trainerNote.innerHTML = 'The speed trainer needs <b>Loop</b> switched on.';
    } else {
      el.trainerNote.textContent =
        'Every time the loop comes round, the tempo goes up by this much, as far as ' +
        el.tempo.max + ' bpm.';
    }

    MG.player.metronome = el.metronome.checked;
    MG.player.countInBars = +el.countin.value;
    MG.player.grid = { beat: 60 / (+el.tempo.value), perBar: BEATS_PER_BAR };
  }

  /* Re-arm the loaded range on the note the playhead is on, so a setting that
     only affects sound takes hold without losing your place. */
  function rearmPlayback() {
    var playing = MG.player.playing, paused = MG.player.paused;
    if (!current || !scope || !(playing || paused)) return;
    var events = scopeEvents(scope.from, scope.to);
    var at = 0;
    for (var i = 0; litMark && i < events.length; i++) {
      if (events[i].mark.e === litMark.e && events[i].mark.n === litMark.n) {
        at = events[i].t;
        break;
      }
    }
    MG.player.loop = el.loop.checked;
    if (playing) MG.player.play(events, handlers, at);
    else MG.player.load(events, handlers, at);
    syncTransport();
  }

  /* The speed trainer: one nudge per time round the loop, up to the slider's
     own ceiling. */
  function advanceTrainer() {
    var step = +el.trainer.value;
    if (!step) return;
    var next = Math.min(+el.tempo.max, +el.tempo.value + step);
    if (next === +el.tempo.value) return;
    el.tempo.value = next;
    el.tempoOut.textContent = next;
    applyTempo();
  }

  /* ---- settings: the URL hash, and what you used last ------------------ */
  /* Everything in the panel is one query string. It lives in the location
     hash so a setup can be bookmarked or sent to someone, and in storage so
     the page reopens the way you left it. */
  var SELECTS = [
    ['root', 'root'], ['oct', 'octave'], ['scale', 'scale'], ['modes', 'modes'],
    ['range', 'octaves'], ['dir', 'direction'], ['clef', 'clef'], ['note', 'npb'],
    ['cycle', 'cycle'], ['count', 'countin']
  ];
  var RANGES = [
    ['degrees', 'modecount'], ['keys', 'keycount'], ['bpm', 'tempo'], ['train', 'trainer']
  ];
  var CHECKS = [
    ['keysig', 'keysig'], ['tonic', 'tonic'], ['loop', 'loop'], ['click', 'metronome']
  ];

  function serialize() {
    var q = [];
    SELECTS.concat(RANGES).forEach(function (f) {
      q.push(f[0] + '=' + encodeURIComponent(el[f[1]].value));
    });
    CHECKS.forEach(function (f) { q.push(f[0] + '=' + (el[f[1]].checked ? '1' : '0')); });
    var pats = [];
    el.patterns.querySelectorAll('input:checked').forEach(function (cb) { pats.push(cb.value); });
    q.push('p=' + pats.join(','));
    return q.join('&');
  }

  function readSettings(str) {
    var q = {};
    String(str || '').replace(/^#/, '').split('&').forEach(function (pair) {
      if (!pair) return;
      var i = pair.indexOf('=');
      if (i > 0) q[pair.slice(0, i)] = decodeURIComponent(pair.slice(i + 1));
    });
    return q;
  }

  /* Anything unrecognised is ignored rather than trusted - the string may
     have come from someone else's link, or from an older version. */
  function applySettings(q) {
    SELECTS.forEach(function (f) {
      var sel = el[f[1]], v = q[f[0]];
      if (v === undefined) return;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === v) { sel.value = v; return; }
      }
    });
    RANGES.forEach(function (f) {
      var input = el[f[1]], v = parseFloat(q[f[0]]);
      if (isNaN(v)) return;
      input.value = Math.min(Math.max(v, +input.min), +input.max);
    });
    CHECKS.forEach(function (f) {
      if (q[f[0]] !== undefined) el[f[1]].checked = q[f[0]] === '1';
    });
    if (q.p !== undefined) {
      var wanted = q.p ? q.p.split(',') : [];
      el.patterns.querySelectorAll('input').forEach(function (cb) {
        cb.checked = wanted.indexOf(cb.value) >= 0;
      });
    }
    MG.player.loop = el.loop.checked;
    applyPractice();
    el.tempoOut.textContent = el.tempo.value;
    el.keycountOut.textContent = el.keycount.value;
    el.keycountField.hidden = el.cycle.value === 'single';
  }

  /* Which groups are folded away is this browser's business, not part of a
     setup someone shares, so it is kept out of the link. */
  function sectionEls() { return el.panel.querySelectorAll('[data-section]'); }

  function saveSections() {
    var shut = [];
    sectionEls().forEach(function (d) {
      if (!d.open) shut.push(d.getAttribute('data-section'));
    });
    try { window.localStorage.setItem(SECTION_KEY, shut.join(',')); } catch (e) { /* private mode */ }
  }

  function restoreSections() {
    var raw = null;
    try { raw = window.localStorage.getItem(SECTION_KEY); } catch (e) { raw = null; }
    if (raw === null) return;
    var shut = raw ? raw.split(',') : [];
    sectionEls().forEach(function (d) {
      d.open = shut.indexOf(d.getAttribute('data-section')) < 0;
    });
  }

  function restoreSettings() {
    var stored = null;
    try { stored = window.localStorage.getItem(STORE_KEY); } catch (e) { stored = null; }
    // A link someone opened beats whatever this browser used last.
    var str = location.hash.length > 1 ? location.hash : stored;
    if (str) applySettings(readSettings(str));
  }

  var saveTimer = null;
  function storeSettings() {
    try { window.localStorage.setItem(STORE_KEY, serialize()); } catch (e) { /* private mode */ }
  }

  /* Storage remembers the setup; the hash is only written once something is
     actually changed, so a first visit keeps the clean URL it arrived on. */
  function saveSettings() {
    storeSettings();
    try {
      history.replaceState(null, '', location.pathname + location.search + '#' + serialize());
    } catch (e) { /* file:// in some browsers */ }
  }

  function shareLink() {
    saveSettings();
    var url = location.href.split('#')[0] + '#' + serialize();
    function done() {
      var label = el.link.querySelector('.lbl-full');
      var short = el.link.querySelector('.lbl-short');
      label.textContent = 'Copied';
      short.textContent = 'Copied';
      setTimeout(function () {
        label.textContent = 'Copy link';
        short.textContent = 'Link';
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
      return;
    }
    prompt('Copy this link:', url);
  }

  /* ---- applying changes as they are made ------------------------------- */
  /* How many exercises the current settings would produce, without building
     any of them. */
  function plannedCount() {
    var opts = readOpts();
    return opts.keys.length * unitsFor(opts, opts.root).length * opts.patterns.length;
  }

  function markStale(count) {
    el.generate.textContent = 'Generate ' + count + ' exercises';
    el.generate.classList.add('is-stale');
  }

  function clearStale() {
    el.generate.textContent = 'Generate';
    el.generate.classList.remove('is-stale');
  }

  var regenTimer = null;
  function scheduleRegen() {
    clearTimeout(regenTimer);
    regenTimer = setTimeout(function () {
      var count = plannedCount();
      // On a phone the controls sit in a drawer over the page, so there is
      // nothing to see: its own Generate button does the work instead.
      if (isNarrow() && document.body.classList.contains('panel-open')) {
        markStale(count);
        return;
      }
      if (count === 0 || count <= AUTO_MAX) generate();
      else markStale(count);
    }, 260);
  }

  /* One handler for the whole panel: save the setup, and either re-engrave
     or, for tempo, just retime. */
  var tempoTimer = null;
  function onControlChange(ev) {
    // The filter only changes which rows you can see.
    if (ev.target === el.patternFilter) {
      filterPatterns();
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveSettings, 400);
    if (ev.target === el.tempo) {
      // Dragging fires input continuously; retiming once at the end is plenty.
      clearTimeout(tempoTimer);
      tempoTimer = setTimeout(applyTempo, 120);
      return;
    }
    // Nothing about the count-in, the click or the trainer is engraved.
    if (ev.target === el.countin || ev.target === el.metronome || ev.target === el.trainer) {
      applyPractice();
      rearmPlayback();
      return;
    }
    if (ev.target.type === 'checkbox' && ev.target.closest('.patterns')) filterPatterns();
    scheduleRegen();
  }

  /* ---- setup drawer (phones) ------------------------------------------- */
  /* At narrow widths the control panel slides over the page instead of
     standing between the reader and the music. */
  function isNarrow() { return window.matchMedia(NARROW).matches; }

  function setPanel(open) {
    document.body.classList.toggle('panel-open', open);
    el.scrim.hidden = !open;
    el.panelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* Generating from the drawer closes it and puts the transport on screen,
     so the exercises you just asked for are the next thing you see. */
  function generateAndShow() {
    generate();
    setPanel(false);
    if (isNarrow()) {
      document.querySelector('.toolbar').scrollIntoView({ block: 'start' });
    }
  }

  /* ---- events ---------------------------------------------------------- */
  function bind() {
    el.panelBtn.addEventListener('click', function () {
      setPanel(!document.body.classList.contains('panel-open'));
    });
    el.panelClose.addEventListener('click', function () { setPanel(false); });
    el.scrim.addEventListener('click', function () { setPanel(false); });
    el.panelGenerate.addEventListener('click', generateAndShow);
    el.generate.addEventListener('click', generateAndShow);
    el.play.addEventListener('click', togglePlay);
    el.stop.addEventListener('click', stopPlayback);
    el.loop.addEventListener('change', function () {
      MG.player.loop = el.loop.checked;
      applyPractice();
      saveSettings();
    });
    el.print.addEventListener('click', function () { window.print(); });
    el.midi.addEventListener('click', function () {
      if (!current) generate();
      if (!current) return;
      var opts = current.opts;
      downloadMidi(opts, current.entries.map(function (e) { return e.ex; }),
        opts.root.name + '-' + opts.scale.id + '-exercises.mid');
    });

    el.link.addEventListener('click', shareLink);
    // The toggle event does not bubble, so it is bound per group.
    sectionEls().forEach(function (d) {
      d.addEventListener('toggle', saveSections);
    });
    // The pattern list is inside the panel, so one delegated pair covers it.
    el.panel.addEventListener('change', onControlChange);
    el.panel.addEventListener('input', onControlChange);

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
        rows.forEach(function (row) {
          // All and None work on the rows the filter is showing, so you can
          // type "arp" and take the lot; Basics is the preset, so it is global.
          if (mode === 'basic') row.box.checked = BASIC.indexOf(row.box.value) >= 0;
          else if (!row.label.hidden) row.box.checked = mode === 'all';
        });
        // Setting .checked in script fires no event, so say so ourselves.
        filterPatterns();
        saveSettings();
        scheduleRegen();
      });
    });

    // Re-engrave on resize so systems stay justified to the window. Width
    // only: a phone fires resize every time its URL bar slides away, and
    // re-engraving the whole set for that is wasted work.
    var t = null, lastWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (!current || window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      if (!isNarrow()) setPanel(false);
      clearTimeout(t);
      t = setTimeout(function () {
        var wasPlaying = MG.player.playing, wasPaused = MG.player.paused;
        var at = MG.player.now(), keep = scope;
        MG.player.stop();
        clearHighlight();
        current.entries = render(current.opts, current.entries.map(function (e) { return e.ex; }));
        current.events = timeline(current.opts, current.entries);
        // The sheets are new elements, so the range is reloaded onto them -
        // still at the note it was on before the re-engrave.
        scope = keep;
        if (scope && (wasPlaying || wasPaused)) {
          MG.player.loop = el.loop.checked;
          var events = scopeEvents(scope.from, scope.to);
          if (wasPlaying) MG.player.play(events, handlers, at);
          else MG.player.load(events, handlers, at);
        }
        syncTransport();
      }, 220);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && e.target === el.patternFilter && el.patternFilter.value) {
        el.patternFilter.value = '';
        filterPatterns();
        return;
      }
      if (e.key === 'Escape' && document.body.classList.contains('panel-open')) {
        setPanel(false);
        return;
      }
      var tag = e.target.tagName;
      // 'A' too, so space on the focused Ko-fi link doesn't start playback,
      // and 'SUMMARY' so it folds that group away instead.
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' ||
          tag === 'A' || tag === 'SUMMARY') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.key === 'g' || e.key === 'G') generate();
    });
  }

  fillControls();
  restoreSections();
  restoreSettings();
  storeSettings();      // a setup you opened is one you used
  applyPractice();
  filterPatterns();
  showSpelling();
  syncModes();
  bind();
  generate();
})();
