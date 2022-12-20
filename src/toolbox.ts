// Copyright 2022 SIL International
// Types and utilities for handling Toolbox text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books';

/**
 * List of recognized (escaped) Toolbox markers
 */
export type lineType =
  "\\c" |
  "\\tx" |
  "\\vs";

/**
 * Information about the Toolbox text file based on the filename
 */
export interface fileInfoType {
  bookName: string;
  chapterNumber: number;
}

export interface unitType {
  type: string,
  number: number,
  content?: any,
  text?: string
}

export interface objType {
  header: {
    projectName: string,
    bookInfo:  books.bookType
  },
  content: unitType[]
}

/**
 * Extract a book name and chapter number from the filename
 * @param {string} file - Path to the Toolbox text file
 * @returns {fileInfoType} - Object containing the book name and chapter number
 */
export function getBookAndChapter(file: string) : fileInfoType {
  const filename = path.parse(file).base;
  const pattern = new RegExp(/^([A-Za-z]+)_Ch(\d+)_.*\.txt$/);
  const match = filename.match(pattern);
  const obj: fileInfoType = {
    bookName: '',
    chapterNumber: 0
  };
  if (match) {
    // Fix any typo in book name
    const b = new books.Books();
    const bookName = b.getBookByName(match[1]).name;
    obj.bookName = bookName;
    obj.chapterNumber = parseInt(match[2]);
  } else {
    console.warn('Unable to determine info from: ' + filename);
  }

  return obj;
}

export function initializeBookObj(bookName: string, projectName: string) : any {
  const b = new books.Books();
  const bookType = b.getBookByName(bookName);

  // Initialize book object and content for the number of chapters
  const bookObj : objType = {
    "header": {
      "projectName" : projectName,
      "bookInfo" : bookType
    },
    "content": []
  };

  // Intialize book object with padding for each chapter
  // index 0 is extra padding since chapters are 1-based
  for (let i = 0; i < bookType.chapters+1; i++) {
    const padding = {
      "type": "padding",
      "number": i
    };
    bookObj.content.push(padding);
  }

  return bookObj;
}

/**
 * Parse a Toolbox text file and convert it to JSON
 * @param {string} file - Path to the Toolbox text file
 * @param {string} projectName - Name of the Paratext project
 * @returns {Object} - Object containing the chapter information
 */
export function parse(file: string, projectName: string) : any {
  const bookInfo = getBookAndChapter(file);
  const currentChapter = bookInfo.chapterNumber;
  const bookObj = initializeBookObj(bookInfo.bookName, projectName);

  // Read in Toolbox file and strip out empty lines (assuming Windows line-endings)
  let toolboxFile = fs.readFileSync(file, 'utf-8');
  toolboxFile = toolboxFile.replace(/(\r\n){2,}/g, '\r\n');
  const toolboxData = toolboxFile.split(/\r?\n/);
  if (toolboxData[toolboxData.length - 1] == '') {
    // If last line empty, remove it
    toolboxData.pop();
  }

  // Split each line on type and content
  const pattern = new RegExp(/^(\\{2}[A-Za-z]+)\s(.*)$/);
  toolboxData.forEach(line => {
    const match = line.match(pattern);
    if (match) {
      const type: lineType = match[1] as lineType;
      const content: string = match[2];
      switch (type) {
        case '\\c' :
          break;
        case '\\tx' :
          // Assume we're adding a verse

          break;
        case '\\vs' :
          // Convert previous line from "verse" to "section"

          break;
        default:
          console.warn('Unexpected line type:' + type);
      }

    } else {
      console.warn('Unable to parse line: ' + line);
    }

  });
  return bookObj;
}

