# Scale Workshop

Pick a scale, get practice patterns back as engraved sheet music, playable audio,
and downloadable MIDI. No build step, no server, no network: **double-click
`index.html`**.

## What it does

Choose a root and a scale, tick the patterns you want, hit **Generate**. Each
pattern becomes its own exercise, engraved on screen and exportable.

- **38 scales** — major and its modes, harmonic/melodic minor and their modes,
  pentatonics, blues, bebop scales, symmetric scales (whole tone, both
  diminished, augmented, chromatic), plus Hungarian minor, Neapolitans, double
  harmonic, hirajoshi, kumoi, in-sen.
- **30 patterns** — straight scale; broken 3rds/4ths/5ths/6ths/7ths/octaves;
  groupings (1-2-3-4, 1-2-3-5, 1-3-2-4, turns, five-in-a-row, zig-zags);
  arpeggios from triads through sevenths to the extensions — 9ths, 11ths and
  13ths, stacked thirds on every scale degree; chromatic approach notes and
  enclosures; expanding intervals, tonic pedal, and random permutations.
  A filter box narrows the list by name, description or group — every term has
  to match, so `bebop` or `arp 13` gets you there — and **All** and **None**
  then act on what the filter is showing. Anything ticked but filtered out of
  sight is counted under the box rather than silently dropped.
- **Modes** — run the chosen scale from every one of its scale degrees, either
  *same notes, root up each degree* (C major → C ionian, D dorian, E phrygian …)
  or *same root throughout* (C ionian, C dorian, C phrygian …); pick how many
  degrees. Works on any scale, not just the major one — harmonic minor gives
  Locrian ♮6, Ionian ♯5, Dorian ♯4, Phrygian dominant, Lydian ♯2, altered
  diminished. Combines with key cycles, so you can take all seven modes round
  all twelve keys.
- **Key cycles** — run the same exercise through the cycle of fourths or fifths,
  half steps, whole steps, minor or major thirds; pick how many keys.
- **Range and rhythm** — 1–3 octaves, up / down / up-and-down, treble or bass
  clef (auto-picked from the range), quarters through sextuplets, 40–240 bpm.
  A pattern taller than the range you picked gets the room it needs — a 13th
  arpeggio is two octaves tall however you set the slider — and each sheet says
  the range it actually used.
- **Live controls** — changing anything in the panel re-engraves straight away.
  The tempo slider is live in a stronger sense: it retimes playback and the bpm
  captions without redrawing a note, and if something is playing it carries on
  from the note it was on. Past 48 exercises the set is too slow to rebuild on
  every keystroke, so **Generate** says how many it would make and waits to be
  pressed.
- **Setups are kept** — everything in the panel lives in the URL hash, so
  **Copy link** hands someone the exact setup, and the page reopens with
  whatever you had last. A link beats stored settings, and anything
  unrecognised in one is ignored.
- **Practice room** — a count-in of one or two bars, a metronome click on every
  beat (accented on the downbeat), and a speed trainer that winds the tempo up
  by a few bpm every time the loop comes round, as far as 240. None of the
  three redraws a note; they take hold on the spot, where the playhead is.
- **Playback** — play the whole set with note-by-note highlighting, or hit the
  ▶ on a single sheet to practise that exercise alone. Pause and resume pick up
  on the note you stopped on, clicking any note starts from there, and **Loop**
  repeats whatever is playing — the set or the one exercise.
- **Output** — download MIDI (all exercises in one file, or one at a time),
  save any sheet as SVG, or print to PDF for a paper practice sheet.

- **On a phone** — the controls live in a drawer behind **Setup**, so the music
  is the first thing on screen rather than 2,500px below the panel. Staves are
  engraved to the width you actually have (fewer bars per line, no sideways
  scrolling), and the play controls stay pinned to the top as you scroll.

Each panel section folds away by its heading, and which ones you folded is
remembered for next time (kept out of shared links, being your layout rather
than part of the setup).

Keyboard: `space` plays/pauses, `g` regenerates, `esc` closes the drawer.

