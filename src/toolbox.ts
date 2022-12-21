// Copyright 2022 SIL International
// Types and utilities for handling Toolbox text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books';

/**
 * List of recognized (escaped) Toolbox markers. We only process some of them
 */
export type markerType =
  // These are processed
  "\\tx" |
  "\\vs" |

  // These are ignored
  "\\c" |
  "\\ref" |
  "\\t" ;

/**
 * Information about the Toolbox text file based on the filename
 */
export interface fileInfoType {
  bookName: string;
  chapterNumber: number;
}

/**
 * Extract a book name and chapter number from the filename
 * @param {string} file - Path to the Toolbox text file
 * @returns {fileInfoType} - Object containing the book name and chapter number
 */
export function getBookAndChapter(file: string) : fileInfoType {
  const filename = path.parse(file).base;
  const pattern = /([0-9A-Za-z]+)_(Ch|ch)?(\d+)[_\s]?.*\.txt/;
  const match = filename.match(pattern);
  const obj: fileInfoType = {
    bookName: "Placeholder",
    chapterNumber: 0
  };
  if (match) {
    // Fix any typo in book name
    const bookName = books.getBookByName(match[1]).name;
    if (bookName !== "Placeholder") {
      obj.bookName = bookName;
      obj.chapterNumber = parseInt(match[3]);
    }
  } else {
    console.warn('Unable to determine info from: ' + filename);
  }

  return obj;
}

/**
 *
 * @param {string} bookName - canonical book name
 * @param {string} projectName - Paratext project name
 * @returns {books.objType} - Initialized object for the current book,
 *         with padding for the expected number of chapters
 */
export function initializeBookObj(bookName: string, projectName: string) : books.objType {
  const bookType = books.getBookByName(bookName);

  // Initialize book object and content for the number of chapters
  const bookObj : books.objType = {
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
 * Parse a Toolbox text file and modify the corresponding
 * book Object containing the chapter information
 * @param {book.objType} bookObj - Book object to modify
 * @param {string} file - Path to the Toolbox text file
 * @param {number} currentChapter - Book chapter to modify
 */
export function updateObj(bookObj: books.objType, file: string, currentChapter: number) {
  // Read in Toolbox file and strip out empty lines (assuming Windows line-endings)
  let toolboxFile = fs.readFileSync(file, 'utf-8');
  toolboxFile = toolboxFile.replace(/(\r\n){2,}/g, '\r\n');
  const toolboxData = toolboxFile.split(/\r?\n/);
  if (toolboxData[toolboxData.length - 1] == '') {
    // If last line empty, remove it
    toolboxData.pop();
  }

  // Split each line on type and content
  const pattern = /(\\[A-Za-z]+)\s(.*)/;
  let verseNum = 1;
  toolboxData.forEach(line => {
    const match = line.match(pattern);
    if (match) {
      const marker: markerType = match[1] as markerType;
      const content: string = match[2];
      const unit: books.unitType = {
        "type": "padding",
        "number": verseNum,
        "text": content
      };
      const contentLength = bookObj.content[currentChapter].content.length;

      switch (marker) {
        case '\\c' :
          // Markers to ignore
          break;
        case '\\tx' :
          // Assume we're adding a verse
          unit.type = "verse";
          unit.text
          bookObj.content[currentChapter].content.push(unit);
          verseNum++;
          break;
        case '\\vs' :
          // Convert previous line from "verse" to "section", number "1"
          if (contentLength > 0) {
            bookObj.content[currentChapter].content[contentLength - 1].type = "section";
            bookObj.content[currentChapter].content[contentLength - 1].number = 1;
            verseNum--;
          } else {
            console.warn('Warning, section without text');
          }

          break;
        default:
          console.warn('Skipping unexpected marker:' + marker);
      }

    } else {
      console.warn(`Unable to parse line: "${line}" from "${file}" - skipping...`);
    }

  });
}
