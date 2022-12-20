
# sfm-utils
Utilities to parse text files (e.g. from Toolbox) and migrate SFM markers into a format suitable for Paratext.

## Usage
Note for developers: Replace `sfm-utils.exe` references with `node dist/index.js`.

-----
### Project name
Command-line
```bash
sfm-utils.exe
    -p [Paratext project name (can be 3-character abbreviation)]
```

This parameter is required and used with the optional parameters below.

### Convert a single text file

Command-line
```bash
sfm-utils.exe
    -t [path to txt file]
```

### Convert all the text files in a directory

Command-line
```bash
sfm-utils.exe
    -d [path to folders of txt files]
```

### JSON Book status file for testing

Command-line:
```bash
sfm-utils.exe
    -j [path to JSON status file] 
```

This reads in the JSON file and writes out the corresponding .SFM file for the book

-----


### Help
Obtaining the sfm-utils version:
```bash
sfm-utils.exe --version
```

For additional help:
```bash
sfm-utils.exe -h
```

------------------


## Developer Setup
These utilities require Git, Node.js, and TypeScript (installed locally).

### Install Git
Download and install Git

https://git-scm.com/downloads

### Install Node.js and Dependencies
Download and install the latest current version for Node.js (>=18.12.0)

https://nodejs.org/en/download/current/

After installing Node.js, reboot your PC, open Git Bash to this directory and install this project's dependencies:
```bash
npm install
```

This will install [TypeScript](https://www.typescriptlang.org/) locally and can be accessed with

```bash
npx tsc
```

### Compiling sfm-utils
This compiles the TypeScript source files in `src/` into Javascript (`dist/`)

To rebuild the project
```bash
npm run build
```

You can also have TypeScript watch the project and recompile automatically
```bash
npm run watch
```

### Debugging with Visual Studio Code
Open Folder as a VS Code Project

Edit your applicable parameters in [launch.json](./.vscode/launch.json). If using Windows paths, you'll need to escape the slashes (e.g. `-j "C:\\somewhere\\to\\text-or-json-files"`)

### Publishing sfm-utils.exe
This optional step creates a standalone Windows executable `sfm-utils.exe` so it can be run without Node.js. Published artifacts will be in the `deploy/` directory.

```bash
npm run publish
```

## Unit Tests (TODO)
Unit tests are run with the [AVA](https://github.com/avajs/ava) test runner.
Remember to build sfm-utils before running tests. 
Terminal output best viewed in VS Code.
```bash
npm run test
```

-------------

## License
Copyright (c) 2022 SIL International. All rights reserved.
Licensed under the [MIT license](LICENSE).