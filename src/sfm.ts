// Copyright 2022 SIL International
// Utilities for converting from USFM to JSON, and JSON to USFM or TSV
import * as books from './books.js';
import * as toolbox from './toolbox.js';
import * as sfmConsole from './sfmConsole.js';
import * as fs from 'fs';

/**
 * Regex to parse \v verse marker
 */
export const V_PATTERN = /\\v\s+(\d+)\s+(.+)/;


/**
 * Parse an SFM text file and modify the corresponding
 * book Object containing the chapter information
 * @param {book.objType} bookObj - Book object to modify
 * @param {string} file - Path to the SFM file
 * @param {sfmConsole.SFMConsole} - Object that maintains logging
 * @param {boolean} debugMode - Whether to print additional logging
 */
export function updateObj(bookObj: books.objType, file: string,
  s: sfmConsole.SFMConsole, debugMode = false) {

  let currentChapter = 1; // Start with first chapter
  // Read in SFM file and strip out empty lines
  let sfmFile = fs.readFileSync(file, 'utf-8');
  sfmFile = sfmFile.replace(/(\r?\n){2,}/g, '\r\n');
  const sfmData = sfmFile.split(/\r?\n/);
  let section_title_written = false;
  if (sfmData[sfmData.length - 1] == '') {
    // If last line empty, remove it
    sfmData.pop();
  }

  // Split each line on marker and content
  const markerPattern = /(\\_?[A-Za-z0-9]+)(\s+)?(.+)?/;
  let verseNum = 2; // Keep track of the current verse to write

  sfmData.forEach(line => {
    if (line.trim() === '') {
      // Skip
      return;
    }
    const lineMatch = line.match(markerPattern);
    // Skip markers lacking content
    if (lineMatch && lineMatch[2] != '') {
      const marker: toolbox.markerType = lineMatch[1] as toolbox.markerType;
      const content: string = lineMatch[3];
      const unit: books.unitType = {
        "type": "padding",
        "number": verseNum,
        "text": content
      };

      // Basic processing mode
      switch (marker) {
        case '\\_sh':
        case '\\ft' :
        case '\\gl' :
        case '\\ref' :
          // Markers to ignore
          break;

        // Header Markers
        case '\\h' :
          unit.type = "header";
          unit.number = 1;
          if (content) {
            unit.text = content;
          }
          bookObj.header.markers.push(unit);
          break;
        case '\\toc1' :
        case '\\toc2' :
        case '\\toc3' :
          unit.type = marker.substring(1) as books.unitSubtype;
          unit.number = 1;
          if (content) {
            unit.text = content;
          }
          bookObj.header.markers.push(unit);
          break;
        case '\\mt' :
          unit.type = "main_title";
          unit.number = 1;
          if (content) {
            unit.text = content;
          }
          bookObj.header.markers.push(unit);
          break;
        case '\\cl' :
          unit.type = "chapter_label";
          unit.number = 1; // Doesn't matter
          if (content) {
            unit.text = content;
          }
          bookObj.header.markers.push(unit);
          break;

        // Content markers
        case '\\c' :
          // Update to new current chapter
          currentChapter = parseInt(content);
          section_title_written = false;
          break;
        case '\\s' :
          // Write section content
          unit.type = "section";
          unit.text = content;
          unit.number = (section_title_written) ? 2 : 1;
          section_title_written = true;

          // Add section
          bookObj.content[currentChapter].content.push(unit);
          break;
        case '\\v' : {
          const vPatternMatch = line.trim().match(V_PATTERN);
          if (vPatternMatch) {
            verseNum = parseInt(vPatternMatch[1]);

            // Write verse
            unit.type = "verse";
            unit.number = verseNum;
            unit.text = vPatternMatch[2];
            bookObj.content[currentChapter].content.push(unit);
          }
          break;
        }
        case '\\p' : {
          // Write paragraph
          unit.type = "paragraph";
          unit.number = 1; // number doesn't matter
          unit.text = lineMatch[3] ? lineMatch[3] : '';
          bookObj.content[currentChapter].content.push(unit);
          break;
        }
        default:
          console.warn('Skipping unexpected marker:' + marker);
      }
    }
  });
}

/**
 * Parse a JSON file and converts it to USFM
 * @param {Books.objType} bookObj - a book type of JSON object
 */
