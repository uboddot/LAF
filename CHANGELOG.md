# Changelog

All notable changes to LAF are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/):

- **PATCH** (`v0.1.0 → v0.1.1`): bug fixes only. Always safe to update.
- **MINOR** (`v0.1.x → v0.2.0`): new features. Before `v1.0.0`, a minor release may also contain breaking changes.
- **MAJOR** (`v1.x → v2.0.0`): breaking changes.

Breaking changes are marked **BREAKING** and come with a migration note.
`npx create-laf update` prints the entries between your current and new version, and every project has a copy of this file at `laf/CHANGELOG.md`.

## [Unreleased]

## [v0.0.5] - 2026-11-13

### Fix

- renderFn in `Reducer`.
- prohibit cyclic effect calls.

### Dev

- added test suite for 'Effect'
- added test suite for 'State'
- added test suite for Context and Owner functionality
- added jsdoc

### Added

## [v0.0.4] - 2026-11-10

### Added

- Fix a bug, where child effects dont get disposed correctly.

- A `State` can now be initialized with a custom render function, that transforms the output of get() before returning. If no function is provided, render will call get(). E.g.:

```
point = new State({ x: 0, y: 1 }, (o) => o.x);
```

- Refactor in `Effect` class to make it more readable.

## [v0.0.3] - 2026-11-09

### Added

- `create-laf update` prints the changelog entries between the old and the new version (or the rolled-back entries when downgrading).
- Projects get a copy of this changelog at `laf/CHANGELOG.md`.

## [v0.0.2] - 2026-11-09

### Added

- Full starter template for new projects: components (`Details`, `TipTap`), a `CountContext` example, `theme.css` with CSS custom properties.

## [v0.0.1] - 2026-11-09

### Changed

- `laf/index.js` logs `"laf loaded"` on import (test release for the update flow).

## [v0.0.0] - 2026-11-09

### Added

- `State`: reactive value with `get()` (tracked), `set()` (only notifies on change) and `peek()` (untracked).
- `Reducer`: a `State` updated through `dispatch()`.
- `Effect`: re-runs automatically when the `State`s it read change; nested effects are disposed on re-run.
- `h(tag, props, ...children)` and `mount(component, root)`:
  - reactive props and children (pass a `State` or a function)
  - `on*` props become event listeners
  - `tag = null` renders a fragment
  - arrays of children
  - function components
- `Context` / `Provider` for passing values down the component tree.
- `create-laf` CLI: `npm create laf <dir>`, `npx create-laf update [ref]`, `npx create-laf versions`.

[Unreleased]: https://github.com/uboddot/LAF/compare/v0.0.5...HEAD
[v0.0.5]: https://github.com/uboddot/LAF/compare/v0.0.4...v0.0.5
[v0.0.4]: https://github.com/uboddot/LAF/compare/v0.0.3...v0.0.4
[v0.0.3]: https://github.com/uboddot/LAF/compare/v0.0.2...v0.0.3
[v0.0.2]: https://github.com/uboddot/LAF/compare/v0.0.1...v0.0.2
[v0.0.1]: https://github.com/uboddot/LAF/compare/v0.0.0...v0.0.1
[v0.0.0]: https://github.com/uboddot/LAF/releases/tag/v0.0.0
