
# sfm-utils
Utilities to parse book translations in SFM text files (.txt, .rtf, .sfm) into JSON objects, and then write out the books into SFM suitable for Paratext or .tsv.
When directories are processed, each book input is written to individual .sfm files.

Assumptions:
* Each text file is for a single chapter of a book
* Each directory of files is for a single book
* Text filenames consist of a bookname separated by space/underscore with the chapter number (e.g. Judges_19...txt)

## Usage
Note for developers: Replace `sfm-utils.exe` references with `node dist/index.js`.

Command-line
```bash
Usage: sfm-utils.exe -p p_arg [-f f_arg | -t t_arg | -d d_arg | -j j_arg | -s s_arg]
```

Parameters
```bash
    Required
    -p [Paratext project name (can be 3-character abbreviation)]

    Optional for processing txt or sfm files - one of:
    -f [A single SFM file (can be an entire book)]
    -t [A single Toolbox text file (one chapter of a book)]
    -d [Directory of Toolbox text files for a single book (one chapter per file)]
    -j [JSON file representing a single book - used for testing conversion to SFM]
    -s [Directory of directories (each subdirectory is a separate book)]

    Optional for processing rich text (rtf) files - one of:
    -b  [A single rtf text file (one chapter of a book)]
    -bd [Directory of rtf text files for a single book (one chapter per file)]
    -bs [Directory of directories (each subdirectory is a separate book)]
```

### Help
For additional help:
```bash
sfm-utils.exe -h
```

------------------


## Developer Setup
These utilities require Git, Node.js, and TypeScript (installed locally).
Back translations in .rtf text files will also need UnRTF installed for converting the Rich Text format (only works on Linux).

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

### Install UnRTF for .rtf Files
This is needed if the source files are .rtf Rich Text Format, and currently only works on Linux. Download at
https://www.gnu.org/software/unrtf/#downloading

or on command line:
```bash
sudo apt install unrtf
```

### Compiling sfm-utils
This compiles the TypeScript source files in `src/` into Javascript (`dist/`)

To rebuild the project
```bash
npm run build
```

To watch the project and recompile automatically
```bash
npm run watch
```

**Note: Our `.vscode > tasks.json` comes with "runOptions" of `npm run watch` set to "folderOpen", which means that by default, Visual Studio code always calls `npm run watch` upon startup in the sfm-utils project, and developers don't have to compile manually.**

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
Copyright (c) 2022-2023 SIL International. All rights reserved.
Licensed under the [MIT license](LICENSE).
