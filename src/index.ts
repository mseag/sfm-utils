#!/usr/bin/env node
// Copyright 2022 SIL International
import * as program from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as books from './books';
import * as toolbox from './toolbox';
import * as sfm from './sfm';
import * as fileAssistant from './fileAssistant';
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
    .option("-s, --superDirectory <path to a directory containing directories for each book in a project>", "path to a directory containing directories for each book in a project")
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
  if (options.superDirectory){
    console.log(`Project Directory: "${options.projectName}`);
  }
  console.log('\n');
}

// Project Name required
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
if (options.json && !fs.existsSync(options.superDirectory)) {
  console.error("Can't open project directory " + options.superDirectory);
  process.exit(1);
}

////////////////////////////////////////////////////////////////////
// Routing commands to functions
////////////////////////////////////////////////////////////////////

const b = new books.Books();
let bookObj: books.objType = {
  "header": {
    "projectName" : "",
    "bookInfo" : b.getBookByCode("000")
  },
  "content": []
};

if (options.json) {
  // Make a JSON object into an SFM file
  processJSON(options.json);
} else if (options.text) {
  // Parse a txt file into a JSON object
  processText(options.text);
} else if (options.directory) {
  // Convert the text files in a directory into an SFM book file
  processDirectory(options.directory);
} else if (options.superDirectory) {
  // Make all book folders from a super folder into SFM book files
  processSuperDirectory(options.superDirectory);
}


////////////////////////////////////////////////////////////////////
// Processor functions
////////////////////////////////////////////////////////////////////

/**
 * Take a project directory with a directory inside for each book, and make an SFM file for each book
 * @param {string} superDirectory - path to a directory containing directories for each book in a project
 */
function processSuperDirectory(superDirectory: string){
  const bookDirectories: string[] = [];
  fileAssistant.getBookDirectories(superDirectory, bookDirectories);
  bookDirectories.forEach(directory => {
    processDirectory(directory);
  });
}


/**
 * Take a directory with toolbox text chapter files and make an SFM book file
 * @param {string} directory - path to directory containing text files
 */
function processDirectory(directory: string){
  const filesToParse: string[] = [];
  fileAssistant.getTextFilesInside(directory, filesToParse);
  filesToParse.forEach(file => {
    processText(file);
  });

  // Write out valid JSON Object to SFM
  if (bookObj.header.bookInfo.code !== "000") {
    sfm.convertToSFM(bookObj);
  }
}


/**
 * Take a text file and make a JSON book type object
 * @param {string} filepath - file path of a single text file
 */
function processText(filepath: string) {
  const bookInfo = toolbox.getBookAndChapter(filepath);
    if (bookInfo.bookName === "Placeholder") {
      // Skip invalid files
      return;
    }

    if (bookObj.content.length == 0) {
      bookObj = toolbox.initializeBookObj(bookInfo.bookName, options.projectName);
    }

    const currentChapter = bookInfo.chapterNumber;
    if (bookObj.content[currentChapter].type != "chapter") {
      // Initialize current chapter
      bookObj.content[currentChapter].type = "chapter";
      bookObj.content[currentChapter].content = [];
    }

    toolbox.updateObj(bookObj, filepath, currentChapter);

}


/**
 * Take a JSON file and make an SFM file
 * @param {string} filepath - file path of a single JSON file
 */
function processJSON(filepath: string){

  try {
    bookObj = require(filepath);
  } catch (e) {
    console.error("Invalid JSON file. Exiting")
    process.exit(1);
  }

  // Write out valid JSON Object to SFM
  if (bookObj.header.bookInfo.code !== "000") {
    sfm.convertToSFM(bookObj);
  }

}


////////////////////////////////////////////////////////////////////
// End of processor functions
////////////////////////////////////////////////////////////////////
