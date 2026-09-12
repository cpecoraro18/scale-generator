/* midi.js - a minimal Standard MIDI File (format 0) writer.
   No dependencies: builds the byte array by hand and hands back a Blob. */
(function () {
  'use strict';
  var MG = (window.MG = window.MG || {});
  var PPQ = 480;

  function varLen(n) {
    var buf = [n & 0x7f];
    n >>= 7;
    while (n > 0) { buf.unshift((n & 0x7f) | 0x80); n >>= 7; }
    return buf;
  }
  function str(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0x7f);
    return out;
  }
  function u32(n) { return [(n >> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function u16(n) { return [(n >> 8) & 255, n & 255]; }

  /* events: [{ tick, data:[...] }] - sorted, then delta-encoded. */
  function track(events) {
    events.sort(function (a, b) { return a.tick - b.tick || a.order - b.order; });
    var bytes = [], last = 0;
    for (var i = 0; i < events.length; i++) {
      bytes = bytes.concat(varLen(events[i].tick - last), events[i].data);
      last = events[i].tick;
    }
    bytes = bytes.concat([0x00, 0xff, 0x2f, 0x00]);
    return [].concat(str('MTrk'), u32(bytes.length), bytes);
  }

  /* sections: [{ name, notes:[{midi}], ticksPerNote }] laid end to end. */
  MG.buildMidi = function (opts) {
    var events = [], order = 0, tick = 0;
    function ev(t, data) { events.push({ tick: t, order: order++, data: data }); }

    var usPerQuarter = Math.round(60000000 / opts.tempo);
    ev(0, [0xff, 0x51, 0x03, (usPerQuarter >> 16) & 255, (usPerQuarter >> 8) & 255, usPerQuarter & 255]);
    ev(0, [0xff, 0x58, 0x04, opts.beatsPerBar || 4, 2, 24, 8]);
    ev(0, [0xff, 0x03].concat(varLen(opts.title.length), str(opts.title)));
    ev(0, [0xc0, opts.program === undefined ? 0 : opts.program]);

    var vel = opts.velocity || 88;
    var barTicks = PPQ * (opts.beatsPerBar || 4);

    opts.sections.forEach(function (sec, si) {
      if (si > 0) tick += barTicks;                        // one bar of air between exercises
      ev(tick, [0xff, 0x06].concat(varLen(sec.name.length), str(sec.name)));
      var dur = sec.ticksPerNote;
      sec.notes.forEach(function (n) {
        var gate = Math.max(1, Math.round(dur * 0.92));
        ev(tick, [0x90, n.midi & 127, vel]);
        ev(tick + gate, [0x80, n.midi & 127, 0x40]);
        tick += dur;
      });
      tick = Math.ceil(tick / barTicks) * barTicks;        // land on a bar line
    });

    var bytes = [].concat(
      str('MThd'), u32(6), u16(0), u16(1), u16(PPQ),
      track(events)
    );
    return new Uint8Array(bytes);
  };

  MG.PPQ = PPQ;

  MG.downloadBlob = function (data, filename, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
})();
