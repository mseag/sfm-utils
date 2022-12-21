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
  let verseNum = 1;
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
      const contentLength = bookObj.content[currentChapter].content.length;
      if(verseNum==19){
        const temp = 1;
      }

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
      }

      // else if (mode == 'VS_AS_VERSE') {

      //   switch (marker) {
      //     case '\\c' :
      //       // Markers to ignore
      //       break;
      //     case '\\tx' :
      //       mostRecentTXcontent = content;

      //       if(mode == 'VS_AS_VERSE') {
      //         if (contentLength > 0 && bookObj.content[currentChapter].content[contentLength - 1].type == "verse" &&
      //             verseNum == bookObj.content[currentChapter].content[contentLength - 1].number) {
      //           // If previous line was also \\tx and matches verse number, append content to the last verse
      //           bookObj.content[currentChapter].content[contentLength - 1].text += content;
      //         } else {
      //           // Create new verse and add
      //           unit.type = "verse";
      //           unit.number = verseNum;
      //           unit.text = content;
      //           bookObj.content[currentChapter].content.push(unit);
      //         }
      //       } else if (mode == 'TX_AS_VERSE') {
      //         // Add a new verse
      //         unit.type = "verse";
      //         // unit.text already set
      //         bookObj.content[currentChapter].content.push(unit);
      //         verseNum++;
      //       }
      //       break;
      //     case '\\vs' :
      //       if (contentLength > 0) {
      //         if (mode == 'TX_AS_VERSE'){
      //           // Convert previous line from "verse" to "section", number "1"
      //           bookObj.content[currentChapter].content[contentLength - 1].type = "section";
      //           bookObj.content[currentChapter].content[contentLength - 1].number = 1;
      //           verseNum--;
      //         } else if (mode == 'VS_AS_VERSE') {
      //           const vsPattern = /\\vs\s+\*?(\d+|\(section title\))([a-z])?.*/;
      //           const vsPatternMatch = line.match(vsPattern);
      //           if(vsPatternMatch){
      //             if(vsPatternMatch[1] == '(section title)'){
      //               //If there shouldn't be a verse before the section header (all that's in the last unit's text is header text), change the verse to a section
      //               if(bookObj.content[currentChapter].content[contentLength - 1].text == mostRecentTXcontent){
      //                 bookObj.content[currentChapter].content[contentLength - 1].type = "section";
      //                 bookObj.content[currentChapter].content[contentLength - 1].number = 1;
      //               }
      //               // If there are verse lines before the section header, un-append the header text from them
      //               else if(contentLength>1 && bookObj.content[currentChapter].content[contentLength - 1].type == "verse"){
      //                 bookObj.content[currentChapter].content[contentLength - 1].text = bookObj.content[currentChapter].content[contentLength - 1].text.replace(mostRecentTXcontent, '');
      //                 bookObj.content[currentChapter].content[contentLength - 1].type = "verse";
      //                 bookObj.content[currentChapter].content[contentLength - 1].number = verseNum;
      //                 verseNum++;
      //                 // And push a section header unit
      //                 const sectionHeaderUnit: books.unitType = {
      //                   "type": "section",
      //                   "number": 1,
      //                   "text": mostRecentTXcontent
      //                 };
      //                 bookObj.content[currentChapter].content.push(sectionHeaderUnit);
      //               }

      //             } else {
      //               verseNum = parseInt(vsPatternMatch[1]) + 1;
      //               if(vsPatternMatch[2] && parseInt(vsPatternMatch[1]) == bookObj.content[currentChapter].content[contentLength - 1].number){
      //                 verseNum = parseInt(vsPatternMatch[1]);
      //                 }
      //               }
      //             }

      //           }
      //         } else {
      //         console.warn('Warning, section without text');
      //       }
      //       break;

      //     default:
      //       console.warn('Skipping unexpected marker:' + marker);
      //   }

    } else {
      console.warn(`Unable to parse line: "${line}" from "${file}" - skipping...`);
    }

  });
}
