#!/usr/bin/env node
// Copyright 2022 SIL International
import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as books from './books';
import * as toolbox from './toolbox';
import * as sfm from './sfm';
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
    .option("-p, --projectName <name>", "name of the Paratext project>")
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
  if (options.projectName) {
    console.log(`Project Name: "${options.projectName}`);
  }
  console.log('\n');
}

// Project Neme required
if (!options.projectName) {
  console.error("Project name required");
  process.exit(1);
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

const b = new books.Books();
let bookObj: books.objType = {
  "header": {
    "projectName" : "",
    "bookInfo" : b.getBookByCode("000")
  },
  "content": []
};

const filesToParse: string[] = [];

if (options.text) {
  // Parse a txt file into JSON Object
  filesToParse.push(options.text);
} else if (options.directory) {
  // Get a list of all txt files in options.directory and ignore certain directories
  getTextFilesInside(options.directory, filesToParse);
}

// Recursively puts text files from a directory into an array
function getTextFilesInside(directory, fileArray){
  fs.readdirSync(directory).forEach(function(file){
    const absolutePath = path.join(directory, file);
    if (fs.statSync(absolutePath).isDirectory()){
      return getTextFilesInside(absolutePath, fileArray);
    }
    else{
      if(file.substring(file.lastIndexOf('.')+1, file.length) === 'txt'){
        fileArray.push(absolutePath);
      }
      return;
    }
  });
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
  sfm.convertToSFM(bookObj);
}
