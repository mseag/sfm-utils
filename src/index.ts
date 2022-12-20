#!/usr/bin/env node
// Copyright 2022 SIL International
import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as toolbox from './toolbox';
const {version} = require('../package.json');

////////////////////////////////////////////////////////////////////
// Get parameters
////////////////////////////////////////////////////////////////////
program
  .version(version, '-v, --version', 'output the current version')
  .description("Utilities to 1) parse Toolbox text files into JSON Objects. " +
    "2) take a JSON file and write out an .SFM file for Paratext.")
    .option("-t, --text <path to single text file>", "path to a Toolbox text file")
    .option("-d, --directory <path to directory containing text files>", "path to directory containing multiple Toolbox text files")
    .option("-j, --json <jsonObject path>", "path to JSON Object file")
  .parse(process.argv);

// Debugging parameters
const options = program.opts();
const debugParameters = true;
if (debugParameters) {
  console.log('Parameters:');
  if (options.text) {
    console.log(`Toolbox text file path: "${options.text}"`);
  }
  if (options.directory) {
    console.log(`Toolbox files path: "${options.directory}"`);
  }
  if (options.json) {
    console.log(`JSON file: "${options.json}"`);
  }
  console.log('\n');
}

// Check if txt/JSON file or directory exists
if (options.text && !fs.existsSync(options.text)) {
  console.error("Can't open Toolbox text file " + options.text);
  process.exit(1);
}
if (options.directory && !fs.existsSync(options.directory)) {
  console.error("Can't open directory " + options.directory);
  process.exit(1);
}
if (options.json && !fs.existsSync(options.json)) {
  console.error("Can't open JSON file " + options.json);
  process.exit(1);
}

////////////////////////////////////////////////////////////////////
// End of parameters
////////////////////////////////////////////////////////////////////

let bookObj = {};

const filesToParse: string[] = [];

if (options.text) {
  // Parse a txt file into JSON Object
  filesToParse.push(options.text);
} else if (options.directory) {
// TODO: Handle options.directory to get list of all txt files to process and ignore certain directories

}

if (options.json) {
  // Get the book status from the JSON file
  try {
    bookObj = require(options.json);
  } catch (e) {
    console.error("Invalid JSON file. Exiting")
    process.exit(1);
  }
} else if (filesToParse.length > 0) {
  filesToParse.forEach(file => {
    bookObj = toolbox.parse(file, "slt");
  });
  // For testing, write out each book's JSON to file

} else {
  console.warn("No directory or JSON file given. Exiting");
  process.exit(1)
}



// Write out the JSON Objects to SFM
if (bookObj) {

  const ID_MARKER = "\\id ";
  const USFM_MARKER = "\\usfm ";
  const HEADER_MARKER = "\\h ";
  const TOC_MARKER = "\\toc ";
  const MAIN_TITLE_MARKER = "\\mt ";
  const CHAPTER_MARKER = "\\c ";
  const SECTION_MARKER = "\\s1 ";
  const VERSE_MARKER = "\\v ";
  const CRLF = "\n";

  const chapters = bookObj['content'];

  //let outputFileName = options.text + '.SFM';
  let SFMtext = "";

  SFMtext += ID_MARKER + bookObj['header']['bookInfo']['code'] + ' ' +  bookObj['header']['projectName'] + CRLF;
  SFMtext += USFM_MARKER + '3.0' + CRLF;
  SFMtext += HEADER_MARKER + bookObj['header']['bookInfo']['name'] + CRLF;
  SFMtext += TOC_MARKER + bookObj['header']['bookInfo']['name'] + CRLF;
  SFMtext += MAIN_TITLE_MARKER + bookObj['header']['bookInfo']['name'] + CRLF;


  chapters.forEach(function(chapter) {
    if(chapter['number'] != 0){
      SFMtext += CHAPTER_MARKER + chapter['number'] as string + CRLF;
      const sectionsAndVerses = chapter['content'];
      sectionsAndVerses.forEach(function(snippet) {
        switch(snippet['type']) {
          case "section":
            SFMtext += SECTION_MARKER + snippet['text'] + CRLF;
            break;
          case "verse":
            SFMtext += VERSE_MARKER + snippet['number'] as string + ' ' + snippet['text'] + CRLF;
            break;
          default:
            throw 'Invalid type on ' + JSON.stringify(snippet) + '. \nLooking for "section" or "verse".';
        }
      });
    }
  });

  // TODO: project name variable
  fs.writeFileSync('./' + (options.json.replace(/^.*[\\/]/, '')).replace('.json', '.SFM') + "slt", SFMtext);

}
