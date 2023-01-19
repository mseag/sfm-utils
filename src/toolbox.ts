// Copyright 2022 SIL International
// Types and utilities for handling Toolbox text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books';
import * as sfmConsole from './sfmConsole';

/**
 * Enum to know what mode to parse the Toolbox file
 * TX_AS_VERSE - Each `\tx` marker creates a new verse,
 *               `\vs` is only used for section header
 * VS_AS_VERSE - `\vs` marks verse numbers along with section headers.
 *               Uses the state machine (actions)
 */
type modeType =
  "TX_AS_VERSE" |
  "VS_AS_VERSE";

/**
 * States for VS_AS_VERSE processing mode
 */
type actionType =
  "START" |                   // Initial state
  "CREATE_NEW_VERSE" |        // Create new verse entry and push to content[]
  "APPEND_TO_VERSE" |         // Append current content to last verse
  "INCREMENT_VERSE_NUM" |     // Increment verseNum (current verse counter)
  "MODIFY_VERSE_TO_SECTION" | // Change last type from verse to section section
  "MERGE_VERSES";             // Merge the previous two verses, set number = verseNum - 1
                              // This handles \vs 13b, \vs 13c, etc.

/**
 * List of recognized (escaped) Toolbox markers. We currently only process some of them
 */
export type markerType =
  // These are processed
  "\\tx" |
  "\\vs" |

  // These are ignored
  "\\_sh" |
  "\\c" |
  "\\cl" |
  "\\ft" |
  "\\gl" |
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
    const padding : books.unitType = {
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
 * @param {sfmConsole.SFMConsole} - Object that maintains logging
 * @param {boolean} debugMode - Whether to print additional logging
 */
export function updateObj(bookObj: books.objType, file: string, currentChapter: number,
    s: sfmConsole.SFMConsole, debugMode = false) {
  // Read in Toolbox file and strip out empty lines
  let toolboxFile = fs.readFileSync(file, 'utf-8');
  toolboxFile = toolboxFile.replace(/(\r?\n){2,}/g, '\r\n');
  const toolboxData = toolboxFile.split(/\r?\n/);
  const SECTION_TITLE = 'title.';
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
    // Continue the every() loop
    return true;
  });

  // Split each line on marker and content
  const markerPattern = /(\\_?[A-Za-z]+)\s?(.*)/;
  let verseNum = 1; // Keep track of the current verse to write
  let action : actionType = 'START';
  let section_title_written = false;
  toolboxData.forEach(line => {
    if (line.trim() === '') {
      // Skip
      return;
    }
    const lineMatch = line.match(markerPattern);
    // Skip markers lacking content
    if (lineMatch && lineMatch[2] != '') {
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
          case '\\_sh':
          case '\\c' :
          case '\\cl' :
          case '\\ft' :
          case '\\gl' :
          case '\\ref' :
            // Markers to ignore
            break;
          case '\\tx' :
            if (unit.text?.startsWith(SECTION_TITLE)) {
              // Treat \tx title... as \vs (section title)

              unit.type = "section";
              // Trim "title." from content string
              unit.text = unit.text.slice(SECTION_TITLE.length);
              unit.number = (section_title_written) ? 2 : 1;
              section_title_written = true;

              // Add section
              bookObj.content[currentChapter].content.push(unit);
            } else {
              // Otherwise, add a new verse
              unit.type = "verse";
              // unit.text already set
              bookObj.content[currentChapter].content.push(unit);
              verseNum++;
            }
            break;
          case '\\vs' :
            if (contentLength > 0) {
              // Convert previous line from "verse" to "section", number "1"
              bookObj.content[currentChapter].content[contentLength - 1].type = "section";
              bookObj.content[currentChapter].content[contentLength - 1].number = (section_title_written) ? 2 : 1;
              section_title_written = true;
              verseNum--;
            }
            break;
          default:
            console.warn('Skipping unexpected marker:' + marker);
        }
      } else if (mode == 'VS_AS_VERSE') {
        if (marker != "\\tx" && marker != "\\vs") {
          // Skip all other markers for now
          return;
        }
        // Determine if any other \\vs special processing needed
        let vs_section_header = false, vs_verse_bridge = false, vs_other = false;
        let bridgeStart = verseNum, bridgeEnd = verseNum; // Start and end of a verse bridge
        if (marker == '\\vs') {
          const vsPattern = /\\vs\s+\*?(\d+|\(?section title\)?|\(?section heading\)?|\(\d+-\d+\)|\[\d+-\d+\])\s?([a-z])?\??.*/;
          const vsPatternMatch = line.trim().match(vsPattern);
          if(vsPatternMatch){
            if(vsPatternMatch[1].includes('section')) {
              vs_section_header = true;
            } else if (vsPatternMatch[1].includes('-')) {
              vs_verse_bridge = true;
              // Verse bridge could be marked with (x-y) or [x-y]
              const vsBridgePattern = /(\(|\[)(\d+)-(\d+)(\)|\])/;
              const vsBridgeMatch = vsPatternMatch[1].match(vsBridgePattern);
              if (vsBridgeMatch) {
                // Determine the start and end of the verse bridge
                if (vsBridgeMatch[2]) {
                  bridgeStart = parseInt(vsBridgeMatch[2]);
                }
                if (vsBridgeMatch[3]) {
                  bridgeEnd = parseInt(vsBridgeMatch[3]);
                }
              }
            }
            if (vsPatternMatch[2] && vsPatternMatch[2] != 'a') {
              vs_other = true; // verse #-other letter besides "a"
            }
          } else {
            // Skip unrecognized \vs line
            s.log('warn', `${bookObj.header.bookInfo.name} ch ${currentChapter}: Skipping unrecognized line "${line}".`);
            return;
          }
        }

        // State machine to determine the next action.
        // See ../design/README.md for diagram
        switch (action) {
          case 'START' :
            if (marker == '\\tx') {
              action = 'CREATE_NEW_VERSE';
            }
            break;
          case 'CREATE_NEW_VERSE' :
            if (marker == '\\tx') {
              action = 'APPEND_TO_VERSE';
            } else if (vs_section_header) {
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
            } else if (vs_section_header) {
              action = 'MODIFY_VERSE_TO_SECTION'
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

        // For debugging state machine
        if (debugMode) {
          console.info(`${marker}, ${action}, ${verseNum}`);
        }

        // Process the action
        switch(action) {
          case 'START' :
            console.warn(`action: START unexpected while parsing "${file}"`);
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
            // Update verseNum to either after the end of a verse span, or increment
            //verseNum++
            verseNum = (vs_verse_bridge) ? bridgeEnd + 1 : verseNum + 1;
            break;
          case 'MERGE_VERSES' : {
            // Complicated task of merging the previous two verses, and assigning number
            const lastVerse = bookObj.content[currentChapter].content.pop();
            contentLength--;
            bookObj.content[currentChapter].content[contentLength - 1].text += lastVerse.text;
            bookObj.content[currentChapter].content[contentLength - 1].number = (vs_verse_bridge) ? bridgeStart : verseNum-1;

            if (vs_verse_bridge) {
              bookObj.content[currentChapter].content[contentLength - 1].bridgeEnd = bridgeEnd;
            }
            break;
          }
          case 'MODIFY_VERSE_TO_SECTION' :
            // Convert previous line from "verse" to "section".
            // Use section number 1 the first time section is written for the chapter
            bookObj.content[currentChapter].content[contentLength - 1].type = "section";
            bookObj.content[currentChapter].content[contentLength - 1].number =
              (section_title_written) ? 2 : 1;
            section_title_written = true;
            break;
        }
      }
    } else {
      if (lineMatch && lineMatch[2] != '') {
        s.log('warn', `Unable to parse line: "${line}" from "${file}" - skipping...`);
      }
    }

  });
  // Sanity check on verse numbers for the current chapter
  if (bookObj.header.bookInfo.versesInChapter &&
      verseNum-1 > bookObj.header.bookInfo.versesInChapter[currentChapter]) {
    s.log('warn', `${bookObj.header.bookInfo.name} ch ${currentChapter} has ` +
      `${verseNum-1} verses, should be ${bookObj.header.bookInfo.versesInChapter[currentChapter]}.`);
  }
}
