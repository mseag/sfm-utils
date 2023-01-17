#!/usr/bin/env node
// Copyright 2022 SIL International
import * as program from 'commander';
import * as fs from 'fs';
import * as books from './books';
import * as toolbox from './toolbox';
import * as sfm from './sfm';
import * as sfmConsole from './sfmConsole';
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
const debugMode = false;
if (debugMode) {
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

// Initialize the logger to use "Extra Book A"
const s = new sfmConsole.SFMConsole(options.projectName, 'XXA');

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
if (options.superDirectory && !fs.existsSync(options.superDirectory)) {
  console.error("Can't open project directory " + options.superDirectory);
  process.exit(1);
}

// Validate one of the optional parameters is given
if (!options.text && !options.directory && !options.json && !options.superDirectory) {
  console.error("Need to pass another optional parameter [-t -d -j or -s]");
  process.exit(1);
}

////////////////////////////////////////////////////////////////////
// Routing commands to functions
////////////////////////////////////////////////////////////////////

if (options.json) {
  // Make a JSON object into an SFM file
  processJSON(options.json);
} else if (options.text) {
  // Parse a txt file into a JSON object
  const bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  processText(options.text, bookObj);
} else if (options.directory) {
  // Convert the text files in a directory into an SFM book file
  processDirectory(options.directory);
} else if (options.superDirectory) {
  // Make all book folders from a super folder into SFM book files
  processSuperDirectory(options.superDirectory);
}

// Write SFM Console log to extra book file
s.writeLog();

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
  let bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  // Get all the text files in the directory and then process them
  const filesToParse: string[] = [];
  fileAssistant.getTextFilesInside(directory, filesToParse);
  filesToParse.forEach(file => {
    bookObj = processText(file, bookObj);
  });

  // Directory processed, so write valid output
  if (bookObj.header.bookInfo.code !== "000") {
    // For testing, write out book JSON Object
    writeJSON(bookObj);

    // valid JSON Object to SFM
    sfm.convertToSFM(bookObj);
  }
}


/**
 * Take a text file and make a JSON book type object
 * @param {string} filepath - file path of a single text file
 * @param {books.bookType} bookObj - the book object to modify
 * @returns {books.bookType} bookObj - modified book object
 */
function processText(filepath: string, bookObj: books.objType): books.objType {
  const bookInfo = toolbox.getBookAndChapter(filepath);
  const currentChapter = bookInfo.chapterNumber;
  const bookType = books.getBookByName(bookInfo.bookName);
  if (bookInfo.bookName === "Placeholder") {
    // Skip invalid book name
    console.warn('Skipping invalid book name');
    return bookObj;
  } else if (currentChapter > bookType.chapters) {
    // Skip invalid chapter number
    console.warn('Skipping invalid chapter number ' + currentChapter + ' when ' +
      bookObj.header.bookInfo.name + ' only has ' + bookType.chapters + ' chapters.');
    return bookObj;
  }

  if (bookObj.content.length == 0) {
    bookObj = toolbox.initializeBookObj(bookInfo.bookName, options.projectName);
  }

  if (!bookObj.content[currentChapter]) {
    console.error(`${bookInfo.bookName} has insufficent chapters allocated to handle ${currentChapter}. Exiting`);
    process.exit(1);
  }
  if (bookObj.content[currentChapter].type != "chapter") {
    // Initialize current chapter
    bookObj.content[currentChapter].type = "chapter";
    bookObj.content[currentChapter].content = [];
  }

  toolbox.updateObj(bookObj, filepath, currentChapter, s, debugMode);

  // For single file parameter, write valid output
  if (options.text && bookObj.header.bookInfo.code !== "000") {
    // For testing, write out book JSON Object
    writeJSON(bookObj);

    //valid JSON Object to SFM
    sfm.convertToSFM(bookObj);
  }

  return bookObj;
}


/**
 * Take a JSON file and make an SFM file
 * @param {string} filepath - file path of a single JSON file
 */
function processJSON(filepath: string){
  let bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
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

/**
 * Write JSON file (for testing purposes).
 * Filename will be [##][XYZ][Project name].json
 * ## - 2-digit book number
 * XYZ - 3 character book code
 * Project name - Paratext project name
 * @param {books.bookType} bookObj - the book object to write to file
 */
function writeJSON(bookObj: books.objType) {
  if (debugMode) {
    // Add leading 0 if book number < 10
    const padZero = bookObj.header.bookInfo.num < 10 ? '0' : '';
    const filename = padZero + bookObj.header.bookInfo.num +
      bookObj.header.bookInfo.code + bookObj.header.projectName + '.json';
    fs.writeFileSync('./' + filename, JSON.stringify(bookObj, null, 2));
    console.info(`Writing out "${filename}"`);
  }
}
