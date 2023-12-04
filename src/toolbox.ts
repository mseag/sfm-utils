// Copyright 2022 SIL International
// Types and utilities for handling Toolbox text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books.js';
import * as sfmConsole from './sfmConsole.js';

/**
 * Enum to know what mode to parse the Toolbox file
 * TX_AS_VERSE - Each `\tx` marker creates a new verse,
 *               `\vs` is only used for section header
 * VS_AS_VERSE - `\vs` marks verse numbers along with section headers.
 *               Uses the state machine (actions)
 */
type modeType =
  "TX_AS_VERSE" |
  "VS_AS_VERSE" |
  "V_AS_VERSE";

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
  "\\v"  |

  // These are ignored
  "\\_sh" |
  "\\c" |
  "\\cl" |
  "\\ft" |
  "\\gl" |
  "\\ref" |
  "\\t" ;

/**
 * Verse start and end of a verse bridge
 */
export interface bridgeType {
  start: number;
  end: number;
}

  /**
 * Regex to parse all the variations of \vs marker (along with all the optional punctuation marks)
 * \vs (section title)
 * \vs (section heading)
 * \vs (13-14) b
 * \vs [13-14] b
 * \vs 13-14 (b)
 */
export const VS_PATTERN = /\\vs\s+\*?(\d+|\(?section title\)?|\(?section heading\)?|\(\d+-\d+\)|\[\d+-\d+\]|\d+-\d+)\s?\(?([a-z])?\)?\??.*/;

export const V_PATTERN = /\\v\s+(\d+)\s+(.+)/;

/**
 * Regex to parse all the variations of verse bridges to extract verse ranges
 * (13-14)
 * [13-14]
 * 13-14
 * 13a-14b
 */
export const VS_BRIDGE_PATTERN = /(\(|\[)?(\d+)[a-z]?-(\d+)[a-z]?(\)|\])?/;

/**
 * Information about the Toolbox text file based on the filename
 */
export interface fileInfoType {
  bookName: string;
  chapterNumber: number;
}

/**
 * Determine the start and stop of a verse bridge
 * @param {string} line - \vs line containing a verse bridge
 * @param {number} verseNum - current verse number
 */
export function getVerseBridge(line: string, verseNum: number) : bridgeType {
  const bridge: bridgeType = {
    start: verseNum,
    end: verseNum
  };
  const vsBridgeMatch = line.match(VS_BRIDGE_PATTERN);
  if (vsBridgeMatch) {
    // Determine the start and end of the verse bridge
    if (vsBridgeMatch[2]) {
      bridge.start = parseInt(vsBridgeMatch[2]);
    }
    if (vsBridgeMatch[3]) {
      bridge.end = parseInt(vsBridgeMatch[3]);
    }
  }

  return bridge;
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

  const patternSFM = /([0-9]{2})([0-9A-Za-z]{3}).+\.(SFM|sfm)/;
  const matchSFM = filename.match(patternSFM);

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
   // Attempt to parse SFM file name
  } else if (matchSFM) {
    const bookCode = matchSFM[2] as books.CodeType;
    const bookName = books.getBookByCode(bookCode).name;
    if (bookName !== "Placeholder") {
      obj.bookName = bookName;
      // obj.chapterNumber TODO
    }
    obj.chapterNumber = 1; // Special dataset to put everything into chapter 1
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
  const modePatternVS = /\\vs\s+\d+/;
  const modePatternV = /\\v\s+\d+.*/;
  toolboxData.every(line => {
    if (line.match(modePatternVS)) {
      mode = 'VS_AS_VERSE';
      return false;
    } else if (line.match(modePatternV)) {
      // Change mode and break out
      mode = 'V_AS_VERSE';
      return false;
    }
    // Continue the every() loop
    return true;
  });

  // Split each line on marker and content
  const markerPattern = /(\\_?[A-Za-z]+)\s?(.*)/;
  let verseNum = 2; // Keep track of the current verse to write
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
        // Start and end of a verse bridge
        let  bridge : bridgeType = {
          start: verseNum,
          end: verseNum
        }
        if (marker == '\\vs') {
          const vsPatternMatch = line.trim().match(VS_PATTERN);
          if(vsPatternMatch){
            if(vsPatternMatch[1].includes('section')) {
              vs_section_header = true;
            } else if (vsPatternMatch[1].includes('-')) {
              vs_verse_bridge = true;
              bridge = getVerseBridge(vsPatternMatch[1], verseNum);
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
            verseNum = (vs_verse_bridge) ? bridge.end + 1 : verseNum + 1;
            break;
          case 'MERGE_VERSES' : {
            // Complicated task of merging the previous two verses, and assigning number
            const lastVerse = bookObj.content[currentChapter].content.pop();
            contentLength--;
            bookObj.content[currentChapter].content[contentLength - 1].text += lastVerse.text;
            bookObj.content[currentChapter].content[contentLength - 1].number = (vs_verse_bridge) ? bridge.start : verseNum-1;

            if (vs_verse_bridge) {
              bookObj.content[currentChapter].content[contentLength - 1].bridgeEnd = bridge.end;
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
      } else if (mode == 'V_AS_VERSE') {
        if (marker != "\\tx" && marker != "\\v") {
          // Skip all other markers for now
          return;
        }
        if (marker == '\\v') {
          const vsPatternMatch = line.trim().match(V_PATTERN);
          if(vsPatternMatch){
            verseNum = parseInt(vsPatternMatch[1]);

            unit.type = "verse";
            unit.number = verseNum;
            unit.text = vsPatternMatch[2];
            bookObj.content[currentChapter].content.push(unit);
          } else {
            // Skip unrecognized \vs line
            s.log('warn', `${bookObj.header.bookInfo.name} ch ${currentChapter}: Skipping unrecognized line "${line}".`);
            return;
          }
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
