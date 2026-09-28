# Scenario schema v2 (proposal)

Not implemented yet. Current save format is the `Scenario` interface in `src/types/scenario.ts`. This
doc is a working draft for the next breaking revision of that format — edit it in place as the design
changes.

## Goals

- Separate human-authored `metadata` from computed/export bookkeeping (`version`).
- Replace name-keyed dicts (`factions`, `unit_types`) with `id`-referenced arrays, so renaming a
  faction/unit type doesn't require updating every reference to it.
- Group structural/spatial data (`width`, `height`, `hexagons`, `labels`) under `map`.
- Generalize `hexagons[].objective` from a fixed two-faction boolean object to a list of faction ids,
  so it isn't hardcoded to exactly two factions. (Scenarios are expected to stay 2-faction in practice,
  but this keeps the option open without a cost to the common case.)
- Merge `city`/`oilfield`/`supply` landmark data directly into `hexagons[].landmark` as one
  mutually-exclusive field (a hex can have at most one landmark), removing the separate `landmarks`
  collection and the sync risk of a hex's `landmark` flag disagreeing with it.
- `unit_icons` is keyed by a content hash of the image bytes rather than filename, so uploading the same
  icon for multiple unit types automatically dedupes to one stored entry.

## Shape

```json
{
  "metadata": {
    "id": "", "name": "", "creator": "", "type": "<scenario_type>",
    "description": "", "created_at": 0, "updated_at": 0
  },
  "version": { "hash": "" },
  "factions": [
    { "id": "", "name": "", "units": { "cap": 0 },
      "manpower": { "points": 0, "income": 0, "cap": 0 },
      "fuel": { "points": 0, "income": 0, "cap": 0 },
      "airpower": { "points": 0, "income": 0, "cap": 0 } }
  ],
  "map": {
    "width": 0, "height": 0,
    "hexagons": [
      { "x": 0, "y": 0, "terrain": "<terrain_type>", "faction": "<faction_id>",
        "landmark": null,
        "logistics": false,
        "river": [false, false, false, false, false, false],
        "port": false, "objective": ["<faction_id>", "..."] }
    ],
    "labels": [{ "x": 0, "y": 0, "edge": null, "type": "<label_type>", "name": "" }]
  },
  "time": {
    "day": 0, "month": 0, "year": 0, "increment": 0,
    "seasons": { "<day>-<month>": { "<terrain_type>": { "to": "<terrain_type>", "probability": 0 } } }
  },
  "turn": { "duration": 0 },
  "unit_types": [
    { "id": "", "name": "", "description": "", "faction": "<faction_id>",
      "branch": "<branch_type>", "icon": "<content_hash>",
      "attack": 0, "defense": 0, "movement": 0, "cost": 0,
      "fuel_consumption": 0, "frequency": 0 }
  ],
  "units": [
    { "x": 0, "y": 0, "faction": "<faction_id>", "type": "<unit_type_id>",
      "attack": 0, "defense": 0, "movement": 0 }
  ],
  "unit_icons": { "<content_hash>": "<base64-encoded-png-bytes>" }
}
```

`hexagons[].landmark` is `null` (no landmark) or one of three mutually-exclusive shapes:

```json
"landmark": { "type": "city", "name": "", "population": 0 }
"landmark": { "type": "oilfield", "production": 0 }
"landmark": { "type": "supply" }
```

`x`/`y` and `faction` were dropped from the city/supply variants shown earlier — both are now redundant
with the hex they're embedded in (its coordinates, and its existing `faction` field), so keeping them
on the landmark too would just reintroduce the sync-risk this merge is meant to remove. Flag if a
landmark's owning faction is ever meant to diverge from the hex's controlling faction (e.g. a supply
point whose logistics network doesn't match current occupation) — if so it needs its own field back.

## Notes / open questions

- `filename` and `timestamp` (present in the current `Metadata`) are dropped — confirmed redundant with
  `name` / `updated_at`.
- `factions[].id` / `unit_types[].id` must be unique — confirmed. Since they're arrays now (not dict
  keys), uniqueness is no longer free and must be validated by app code.
