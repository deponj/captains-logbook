# Stamp Date Save And Settings Icon Design

## Goal

Let a pilot correct the UTC date of an individual timestamp from the timestamp
editor, persist the current leg when that panel is saved, and make the header
Settings control read clearly as a gear.

## Timestamp Editor

The timestamp panel gains a native `Date - UTC` input above the existing hour
and minute controls. It initializes from the selected timestamp. The panel's
`Now` action updates date, hour, and minute together.

The panel's `Save` action combines the chosen date, hour, and minute exactly,
updates the selected timestamp, recalculates night time, and persists the
current form. For a new leg it creates the database record and leaves that leg
open for further editing. For an existing leg it updates the database record.

If `Flight`, `From`, or `To` is missing, the panel remains open and the existing
validation toast is shown.

## Settings Icon

Replace the current eight-spoke symbol with a compact gear outline. The button
placement, click behavior, and `Settings` accessibility label remain unchanged.

## Verification

Add a small Node regression test for UTC timestamp composition. Verify the
timestamp panel and immediate-save flow in the local browser preview.
