# Stamp Date Save And Settings Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-stamp UTC date editing, immediate panel persistence, and a clear Settings gear icon.

**Architecture:** Extract UTC timestamp composition into a tiny browser-and-Node helper. Extend picker state with `dateUTC`, split persistence from post-save navigation, and keep the existing modal and database patterns.

**Tech Stack:** Vanilla JavaScript, Dexie IndexedDB, Node built-in test runner, static HTML/CSS.

---

### Task 1: UTC Timestamp Composer

**Files:**
- Create: `stamp-time.js`
- Create: `tests/stamp-time.test.js`
- Modify: `index.html`

- [ ] Write a Node test proving a selected UTC date and time compose exactly.
- [ ] Run `node --test tests/stamp-time.test.js` and confirm it fails because the helper is missing.
- [ ] Add `composeStampUTC(dateUTC, hh, mm)` and load it before `app.js`.
- [ ] Run `node --test tests/stamp-time.test.js` and confirm it passes.

### Task 2: Timestamp Panel Date And Immediate Save

**Files:**
- Modify: `app.js`
- Modify: `style.css`

- [ ] Add `dateUTC` to timestamp picker state and render a native UTC date input.
- [ ] Make `Now` update date, hour, and minute.
- [ ] Extract persistence from `save(newLeg)` so panel Save can persist without navigating away.
- [ ] Make panel Save compose the timestamp, recompute derived values, persist the form, and close only after successful validation.

### Task 3: Settings Gear And Verification

**Files:**
- Modify: `app.js`

- [ ] Replace the Settings SVG path with a compact gear outline.
- [ ] Run `node --test tests/stamp-time.test.js`.
- [ ] Verify the local browser panel date picker, immediate database save, and Settings icon visually.
