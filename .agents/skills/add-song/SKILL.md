---
name: add-song
description: Import a song into the karaoke library end-to-end from a Spotify URL, ID, or title. Use whenever the user says "add this song", "/add-song", "import song", or hands you a Spotify track link. Handles metadata, lyrics, role tagging via Genius, stem import from ~/Downloads, YouTube music-video lookup, per-song vocal effects, and per-syllable timing in one autonomous pass.
---

# Add Song

End-to-end song import. The user has already stem-separated the track via vocalremover.org and dropped two files in `~/Downloads` with marker tags in the filenames:

- One file with `[music]` in the name — the instrumental
- One file with `[lead_vocal]` in the name — the lead vocal (sometimes mixed with backup vocals; doesn't matter)

You take a Spotify URL / ID / title (the user's argument) and do everything else.

## Operate autonomously

Run end-to-end without stopping for user confirmation. Only stop if:
- `import-song.js` exits non-zero with an unrecoverable error (missing stems, bad track ID, network failure).
- The Genius lookup returns 0 hits across two attempts.

Otherwise, complete every step and report a single summary at the end.

## Workflow

### Step 1 — Mechanical import

Run:
```
node packages/desktop/scripts/import-song.js "<user-argument>" --apply
```

The script writes diagnostic output to **stderr** and a JSON summary to **stdout**. Parse the JSON. Key fields:

- `trackId`, `name`, `primaryArtist`, `artists[]`, `albumName`, `durationMs`
- `key`, `mode`, `tempo`
- `lyricCount`, `hasSyllables`, `lyricsSource` (one of `netease-yrc`, `netease-line`, `none`, `preserved-existing`)
- `metaPath`, `songDir`
- `youtubeUrl` (or null)
- `geniusPageHint` (best-guess Genius URL slug)
- `deCensor` — `{ linesProcessed, syllablesRestored, linesUnmatched }` or null. NetEase asterisk-style censorship that LRCLIB couldn't fully fix.
- `suspiciousLines[]` — lines where NetEase text disagrees with LRCLIB on non-censorship tokens. Each entry: `{ index, time, netease, lrclib, jaccard, kind }`. **`kind: 'silent-swap'` means NetEase silently replaced an explicit word with an innocuous one** (no `*` visible). `kind: 'partial-censor'` means asterisks remain after de-censor. Treat both as "needs human/agent verification."

If the script exits non-zero, surface the error and stop.

If `lyricCount === 0`, note it in the report — the song imports without lyrics. Skip step 2 and step 2b (no lyrics to tag) but still do step 3 (effects on the default role).

### Step 1b — Key / mode / tempo (always fill in)

Spotify's `/v1/audio-features` endpoint **permanently returns 403** for new client-credential apps as of late 2024. The script logs the failure as a warning and leaves `key`, `mode`, and `tempo` as null in the summary. You **must** fill these in — the audio engine reads them from every `voiceEffects[]` entry and they drive scale-aware autotune. Leaving them as placeholders (-1 / 1 / 120) silently breaks pitch correction for the song.

This step is **mandatory** whenever the summary shows `key: null` or `tempo: null` (which will be every import until the project switches to user-auth Spotify).

1. **WebSearch for the data.** Query: `"<song name>" <artist> BPM key tempo`. The first-page snippets from SongBPM, Tunebat, MusicGateway, SongData.io, or Musicstax almost always contain `<NUMBER> BPM` and a `<NOTE> Major/Minor` string. If the snippet shows multiple disagreeing values, prefer (in this order): a YouTube bass-cover/drums-only video title (these are usually correct because the uploader analyzed the audio), SongBPM, Tunebat. A Wikipedia article for popular songs is also authoritative when present.

2. **Convert the key name to a numeric value.** Use this exact mapping (the audio engine matches Spotify's 0-11 pitch-class convention):

    | Note | # |  | Note | # |
    |---|---|---|---|---|
    | C  | 0 |  | F♯ / G♭ | 6 |
    | C♯ / D♭ | 1 |  | G  | 7 |
    | D  | 2 |  | G♯ / A♭ | 8 |
    | D♯ / E♭ | 3 |  | A  | 9 |
    | E  | 4 |  | A♯ / B♭ | 10 |
    | F  | 5 |  | B  | 11 |

    `mode`: major = `1`, minor = `0`. **Round BPM to the nearest integer** — most sources give a whole number anyway.

3. **Patch meta.json in two places.** Use Read+Edit:
   - `spotifyData.key`, `spotifyData.mode`, `spotifyData.tempo` — catalog metadata the admin UI reads (the field is named `spotifyData` for legacy reasons but holds the values from any source).
   - `voiceEffects[i].key`, `voiceEffects[i].mode`, `voiceEffects[i].tempo` for **every** role (i.e. every entry in the array). These are what the audio engine reads at playback time. They must all match.

4. **Report the values and source** in the final summary. Don't just write the number — include where you got it so the user can sanity-check.

5. **If WebSearch returns nothing reliable** (some obscure tracks, live versions, or pre-release leaks have no online analysis), leave the placeholders but explicitly note "key/BPM unknown — no reliable source found" in the final report. Don't silently ship `-1 / 120` as if they were real.

Do NOT use the AdminPage UI to enter these — they should be in meta.json before the user opens the app.

### Step 2 — Role tagging via Genius (Genius is the canonical source)

Goal: replace the single-role `roles: [primaryArtist]` with the full credited vocalist list, and update each lyric line's `roleIndex` to the singer of that section.

1. **Fetch the Genius page.** Use WebFetch on the `geniusPageHint` URL from step 1's summary. If it 404s or returns the Genius homepage, run a web search for `site:genius.com "<song name>" "<primary artist>"` and pick the top genius.com result.

2. **Read the lyrics with section markers.** Ask the WebFetch prompt for: the ordered list of section headers (`[Verse 1: Drake]`, `[Chorus: Future]`, `[Pre-Hook: Travis Scott & Future]`, etc.) and the lyric text under each. Section headers without a colon (`[Chorus]`, `[Intro]`) usually mean "all credited vocalists sing together" → use roleIndex `-1`.

3. **Build the roles array.** Take every unique vocalist named in any section header, in the order they first appear. The primary artist should be index 0 unless Genius lists them later. Preserve the artist's exact name from Genius (Genius is usually correct — e.g., "Lil Wayne", "JAY-Z" with the dash, "The Weeknd"). If a song has only one vocalist, leave roles as `[primaryArtist]`.

4. **Tag each lyric line.** Read `meta.lyrics[]`. For each line:
    - Find the Genius section it belongs to by text similarity (each line's `words` should appear in or near the section's lyric text).
    - Set `roleIndex` to that section's vocalist index in your new `roles[]` array.
    - If the section header has no colon (no specific singer) → `roleIndex: -1`.
    - If a line has multiple credited singers in the header (`[Verse: Drake & Future]`), pick the most appropriate one based on lyric content; if unclear, set `-1`.
    - If you can't match a line to any section, leave its current `roleIndex` (0 by default).

5. **Re-balance `voiceEffects[]`.** The script wrote one default effect entry. Grow the array so `voiceEffects.length === roles.length`. For each new entry, clone the original and update nothing yet — step 3 fills them in.

6. **Write meta.json.** Read the file at `metaPath`, apply updates, write back as pretty JSON (2-space indent). Use the Read+Edit tools, not raw shell — the file is fragile JSON.

### Step 2b — Lyric text verification (Genius wins)

**Genius is the source of truth for lyric TEXT.** NetEase is the source of truth for syllable TIMING. LRCLIB is a useful fallback. When they disagree on what a line says, Genius wins.

NetEase does two kinds of censorship — the import script handles one of them automatically (asterisk substitution, via LRCLIB) but the other (silent word replacement, where an explicit word is swapped for an innocuous one with no `*` to flag it) can only be caught by comparing against an uncensored source. The script's `suspiciousLines[]` flags both kinds for review.

Do this step **whether or not `suspiciousLines` is empty** — Genius can also have content the script missed entirely (slang misheard by NetEase, ad-libs cut, names misspelled). Spot-check at least 8-10 lyric lines against Genius.

1. **You already have Genius open** from step 2. Skim through the section text again and compare to `meta.lyrics[]`. For each line in the script summary's `suspiciousLines[]`, OR any line that looks wrong on inspection:
    - If Genius has a different word/phrase than what's in `meta.lyrics[i].words` — Genius wins. Use the Read+Edit tools to patch that exact line's `words` field.
    - If Genius's line has the **same word count** as the NetEase line, also patch each `syllables[k].text` to match Genius's word at position k (preserve `startMs` and `durMs`).
    - If Genius's line has a **different word count**, patch only the line's `words` field and **drop** the `syllables` array for that line. The renderer falls back to whole-line highlighting when syllables are absent — that's better than confidently mis-timed syllables.

2. **Asterisks left over from the de-censor pass.** If `meta.lyrics[i].words` still contains `*`, replace it with the Genius word using the same rules as above. The 4 edge cases the script can't fix on its own (multi-line splits, compound-word disagreements, extra leading words) usually land here.

3. **Spot-check the whole song lightly.** Read 5-6 lines from different verses and confirm they match Genius. NetEase silent swaps tend to cluster on the same word repeated through a verse, so if one looks wrong, look for repeats.

4. **What if Genius is blocked?** WebFetch is sometimes blocked on `genius.com`. If so, try in order:
    - WebSearch for `<artist> <song> lyrics genius` and read the snippet/cache result
    - WebSearch for the suspicious line text in quotes — the top hit often shows the surrounding Genius lyric block in the snippet
    - As a last resort, leave the line as-is and note in the final report which lines you couldn't verify

5. **Do NOT touch line-level `startTimeMs` / `endTimeMs`.** Those come from NetEase and align with the audio file. You're only changing `words` and (sometimes) `syllables`.

### Step 2c — Remove sample-only lines

NetEase and LRCLIB include EVERY vocal sound on a track, including **samples from other songs** that play behind the intro / hook / outro. For karaoke purposes those lines are noise — the credited vocalists aren't performing them, so the karaoke user shouldn't be cued to sing along. Drop them before they ship.

**How to recognize a sample line:**

Samples don't always wear parentheses. Some sampled hooks are sung straight (no parens), repeated 4-8 times across the song, and form the chorus — but **the credited artist is not performing them**. Use multiple signals.

1. **Repeated text across many lines** — parenthetical OR not. When the same line (or near-identical phrasing) appears 4+ times, especially in the intro/outro/hook positions, it's almost certainly a sample loop.
   - Caught on `$ex Appeal`: `(Play with me, play with me)` × 8 intro lines — Too $hort sample.
   - Caught on `HAZARD DUTY PAY!`: `"Sometimes we feel pain, ay, hey-ey"` × 7 (no parens) — The Winans / Anita Baker sample, not JPEGMAFIA.
2. **The phrasing doesn't match the credited artists' style or era.** A 1987 Oakland rap chant looped under a 2025 melodic-rap track, or a 60s gospel hook on a noise-rap track, is obviously a sample.
3. **Genius labels samples explicitly** — `[Sample: <Artist> – <Song>]` as a section header, or a "Samples" credit at the top of the page. When you see one, every line under that header is sample text.
4. **WhoSampled is the authoritative cross-check.** If you suspect a sample (or want to confirm one), WebSearch for `<artist> <song> sample whosampled` — WhoSampled lists every confirmed sample on a track with the source song. If a line in `meta.lyrics` is from a WhoSampled-confirmed source song, it's a sample. WhoSampled isn't blocked from WebFetch/WebSearch the way Genius often is.
   - Caught on `HAZARD DUTY PAY!`: WhoSampled confirmed "You think you know me" = Edge's WWE entrance theme (Jim Johnston), and "Sometimes we feel pain" = The Winans feat. Anita Baker. Both samples, neither sung by JPEGMAFIA.
5. **Pure-parenthetical lines** (the whole line is in parens, like `(Play with me, play with me)` with no other text) are nearly always either a sample or pure backing vocal — when in doubt, drop them.
6. **Sample placement clusters**: most samples sit at song boundaries (intro / outro) or repeat as the chorus/hook. JPEGMAFIA, Kanye, Travis, and most sample-heavy producers follow this pattern. If lines 0-N look stylistically detached from the verse content that follows, suspect a sample intro.

**Always check WhoSampled when the lyric file contains any line that looks unmistakably out of place** — different language, different era, different artist's signature phrase. One WhoSampled search per import is cheap and catches non-parenthetical samples that the other signals miss.

**What to remove vs keep:**

- **Pure sample line** (the whole `words` field is parenthetical sample text, no contribution from the credited vocalists) → **delete the line entirely** from `meta.lyrics`. Splice the array, don't leave it as an empty string.
- **Mixed line: sample + brief spoken interjection by a credited artist** (e.g. `(Play with me, pla-play with me) it's $hort Dog`) → **delete the line entirely**. The interjection is too short to be karaoke-meaningful without per-syllable timing, and the timing on the line covers the sample anyway, so the user would be cued to sing during the wrong portion.
- **Mixed line: sample + real sung lyric** (the credited artist's actual verse is on the same line as a backing sample, e.g. `(yeah) I'm in the mood, we in Miami`) → **keep the line, strip the parenthetical**. Patch `words` to remove only the sample fragment; preserve `startTimeMs` / `endTimeMs`. If syllables exist, drop the syllable entries whose `text` falls inside the parenthetical and renumber accordingly — or, if surgical syllable trimming feels risky, drop the whole `syllables` array for that line (the renderer falls back to line-level highlighting).
- **Backing vocals by a credited artist on the same record** (e.g. Drake's hook with himself doubled — "I want this shit forever (forever, mane)") → **keep**. That's the artist performing, just layered. Don't confuse this with sampling.

**Be conservative and intentional.** When in doubt about whether something is a sample, check the Genius page's section headers and any Samples credit. If you can't confirm, leave the line in — false positives (removing legit lyrics) are worse than false negatives (leaving a sample in).

**Report it.** In the final summary, include a line under Lyrics: `<N> sample lines removed: <description of the sample>` so the user knows what you cut and why.

### Step 3 — Per-song vocal effects

Open the project's `AGENTS.md` and read the section titled **"Per-Song Vocal Effect Customization"** in full. Follow that workflow inline for this one song (don't write a separate `packages/desktop/scripts/{artist}-per-song.js` — apply directly to `meta.json`).

Concretely:

1. **Confidence-assess every role.** For each name in `roles[]`, classify HIGH / MEDIUM / LOW based on whether you can name specific sonic features of how they sound on *this specific track*. Don't bluff.

2. **For HIGH-confidence roles**: write custom effects per the parameter guidance in AGENTS.md (signal chain order, chorus-after-autotune gotcha, the **doubler / thickener** guidance, reverb/delay/distortion knobs). Preserve `key`, `mode`, `tempo`, and `micLevel` from the existing entry — don't overwrite them. For stacked-vocal / autotune-heavy roles (Travis, T-Pain, Carti, Future, Kanye-808s, Uzi, Kesha, melodic-rap hooks) **set a tuned `doubler` block** — it's what produces the thick "vocal stack"; pick values from AGENTS.md's doubler vibe→value map. Leave it off for dry rap, big solo vocals, and classic rock.

3. **For MEDIUM-confidence roles**: write effects only if you can articulate a clear reason. Otherwise leave on default.

4. **For LOW-confidence roles**: leave the default voiceEffects entry untouched. Note it as LOW in your final report.

5. **Co-artists with their own canonical preset**: if `VocalPresets.ts` has a preset for this co-artist (and the track's mix matches their usual treatment), apply that preset's effects to their role rather than custom-tuning. Read `src/renderer/src/audio/VocalPresets.ts` for the list.

6. **Apply to meta.json.** Use Read+Edit to overwrite each `voiceEffects[i]` entry's effect blocks. Every block (`pitchCorrection`, `compressor`, `eq`, `chorus`, `delay`, `reverb`, `distortion`, `noiseGate`, `vocoder`, `doubler`) must be present — set `enabled: false` for any you want inert (the `doubler` is off by default; enable + tune it for stacked-vocal roles per step 2).

### Step 4 — Per-syllable timing

If step 1's summary said `hasSyllables === true`, skip this step.

Otherwise run:
```
node packages/desktop/scripts/upgrade-lyrics.js --trackId <trackId> --apply
```

Report whether it succeeded (it may exit with "no-match" or "no-yrc" — that's not a failure, just means NetEase doesn't have word-level timing for this track).

### Step 4b — Music-video URL (always verify, fall back if missing)

The script tries two ways to find the official music video: `yt-dlp` (if installed) → YouTube search-results HTML scrape. Both succeed for the vast majority of popular tracks. But for obscure songs, live versions, or songs whose top YouTube hit is a lyric video / fan upload, the script's first result may be wrong or empty.

Always verify the final `youtubeUrl`:

1. **If `youtubeUrl` is null in the script summary**: do a WebSearch for `<artist> <song> official music video site:youtube.com` and pick the top result that's a legitimate music-video URL (not a Topic auto-upload, not a fan lyric video unless that's all that exists). Patch `meta.youtubeUrl` via Read+Edit on meta.json.

2. **If `youtubeUrl` is set but looks suspicious** — e.g. it's a YouTube Shorts URL (`/shorts/`), a playlist, or the title in the song doesn't obviously match the URL's video — do the same WebSearch and replace if you find a better match. Confirm by fetching the video page briefly with WebFetch to read the title.

3. **For songs with no official music video**: the lyric video / official audio upload is fine. Just make sure the URL points to the actual song, not an unrelated track.

A YouTube URL **must always be set** unless the song genuinely has no presence on YouTube at all (rare). Don't end the run with `youtubeUrl: null` without trying WebSearch.

### Step 5 — Verify build

Run in parallel:
- `npx tsc --noEmit`
- `npx electron-vite build`

Both must pass. They don't actually touch the song catalog, but they catch any accidental damage if you edited a TS file by mistake.

### Step 6 — Final report

Print a concise summary to the user:

```
Imported: <artist(s)> — <name>
  trackId: <trackId>
  album:   <albumName> (<release year if known>)
  length:  <duration in mm:ss>
  key:     <KEY_NAME> <major|minor> @ <tempo> BPM  (source: <SongBPM/Tunebat/Wikipedia/etc>)
  genres:  <comma-separated>

  Roles (<N>):
    [0] <name>  — effects: <HIGH/MED/LOW> confidence  <one-line rationale>
    [1] ...

  Lyrics:    <N> lines, <syllable-status>
  Samples removed: <N> lines — <one-line description, or "none">
  Text verification: <N suspicious flagged> / <N fixed against Genius> / <N could not verify>
  YouTube:   <url or "not found">
  Stems:     ✓ instrumental.<ext>, ✓ vocals.<ext>

Open admin → search "<name>" to review.
```

Always include the **Text verification** line, even when there are 0 suspicious flags — the user wants to know you actually checked Genius and didn't just trust NetEase.

## When the import script reports a known failure mode

- **"VITE_SPOTIFY_CLIENT_ID not set"**: the user's `.env` is missing — surface this and stop.
- **"No stem ... whose filename matches"**: stems are selected by FILENAME now (the export must be named after the song), never by duration. The error lists the marker-tagged files it saw. If the user's export genuinely uses a different name (e.g. shortened), pass `--stem-name "<filename prefix>"` — do NOT rename random files to force a match.
- **"Stem pair mismatch"**: the `[music]` and `[lead_vocal]` files come from two different exports (different filename prefixes). One of them is a leftover from another song. Have the user clean Downloads or pin the right pair with `--stem-name`.
- **"Stem ... is Xs but ... is Ys (off by Zs)"**: the importer validates that the stem's audio length matches the Spotify track length, and refused because the name-matched file in `~/Downloads` has a *different* song's length (wrong-audio corruption twice hit the library this way). Tell the user to remove stale stems from Downloads and re-export THIS song's stems, then re-run. Only pass `--skip-duration-check` if the user confirms the file really is correct (a rare alternate-master/version difference) — never reflexively.
- **"byte-identical to the ... of ... already in the library"**: the file in Downloads is an exact copy of audio that already belongs to another imported song — a leftover from that import. Never bypass this; the user must re-export this song's stems.
- **"Couldn't measure the audio length"**: non-mp3 or unparseable stem — validation can't run, so the import refuses. Only `--skip-duration-check` if the user vouches for the file.
- **"No Spotify match"**: the title was ambiguous — ask the user for the Spotify URL directly.
- **NetEase warning**: not a failure. Lyrics will be empty or line-level only; the user can fix later with `upgrade-lyrics.js` or by hand.
- **yt-dlp not installed**: not a failure — the script automatically falls back to scraping YouTube's search-results HTML, which works in almost all cases. Only treat `youtubeUrl: null` as a real signal of failure (see step 4b below).

## Reuse, don't reinvent

- The deterministic Spotify + lyrics + stems + YouTube work is **all in `packages/desktop/scripts/import-song.js`**. Do not duplicate that logic.
- For the per-syllable retrofit, use `packages/desktop/scripts/upgrade-lyrics.js` — not custom code.
- For per-song vocal effects, follow `AGENTS.md`'s `Per-Song Vocal Effect Customization` section. Don't deviate from its confidence-assessment ritual.

## What this skill does NOT do

- It does not download MP3s from Spotify. The user does that externally (e.g., spotmate.online).
- It does not stem-separate. The user does that externally (vocalremover.org).
- It does not edit `packages/desktop/scripts/{artist}-per-song.js`. Those are batch scripts; for single-song import, write effects inline in `meta.json`.
- It does not modify the live Electron app while it's running. The user re-loads the catalog in the admin page after import (`audio:list-catalog` re-scans).