If it saves you some practice-room time, there is a
[Ko-fi](https://ko-fi.com/chrispecoraro) link in the top bar.

Live at [scales.chrispecmusic.com](https://scales.chrispecmusic.com/), which is
where the canonical URL, sitemap and link-preview card all point. Change the
domain in `CNAME` and those four places in `index.html`, `robots.txt` and
`sitemap.xml` need to follow.

## Notation details

Notes are spelled properly rather than by pitch class: each scale carries the
diatonic degree each note sits on, so E♭ major is `Eb F G Ab Bb C D` and the C
altered scale is `C Db Eb Fb Gb Ab Bb` — not a bag of sharps. Symmetric scales,
which don't fit seven letter names, fall back to plain sharps or flats matching
the root instead of piling up double accidentals.

Key signatures are used where the scale has one (major- and minor-flavoured
scales); for blues, bebop, and symmetric scales the music is written in C with
accidentals spelled out, which is how these are normally engraved. You can turn
key signatures off entirely.

Modes are spelled out of their parent scale rather than re-derived, so mode 3
of E♭ major is `G Ab Bb C D Eb F G` — G phrygian, not a respelling of it — and
the relative modes all share the parent's key signature, so D dorian out of C
major is written with no accidentals at all. A rotation that matches a scale
already in the library borrows its name; the rest are titled "<scale> mode N".
Symmetric scales rotate onto themselves, so asking for the parallel modes of
whole tone gives one exercise rather than six copies.

## Files

```
index.html        markup and control panel
favicon.svg       tab icon: a metronome
favicon.ico       same icon at 16/32/48px, for browsers without SVG favicons
apple-touch-icon.png  180px icon for iOS home screens
og-image.png      1200x630 link preview card, engraved by the app itself
robots.txt        crawling rules, points at the sitemap
sitemap.xml       the one page there is
css/app.css       styling, including the print stylesheet
js/theory.js      note spelling, scale library, modes, key signatures, key cycles
js/patterns.js    the pattern engine (cells walked up an indexed scale ladder)
js/notation.js    VexFlow engraving: bars, systems, beams, tuplets, accidentals
js/midi.js        standard MIDI file writer (format 0), written by hand
js/audio.js       Web Audio playback
js/app.js         UI wiring
vendor/vexflow.js VexFlow 4.2.3, vendored so the app works offline
                  (its MIT notice sits beside it, in VEXFLOW-LICENSE.txt)
LICENSE           MIT, for everything above
```

## Adding a pattern

A pattern is usually a *cell* of scale-step offsets repeated up the scale. In
`js/patterns.js`:

```js
P('g1235', 'Digital pattern 1-2-3-5', 'Groupings',
  'Classic bebop cell.', cellPattern([0, 1, 2, 4]), 4),
```

`[0, 1, 2, 4]` means degrees 1-2-3-5 relative to each starting step; the engine
handles octaves, direction (descending mirrors the cell), and range. Stacked
thirds are just wider cells — `[0, 2, 4, 6, 8, 10, 12]` is a 13th arpeggio —
and a cell taller than the chosen range grows the range to whole octaves that
fit it, so it always has somewhere to sit. For anything that leaves the scale —
chromatic approaches, enclosures — a generator function returns
`{ i: index, semi: -1 }` steps instead.

## Adding a scale

```js
S('lydianDom', 'Lydian dominant', 'Melodic minor modes',
  [0, 2, 4, 6, 7, 9, 10], [0, 1, 2, 3, 4, 5, 6], null),
```

Semitones from the root, then the letter-degree each note is spelled on, then
`'major'` / `'minor'` / `null` for the key signature to use.

## License

MIT — see [LICENSE](LICENSE). Copyright (c) 2026 Chris Pecoraro.

`vendor/vexflow.js` is a vendored, unmodified copy of
[VexFlow](https://github.com/0xfe/vexflow) 4.2.3, which is separately MIT
licensed — Copyright (c) Mohit Muthanna Cheppudira 2010. Its notice is kept
alongside it in [vendor/VEXFLOW-LICENSE.txt](vendor/VEXFLOW-LICENSE.txt) and
must stay with any copy you redistribute.
