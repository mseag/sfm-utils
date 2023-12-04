// Copyright 2022 SIL International
// Utilities for converting a JSON file to USFM
import * as books from './books.js';
import * as sfmConsole from './sfmConsole.js';
import * as fs from 'fs';

/**
 * Parse a JSON file and converts it to USFM
 * @param {Books.objType} bookObj - a book type of JSON object
 */
export function convertToSFM(bookObj: books.objType,  s: sfmConsole.SFMConsole) {

  const ID_MARKER = "\\id ";
  const USFM_MARKER = "\\usfm ";
  const HEADER_MARKER = "\\h ";
  const TOC_MARKER = "\\toc1 ";
  const MAIN_TITLE_MARKER = "\\mt ";
  const CHAPTER_MARKER = "\\c ";
  const SECTION_MARKER = "\\s"; // number gets added later
  const PARAGRAPH_MARKER = "\n\\p";
  const VERSE_MARKER = "\\v ";
  const CRLF = "\n";

  const chapters = bookObj.content;

  let SFMtext = "";

  SFMtext += ID_MARKER + bookObj.header.bookInfo.code + ' ' +  bookObj.header.projectName + CRLF;
  SFMtext += USFM_MARKER + '3.0' + CRLF;
  SFMtext += HEADER_MARKER + bookObj.header.bookInfo.name + CRLF;
  SFMtext += TOC_MARKER + bookObj.header.bookInfo.name + CRLF;
  SFMtext += MAIN_TITLE_MARKER + bookObj.header.bookInfo.name + CRLF;


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
 * Parse a JSON file and converts it to TSV
 * @param {Books.objType} bookObj - a book type of JSON object
 * @param {string} filepath - the original filename
 */
export function convertToTSV(bookObj: books.objType,  filepath: string) {
  const CRLF = "\n";

  const chapters = bookObj.content;

  let CSVtext = "";

  chapters.forEach(function(chapter) {
    if(chapter.number != 0) {
      if(chapter.content){
        chapter.content.forEach(v => {
          CSVtext += v.number + '\t' + v.text + CRLF;
        });
      }
    }
  });

  const padZero = bookObj.header.bookInfo.num < 10 ? '0': '';

  fs.writeFileSync('./' + padZero + filepath + '.TSV', CSVtext);
}
