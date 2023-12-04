#!/usr/bin/env node
// Copyright 2022-2023 SIL International
import { CommanderError, program } from 'commander';
import * as fs from 'fs';
import * as backTranslation from './backTranslation.js';
import * as books from './books.js';
import * as path from 'path';
import * as toolbox from './toolbox.js';
import require from './cjs-require.js';
import * as sfm from './sfm.js';
import * as sfmConsole from './sfmConsole.js';
import * as fileAssistant from './fileAssistant.js';
//const {version} = require('../package.json');

////////////////////////////////////////////////////////////////////
// Get parameters
////////////////////////////////////////////////////////////////////
program
//  .version(version, '-v, --version', 'output the current version')
  .description("Utilities to 1) parse Toolbox text files into JSON Objects. " +
    "2) take a JSON file and write out an .SFM file for Paratext.")
    .option("-b, --back <path to single text file>", "path to back translation rtf text file")
    .option("-f, --sfm <path to single SFM file>", "path to SFM file")
    .option("-t, --text <path to single text file>", "path to a Toolbox text file")
    .option("-bd, --backDirectory <path to directory containing rtf text files>", "path to directory containing multiple RTF text files")
    .option("-d, --directory <path to directory containing text files>", "path to directory containing multiple Toolbox text files")
    .option("-j, --json <jsonObject path>", "path to JSON Object file")
    .option("-p, --projectName <name>", "name of the Paratext project>")
    .option("-bs, --backSuperDirectory <path to a directory containing directories for each book in a project>", "back translation - path to a directory containing directories for each book in a project")
    .option("-s, --superDirectory <path to a directory containing directories for each book in a project>", "path to a directory containing directories for each book in a project")
    .exitOverride();
try {
  program.parse();
} catch (error: unknown) {
  if (error instanceof CommanderError) {
    console.error(error.message);
  }
  process.exit(1);
}

