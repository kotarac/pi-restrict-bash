# pi-restrict-bash

Opinionated restrictions for Pi’s built-in `bash` tool.

The extension (`extensions/restrict-bash.ts`) blocks common “escape hatches”, risky shell features, and context-exploding commands, nudging the agent toward Pi’s structured tools (`read`, `edit`, `write`) and `rg` for searching/listing.

## What it does

The extension intercepts tool calls and blocks:

- Tool calls to `grep`, `find`, and `ls`
- `bash` commands that use unsafe shell features (for example command substitution, variable expansion, redirects, background execution, subshell syntax, and control-flow keywords)
- `bash` commands that invoke disallowed programs (for example `sudo`, nested shells like `bash`/`sh`/`zsh`, `cat`, `tee`, `xargs`, `nl`, `fd`/`find`/`grep`/`ls`/`tree`)
- `bash` wrapper commands like `eval`, `exec`, `nohup`, and `timeout`
- `git` subcommands that can mutate the working tree or repository (and `git grep`, since `rg` is preferred)
- `sed -i` / `sed --in-place`

When a command is blocked, Pi shows a reason string explaining what was denied.

## Install

This repo is a Pi package (see `package.json#pi.extensions`). Once installed, Pi auto-discovers and loads the extension.

Global install (writes to `~/.pi/agent/settings.json`):

- From GitHub:
  - `pi install git:github.com/kotarac/pi-restrict-bash`
- From npm:
  - `pi install npm:pi-restrict-bash`

Project-local install (writes to `.pi/settings.json` in your project):

- From GitHub:
  - `pi install -l git:github.com/kotarac/pi-restrict-bash`
- From npm:
  - `pi install -l npm:pi-restrict-bash`

## Try without installing

Try the package for a single run:

- From GitHub:
  - `pi -e git:github.com/kotarac/pi-restrict-bash`
- From npm:
  - `pi -e npm:pi-restrict-bash`

## License

GPL-2.0-only