export function convertToSFM(bookObj: books.objType,  s: sfmConsole.SFMConsole) {

  const ID_MARKER = "\\id ";
  const USFM_MARKER = "\\usfm ";
  const HEADER_MARKER = "\\h ";
  const TOC1_MARKER = "\\toc1 ";
  const TOC2_MARKER = "\\toc2 ";
  const TOC3_MARKER = "\\toc3 ";
  const MAIN_TITLE_MARKER = "\\mt ";
  const CHAPTER_MARKER = "\\c ";
  const CHAPTER_LABEL_MARKER = "\\cl ";
  const SECTION_MARKER = "\\s"; // number gets added later
  const PARAGRAPH_MARKER = "\n\\p";
  const VERSE_MARKER = "\\v ";
  const CRLF = "\n";


  let SFMtext = "";

  // These were the initial headers written
  /*
  SFMtext += ID_MARKER + bookObj.header.bookInfo.code + ' ' +  bookObj.header.projectName + CRLF;
  SFMtext += USFM_MARKER + '3.0' + CRLF;
  SFMtext += HEADER_MARKER + bookObj.header.bookInfo.name + CRLF;
  SFMtext += TOC1_MARKER + bookObj.header.bookInfo.name + CRLF;
  SFMtext += MAIN_TITLE_MARKER + bookObj.header.bookInfo.name + CRLF;
  */

  SFMtext += ID_MARKER + bookObj.header.bookInfo.code + ' ' +  bookObj.header.projectName + CRLF;
  bookObj.header.markers.forEach(function(marker) {
    const text = marker.text ? marker.text : '';
    switch(marker.type) {
      case "header" :
        SFMtext += HEADER_MARKER + text + CRLF;
        break;
      case "toc1" :
        SFMtext += TOC1_MARKER + text + CRLF;
        break;
      case "toc2" :
        SFMtext += TOC2_MARKER + text + CRLF;
        break;
      case "toc3" :
        SFMtext += TOC3_MARKER + text + CRLF;
        break;
      case "main_title" :
        SFMtext += MAIN_TITLE_MARKER + text + CRLF;
        break;
      case "chapter_label" :
        SFMtext += CHAPTER_LABEL_MARKER + text + CRLF;
        break;
      default:
        throw 'Invalid type on ' + JSON.stringify(marker) + '. \nUnexpected header marker.';
    }
  })

  const chapters = bookObj.content;
  chapters.forEach(function(chapter) {
    if(chapter.number != 0){
      SFMtext += CHAPTER_MARKER + chapter.number + CRLF;
      if (chapter.number == 1) {
        // For Chapter 1, marker must be followed by paragraph marker for styling in Paratext
        SFMtext += PARAGRAPH_MARKER + CRLF;
      } else {
        // For other chapters, also insert paragraph marker if there's no section header before verse 1
        if (chapter?.content && chapter.content[0].type != "section") {
          SFMtext += PARAGRAPH_MARKER + CRLF;
        }
      }
      if(chapter.content){
        const sectionsAndVerses = chapter.content;
        sectionsAndVerses.forEach(function(unit) {
          switch(unit.type) {
            case "section":
              SFMtext += SECTION_MARKER + unit.number + ' ' + unit.text + PARAGRAPH_MARKER + CRLF;
              break;
            case "verse":
              if (!unit.bridgeEnd) {
                SFMtext += VERSE_MARKER + unit.number + ' ' + unit.text + CRLF;
              } else {
                SFMtext += VERSE_MARKER + unit.number + '-' + unit.bridgeEnd + ' ' + unit.text + CRLF;
              }
              break;
            case "paragraph": {
              const text = unit.text != '' ? ' ' + unit.text : '';
              SFMtext += PARAGRAPH_MARKER + text + CRLF;
              break;
            }
            default:
              throw 'Invalid type on ' + JSON.stringify(unit) + '. \nLooking for "section" or "verse".';
          }
        });
      } else {
        s.log('info', `${bookObj.header.bookInfo.name} ch ${chapter.number} is empty`)
      }
    }
  });

  const bookNum = bookObj.header.bookInfo.num;
  const bookCode = bookObj.header.bookInfo.code;
  const projectName = bookObj.header.projectName;
  const padZero = bookObj.header.bookInfo.num < 10 ? '0': '';
  fs.writeFileSync('./' + padZero + bookNum + bookCode + projectName + '.SFM', SFMtext);
}

/**
 * Parse a JSON file and converts it to TSV. Only writing verses out
 * @param {Books.objType} bookObj - a book type of JSON object
 * @param {string} filepath - the original filename
 */
export function convertToTSV(bookObj: books.objType,  filepath: string) {
  const CRLF = "\n";

  const chapters = bookObj.content;

  let TSVtext = "";

  chapters.forEach(function(chapter) {
    if(chapter.number != 0) {
      if(chapter.content){
        chapter.content.forEach(v => {
          if (v.type == "verse") {
            TSVtext += v.number + '\t' + v.text + CRLF;
          }
        });
      }
    }
  });

  const padZero = bookObj.header.bookInfo.num < 10 ? '0': '';
  fs.writeFileSync('./' + padZero + filepath + '.TSV', TSVtext);
}