// Debugging parameters
const options = program.opts();
const debugMode = true;
if (debugMode) {
  console.log('Parameters:');
  if (options.back) {
    console.log(`Back Translation text file path: "${options.back}"`);
  }
  if (options.sfm) {
    console.log(`SFM file path: "${options.sfm}"`);
  }
  if (options.text) {
    console.log(`Toolbox text file path: "${options.text}"`);
  }
  if (options.backDirectory) {
    console.log(`RTF files path: "${options.backDirectory}"`);
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
  if (options.backSuperDirectory){
    console.log(`Back Translation super directory: "${options.backSuperDirectory}`);
  }
  if (options.superDirectory){
    console.log(`Project Directory: "${options.superDirectory}`);
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
if (options.back && !fs.existsSync(options.back)) {
  console.error("Can't open back translation text file " + options.back);
  process.exit(1);
}
if (options.sfm && !fs.existsSync(options.sfm)) {
  console.error("Can't open SFM file " + options.sfm);
  process.exit(1);
}
if (options.backDirectory && !fs.existsSync(options.backDirectory)) {
  console.error("Can't open back translation directory " + options.backDirectory);
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
if (!options.back && !options.sfm && !options.text && !options.backDirectory && !options.directory &&
    !options.json && !options.backSuperDirectory && !options.superDirectory) {
  console.error("Need to pass another optional parameter [-b -t -bd -d -j -bs or -s]");
  process.exit(1);
}

////////////////////////////////////////////////////////////////////
// Routing commands to functions
////////////////////////////////////////////////////////////////////

if (options.json) {
  // Make a JSON object into an SFM file
  processJSON(options.json);
} else if (options.back) {
  // Parse an rtf text file into a JSON object
  const bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  processBackText(options.back, bookObj);
} else if (options.sfm) {
  const bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  processText(options.sfm, bookObj);
} else if (options.text) {
  // Parse a txt file into a JSON object
  const bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  processText(options.text, bookObj);
} else if (options.backDirectory) {
  // Convert the RTF text files in a directory into an SFM book file
  processBackDirectory(options.backDirectory);
} else if (options.directory) {
  // Convert the text files in a directory into an SFM book file
  processDirectory(options.directory);
} else if (options.backSuperDirectory) {
  // Make all book folders from a back translation super folder into SFM book files
  processBackSuperDirectory(options.backSuperDirectory).then(script1 => {
    // Extra write of SFM Console log to extra book file after all the async processing finished
    s.writeLog();
  });
} else if (options.superDirectory) {
  // Make all book folders from a super folder into SFM book files
  processSuperDirectory(options.superDirectory);
}

// Write SFM Console log to extra book file
if (!options.backSuperDirectory) {
  s.writeLog();
}

console.log('All done processing');
////////////////////////////////////////////////////////////////////
// Processor functions
////////////////////////////////////////////////////////////////////

/**
 * Take a project directory with a directory inside for each book, and make an SFM file for each book
 * @param {string} backSuperDirectory - path to a directory containing directories for each book in a project
 */
async function processBackSuperDirectory(backSuperDirectory: string){
  const bookDirectories: string[] = [];
  fileAssistant.getBookDirectories(backSuperDirectory, bookDirectories);
  for(let i=0; i<bookDirectories.length; i++) {
    await processBackDirectory(bookDirectories[i]);
  }
}

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
 * Take a directory with RTF text chapter files and make an SFM book file
 * @param {string} directory - path to directory containing text files
 */
async function processBackDirectory(directory: string){
  let bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  // Get all the text files in the directory and then process them
  const filesToParse: string[] = [];
  fileAssistant.getTextFilesInside(directory, filesToParse);
  for (let i=0; i<filesToParse.length; i++) {
    bookObj = await processBackText(filesToParse[i], bookObj);
  }

  // Directory processed, so write valid output
  if (bookObj.header.bookInfo.code !== "000") {
    // For testing, write out book JSON Object
    writeJSON(bookObj);

    // valid JSON Object to SFM
    sfm.convertToSFM(bookObj, s);
  }
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
    sfm.convertToSFM(bookObj, s);
  }
}

/**
 * Take an rtf text file and make a JSON bok type object
 * @param {string} filepath - file path of a single rtf text file
 * @param {books.bookType} bookObj - the book object to modify
 * @returns {books.bookType} bookObj - modified book object
 */
async function processBackText(filepath: string, bookObj: books.objType): Promise<books.objType> {
  const bookInfo = backTranslation.getBookAndChapter(filepath, options.projectName);
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
    console.error(`${bookInfo.bookName} has insufficient chapters allocated to handle ${currentChapter}. Exiting`);
    process.exit(1);
  }
  if (bookObj.content[currentChapter].type != "chapter") {
    // Initialize current chapter
    bookObj.content[currentChapter].type = "chapter";
    bookObj.content[currentChapter].content = [];
  }

  await backTranslation.updateObj(bookObj, filepath, currentChapter, s, debugMode);

  // For single file parameter, write valid output
  if (options.back && bookObj.header.bookInfo.code !== "000") {
    // For testing, write out book JSON Object
    writeJSON(bookObj);

    //valid JSON Object to SFM
    sfm.convertToSFM(bookObj, s);
  }

  return bookObj;
}

function processSFMText(filepath: string, bookObj: books.objType): books.objType {
  const bookInfo = toolbox.getBookAndChapter(filepath);

  if (bookObj.content.length == 0) {
    bookObj = toolbox.initializeBookObj(bookInfo.bookName, options.projectName);
  }
  const currentChapter = 0; // TODO fix
  if (!bookObj.content[currentChapter]) {
    console.error(`${bookInfo.bookName} has insufficent chapters allocated to handle ${currentChapter}. Exiting`);
    process.exit(1);
  }
  if (bookObj.content[currentChapter].type != "chapter") {
    // Initialize current chapter
    bookObj.content[currentChapter].type = "chapter";
    bookObj.content[currentChapter].content = [];
  }

  return bookObj;
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
    console.error(`${bookInfo.bookName} has insufficient chapters allocated to handle ${currentChapter}. Exiting`);
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
    sfm.convertToSFM(bookObj, s);
  } else if (options.sfm && bookObj.header.bookInfo.code !== "000") {
    const basename = path.parse(path.basename(filepath)).name;

    // For testing, write out book JSON Object
    writeJSON(bookObj, basename + '.json');

    // Move JSON name

    // Write JSON Object to TSV file
    sfm.convertToTSV(bookObj, basename);
  }

  return bookObj;
}


/**
 * Take a JSON file and make an SFM file
 * @param {string} filepath - file path of a single JSON file
 */
async function processJSON(filepath: string){
  let bookObj: books.objType = books.PLACEHOLDER_BOOK_OBJ;
  try {
    console.log(`cwd: ${process.cwd()}`);
    bookObj = require(filepath);
    //bookObj = await import(filepath, {assert: {type: "json"}});
  } catch (e) {
    console.error("Invalid JSON file. Exiting")
    process.exit(1);
  }

  // Write out valid JSON Object to SFM
  if (bookObj.header.bookInfo.code !== "000") {
    sfm.convertToSFM(bookObj, s);
  }

}


////////////////////////////////////////////////////////////////////
// End of processor functions
////////////////////////////////////////////////////////////////////

/**
 * Write JSON file (for testing purposes).
 * If filename not provided, it will be [##][XYZ][Project name].json
 * ## - 2-digit book number
 * XYZ - 3 character book code
 * Project name - Paratext project name
 * @param {books.bookType} bookObj - the book object to write to file
 * @param {filename} string - filename to write.
 */
function writeJSON(bookObj: books.objType, filename : string = '') {
  if (debugMode) {
    // Add leading 0 if book number < 10
    const padZero = bookObj.header.bookInfo.num < 10 ? '0' : '';
    if (filename == '') {
      filename = padZero + bookObj.header.bookInfo.num +
      bookObj.header.bookInfo.code + bookObj.header.projectName + '.json';
    }
    fs.writeFileSync('./' + filename, JSON.stringify(bookObj, null, 2));
    console.info(`Writing out "${filename}"`);
  }
}
