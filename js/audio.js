/* audio.js - Web Audio playback for the generated exercises.
   A small two-oscillator voice is plenty for checking a pattern by ear. */
(function () {
  'use strict';
  var MG = (window.MG = window.MG || {});

  var actx = null, master = null, timer = null, stopAt = 0;
  var voices = [];

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

  /* events: [{ midi, t, d, mark }] with t/d in seconds. */
  MG.player = {
    playing: false,

    play: function (events, handlers) {
      this.stop();
      var a = ctx();
      if (a.state === 'suspended') a.resume();
      var t0 = a.currentTime + 0.12;
      var end = 0;
      events.forEach(function (e) {
        schedule(e.midi, t0 + e.t, Math.max(0.05, e.d * 0.9));
        end = Math.max(end, e.t + e.d);
      });
      stopAt = t0 + end + 0.2;
      this.playing = true;

      var at = -1, self = this;
      timer = setInterval(function () {
        var now = a.currentTime - t0;
        var i = -1;
        for (var k = 0; k < events.length; k++) {
          if (events[k].t <= now) i = k; else break;
        }
        if (i !== at) {
          at = i;
          if (handlers && handlers.onNote) handlers.onNote(i >= 0 ? events[i].mark : null);
        }
        if (a.currentTime >= stopAt) {
          self.stop();
          if (handlers && handlers.onEnd) handlers.onEnd();
        }
      }, 20);
    },

    stop: function () {
      if (timer) { clearInterval(timer); timer = null; }
      voices.forEach(function (v) { try { v.stop(); } catch (e) { /* already stopped */ } });
      voices = [];
      this.playing = false;
    }
  };
})();
