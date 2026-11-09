# LAF

A small reactive frontend framework with no build step. Projects use plain ES modules and import the framework from a local `laf/` folder.

## Start a new project

```sh
npm create laf@latest my-app                    # newest release
npm create laf@latest my-app -- --version v0.1.0
```

Or, without the npm package, straight from GitHub:

```sh
npx github:uboddot/LAF my-app
```

This creates:

```
my-app/
  index.html  main.js  style.css   ← starter files from template/, yours to edit
  laf/                             ← the framework, at the chosen version
  laf.json                         ← which version laf/ contains
```

Serve the folder with any static file server. ES modules don't load from `file://`.

## Change the LAF version of a project

Run these inside the project folder:

```sh
npx create-laf versions         # list releases
npx create-laf update           # newest release
npx create-laf update v0.2.0    # a specific tag, branch or commit
```

`update` only replaces `laf/`. It refuses to run if you edited files inside `laf/`, unless you pass `--force`.

Other options: `--repo owner/name` downloads from a fork, and `--url "https://host/laf-{ref}.tar.gz"` downloads from a mirror. Set `GITHUB_TOKEN` if you hit GitHub's API rate limit.

## Releasing (maintainers)

- **Framework or template change:** commit, then `git tag vX.Y.Z && git push --tags`. Nothing gets published to npm.
- **CLI change:** bump `cli/package.json` version, then `cd cli && npm publish`.

## Repo layout

- `laf/`: the framework, which gets copied into projects
- `template/`: starter files for new projects
- `cli/`: the `create-laf` command-line tool (Node ≥ 18.3, no dependencies)
- `main.js`, `components/`, `*.css`: demo / playground