- `objective: []` is the common case (most hexes aren't objectives); a hex objective to faction A is
  `["faction_a_id"]`, contested/shared is `["faction_a_id", "faction_b_id"]`.
- `railway` → `logistics`: confirmed as a plain rename, same semantics as before (not broadened to
  cover roads).
- `hexagons[].faction: "neutral"` is a reserved sentinel, not a real entry in `factions[]` — it means
  "no faction owns this hex." Expected to mostly appear on water, but usable player-eligible neutral
  hexes aren't ruled out, so it stays a real value in the schema (not narrowed to water-only).
- `units[]` stays top-level (not nested under `map`) — confirmed final.
- `turn: { duration: 0 }` stays a wrapper object rather than a bare scalar, deliberately — keeps room to
  add more turn-config fields later without a breaking shape change.
- `units[].attack/defense/movement` intentionally can diverge from `unit_types[].attack/defense/movement`
  — confirmed, not a duplication bug. `unit_types` only supplies the base stats a unit is spawned with;
  once placed, a unit's own stats are independent and can change over its lifetime.
- `units[].id` is not part of the saved format — it's assigned dynamically at load time by the app, not
  persisted in the JSON.
- `metadata.id` / `factions[].id` / `unit_types[].id` generation: standard UUID, assigned once at
  creation and immutable afterward — not derived from `name`. This was changed from an earlier
  name-slug proposal (trim/lowercase/`_`-for-spaces) specifically because a slug tied to `name` would
  have to either change on rename (breaking every reference to it, defeating the whole point of moving
  to id-based references) or silently go stale (id no longer matching current name). UUID has no
  relationship to `name` at all, so renaming is always safe, and it also removes the id-collision edge
  case (two names slugifying to the same string) without needing explicit rejection logic. Tradeoff:
  raw JSON is less readable (`"faction": "a3f5e9c1-88b2-4a11-9f2e-113355aabbcc"` instead of
  `"faction": "germany"`) — accepted, same call as the `unit_icons` content-hash tradeoff. The earlier
  alphanumeric+spaces restriction on `name` was only needed to keep the slug clean — now that `id` is a
  UUID with no relationship to `name`, that restriction is dropped; `name` is free-text.
- `version` no longer has `index` — dropped. `version` is just `{ "hash": "" }`. The hash is computed
  over the full scenario object with the `version` key removed entirely (not just zeroed), then the
  `version` key is (re)added afterward holding that hash.
- Import must do **strict validation**, not just structural sanity checks: every `<faction_id>` and
  `<unit_type_id>` reference (`hexagons[].faction`, `units[].faction`, `units[].type`,
  `unit_types[].faction`, etc., aside from the `"neutral"` sentinel) must resolve to an entry that
  actually exists in `factions[]`/`unit_types[]`, and `id`s within each array must be unique. On
  failure: **reject the file outright, no repair attempt.**
- `unit_icons` key = content hash (truncated SHA-256, e.g. first 16 hex chars) of the image bytes, not
  the filename. Original filename is not preserved anywhere in the schema — accepted tradeoff: a
  mapmaker editing the raw JSON has to decode base64 to identify an icon, same as accepting that
  re-encoding the same visual icon through a different tool changes its bytes (and thus its hash),
  producing a near-duplicate entry instead of deduping — considered the mapmaker's problem, not the
  program's.

## Enums

- `<scenario_type>` (`metadata.type`): `original`, `custom`
- `<terrain_type>`: `grass`, `mountain`, `sand`, `water`, `mud`, `forest`, `forest_snow`
- `<branch_type>` (`unit_types[].branch`): `motorized`, `infantry`, `light_infantry`, `fortification`,
  `naval`, `leader`
- `<label_type>` (`labels[].type`): `water` only for now — more may be added later

## Migration cost

Breaking format change. Implementing it needs:
- A converter for existing saved files (similar in spirit to `ensureLabels` / `migrateLegacyFactionNames`
  in `src/state/store.ts`).
- Updates to hash computation in `src/lib/exportImport.ts`.
- Updates to `parseScenarioFromJson`'s sanity checks.
- Possibly updates to the legacy Python pipeline (`scenario_compile.py` / `ScenarioObject`) if still in use.
