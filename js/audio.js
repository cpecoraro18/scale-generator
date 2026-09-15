/* audio.js - Web Audio playback for the generated exercises.
   A small two-oscillator voice is plenty for checking a pattern by ear.

   Playback is a timeline of events plus a position within it: pausing keeps
   the position, so resuming, seeking to a note, or replaying a single
   exercise never means starting the whole set over. */
(function () {
  'use strict';
  var MG = (window.MG = window.MG || {});

  var actx = null, master = null, timer = null;
  var voices = [];
  var TAIL = 0.2;      // silence kept after the last note before we call it done
  var LEAD = 0.12;     // scheduling head start

  // events are [{ midi, t, d, mark }] with t/d in seconds, t from the start
  // of whatever range is loaded.
  var state = { events: [], handlers: null, t0: 0, duration: 0, at: -1 };

  function ctx() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
      master = actx.createGain();
      master.gain.value = 0.8;
      master.connect(actx.destination);
    }
    return actx;
  }

  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  function schedule(midi, at, dur) {
    var a = ctx();
    var g = a.createGain();
    var peak = 0.22;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
    g.gain.exponentialRampToValueAtTime(peak * 0.55, at + Math.min(0.12, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    g.connect(master);

    var o1 = a.createOscillator(), o2 = a.createOscillator();
    o1.type = 'triangle';
    o2.type = 'sine';
    o1.frequency.value = hz(midi);
    o2.frequency.value = hz(midi + 12);
    var g2 = a.createGain();
    g2.gain.value = 0.25;
    o2.connect(g2); g2.connect(g);
    o1.connect(g);
    o1.start(at); o2.start(at);
    o1.stop(at + dur + 0.05); o2.stop(at + dur + 0.05);
    voices.push(o1, o2);
  }

  function silence() {
    voices.forEach(function (v) { try { v.stop(); } catch (e) { /* already stopped */ } });
    voices = [];
  }

  function clearTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* Index of the event sounding at `time`, or -1 before the first one. */
  function indexAt(time) {
    var evs = state.events, i = -1;
    for (var k = 0; k < evs.length; k++) {
      if (evs[k].t <= time + 1e-6) i = k; else break;
    }
    return i;
  }

  function notify(i) {
    if (i === state.at) return;
    state.at = i;
    var h = state.handlers;
    if (h && h.onNote) h.onNote(i >= 0 ? state.events[i].mark : null);
  }

  /* Sound the loaded events from `offset` seconds in. */
  function startAt(offset) {
    var a = ctx();
    if (a.state === 'suspended') a.resume();
    silence();
    clearTimer();

    var p = MG.player;
    state.t0 = a.currentTime + LEAD - offset;
    state.at = -1;
    state.events.forEach(function (e) {
      // A note we are already in the middle of is not restarted; seeks land
      // on note starts, so this only trims the note that was cut by a pause.
      if (e.t < offset - 1e-6) return;
      schedule(e.midi, state.t0 + e.t, Math.max(0.05, e.d * 0.9));
    });

    p.playing = true;
    p.paused = false;
    notify(indexAt(offset));

    timer = setInterval(function () {
      var now = a.currentTime - state.t0;
      notify(indexAt(now));
      if (now >= state.duration + TAIL) {
        if (p.loop) {
          startAt(0);
          var h = state.handlers;
          if (h && h.onLoop) h.onLoop();
        } else {
          p.stop();
          var hh = state.handlers;
          if (hh && hh.onEnd) hh.onEnd();
        }
      }
    }, 20);
  }

  MG.player = {
    playing: false,
    paused: false,
    loop: false,

    /* Put a range on the transport parked at `offset`, without sounding it.
       handlers: { onNote, onEnd, onPause, onLoop } */
    load: function (events, handlers, offset) {
      this.stop();
      state.events = events || [];
      state.handlers = handlers || null;
      state.duration = state.events.reduce(function (m, e) {
        return Math.max(m, e.t + e.d);
      }, 0);
      this.position = Math.max(0, Math.min(offset || 0, state.duration));
      this.paused = state.events.length > 0;
    },

    /* play(events, handlers, offset) - offset defaults to the start. */
    play: function (events, handlers, offset) {
      this.load(events, handlers, offset);
      startAt(this.position);
    },

    /* Stop the sound but keep the place, snapped to the start of the note
       that was sounding so resuming picks that note up whole. */
    pause: function () {
      if (!this.playing) return;
      var now = actx ? actx.currentTime - state.t0 : 0;
      var i = indexAt(now);
      this.position = i >= 0 ? state.events[i].t : 0;
      silence();
      clearTimer();
      this.playing = false;
      this.paused = true;
      var h = state.handlers;
      if (h && h.onPause) h.onPause();
    },

    resume: function () {
      if (this.playing || !state.events.length) return;
      startAt(this.position || 0);
    },

    /* Jump to `time` seconds into the loaded range, playing from there. */
    seek: function (time) {
      if (!state.events.length) return;
      this.position = Math.max(0, Math.min(time, state.duration));
      startAt(this.position);
    },

    /* Seconds into the loaded range, live while playing. */
    now: function () {
      if (this.playing && actx) return Math.max(0, actx.currentTime - state.t0);
      return this.position || 0;
    },

    stop: function () {
      silence();
      clearTimer();
      this.playing = false;
      this.paused = false;
      this.position = 0;
      state.at = -1;
    }
  };
  MG.player.position = 0;
})();
