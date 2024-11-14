# mugen-vscode

mugen-vscode is a port of mugen-stext to Visual Studio Code.

## Features

- Syntax highlighting for CNS, AIR and ZSS
- Build commands for running MUGEN, sprmake2 and sndmaker
- Autocomplete and hovers for state controllers and triggers, IKEMEN features included

## Extension Settings

This extension contributes the following settings:

* `mugen.gamePath`: Absolute path to your MUGEN executable. Also used to find sprmake2 and sndmaker.
* `mugen.kungFuMan`: Absolute path to KFM's def file. Used to configure `Run MUGEN` command.

## Release Notes

### [2.0.1] - 13-11-2024

- Cleaned up code
- Snippets can now be navigated using Tab

### [2.0.0] - 13-11-2024

- Use new TSV format from other projects
- Rewrote hover/completion code
- Cleaned up code
- Re-licensed to GPLv3
- Removed generated CHANGELOG.md (merged into README)

### [1.2.0] - 25-06-2023

- Add more file extensions to Run MUGEN commands
- Add ZSS syntax
- Rewrite CNS syntax
- Rewrite AIR syntax

### [1.1.1] - 04-04-2023

- Fix CNS/AIR symbol parsing not working in certain conditions

### [1.1.0] - 04-04-2023

- Add auto completion and hovers for CNS, both IKEMEN and MUGEN
- Add CNS symbol parsing for quick navigation

### [1.0.0] - 10-08-2022

- Initial release
