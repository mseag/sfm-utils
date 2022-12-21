// Copyright 2022 SIL International
// Types and utilities for handling Toolbox text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books';

/**
 * Enum to know what mode to parse the Toolbox file
 * TX_AS_VERSE - each \tx is a separate verse
 * VS_AS_VERSE - depend on \vs to mark verse numbers
 */
type modeType =
  "TX_AS_VERSE" |
  "VS_AS_VERSE";

/**
 * States for VS_AS_VERSE processing mode
 */
type actionType =
  "START" |                   // Initial state
  "CREATE_NEW_VERSE" |        // Create new verse and push to content[]
  "APPEND_TO_VERSE" |         // Append to last verse
  "INCREMENT_VERSE_NUM" |     // Increment verseNum
  "MODIFY_VERSE_TO_SECTION" | // Change last verse type to section
  "MERGE_VERSES";             // Merge last two verses, set number = verseNum - 1

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

  // Initialize book object with padding for each chapter
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

  // Determine the mode of how to process the file
  let mode: modeType = 'TX_AS_VERSE';
  const modePattern = /\\vs\s+\d+/;
  toolboxData.every(line => {
    if (line.match(modePattern)) {
      // Change mode and break out
      mode = 'VS_AS_VERSE';
      return false;
    }
    // Continue the very() loop
    return true;
  });

  // Split each line on marker and content
  const markerPattern = /(\\[A-Za-z]+)\s(.*)/;
  let verseNum = 1; // Keep track of the current verse to write
  let action : actionType = 'START';
  //let mostRecentTXcontent = "";
  toolboxData.forEach(line => {
    const lineMatch = line.match(markerPattern);
    if (lineMatch) {
      const marker: markerType = lineMatch[1] as markerType;
      const content: string = lineMatch[2];
      const unit: books.unitType = {
        "type": "padding",
        "number": verseNum,
        "text": content
      };
      let contentLength = bookObj.content[currentChapter].content.length;

      if (mode == 'TX_AS_VERSE') {
        // Basic processing mode
        switch (marker) {
          case '\\c' :
            // Markers to ignore
            break;
          case '\\tx' :
            // Add a new verse
            unit.type = "verse";
            // unit.text already set
            bookObj.content[currentChapter].content.push(unit);
            verseNum++;
            break;
          case '\\vs' :
            if (contentLength > 0) {
              // Convert previous line from "verse" to "section", number "1"
              bookObj.content[currentChapter].content[contentLength - 1].type = "section";
              bookObj.content[currentChapter].content[contentLength - 1].number = 1;
              verseNum--;
            }
            break;
          default:
            console.warn('Skipping unexpected marker:' + marker);
        }
      } else if (mode == 'VS_AS_VERSE') {
        // Determine if any other \\vs special processing needed
        let vs_a = false, vs_other = false, modify_verse_to_header = false;
        if (marker == '\\vs') {
          const vsPattern = /\\vs\s+\*?(\d+|\(section title\))([a-z])?.*/;
          const vsPatternMatch = line.match(vsPattern);
          if(vsPatternMatch){
            if(vsPatternMatch[1] == '(section title)') {
              modify_verse_to_header = true;
            } else if (vsPatternMatch[2] == 'a') {
              vs_a = true;     // verse #a
            } else if (vsPatternMatch[2]) {
              vs_other = true; // verse #-other letter
            }
          }
        }

        // State machine to determine the next action
        switch (action) {
          case 'START' :
            if (marker == '\\tx') {
              action = 'CREATE_NEW_VERSE';
            }
            break;
          case 'CREATE_NEW_VERSE' :
            if (marker == '\\tx') {
              action = 'APPEND_TO_VERSE';
            } else if (modify_verse_to_header) {
              action = 'MODIFY_VERSE_TO_SECTION';
            } else if (vs_other) {
              action = 'MERGE_VERSES';
            } else if (marker == '\\vs') {
              action = 'INCREMENT_VERSE_NUM';
            }
            break;
          case 'APPEND_TO_VERSE' :
            if (marker == '\\tx') {
              action = 'APPEND_TO_VERSE'
            } else if (vs_other) {
              action = 'MERGE_VERSES';
            } else if (vs_a) {
              action = 'INCREMENT_VERSE_NUM';
            } else if (marker == '\\vs') {
              action = 'INCREMENT_VERSE_NUM';
            }
            break;
          case 'INCREMENT_VERSE_NUM' :
            if (marker == '\\tx') {
              action = 'CREATE_NEW_VERSE';
            }
            break;
          case 'MERGE_VERSES' :
            if (marker == '\\tx') {
              action = 'CREATE_NEW_VERSE';
            }
            break;
          case 'MODIFY_VERSE_TO_SECTION' :
            if (marker == '\\tx') {
              action = 'CREATE_NEW_VERSE';
            }
            break;
          default :
            console.warn('Unexpected action state: ' + action);
        }

        // Process the action
        switch(action) {
          case 'START' :
            console.warn('action: START unexpected');
            break;
          case 'CREATE_NEW_VERSE' :
            // Create new verse and add
            unit.type = "verse";
            unit.number = verseNum;
            unit.text = content;
            bookObj.content[currentChapter].content.push(unit);
            break;
          case 'APPEND_TO_VERSE' :
            if (contentLength > 0) {
              bookObj.content[currentChapter].content[contentLength - 1].text += content;
            } else {
              console.warn('action: APPEND_TO_VERSE but content is empty');
            }
            break;
          case 'INCREMENT_VERSE_NUM' :
            verseNum++;
            break;
          case 'MERGE_VERSES' : {
            // Complicated task of merging the previous two verses, and assigning number = verseNum-1
            const lastVerse = bookObj.content[currentChapter].content.pop();
            contentLength--;
            bookObj.content[currentChapter].content[contentLength - 1].text += lastVerse.text;
            bookObj.content[currentChapter].content[contentLength - 1].number = verseNum-1;
            break;
          }
          case 'MODIFY_VERSE_TO_SECTION' :
            // Convert previous line from "verse" to "section", number "1"
            bookObj.content[currentChapter].content[contentLength - 1].type = "section";
            bookObj.content[currentChapter].content[contentLength - 1].number = 1;
            break;
        }
      }
    } else {
      console.warn(`Unable to parse line: "${line}" from "${file}" - skipping...`);
    }

  });
}
