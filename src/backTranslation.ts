// Copyright 2023 SIL International
// Types and utilities for handling back translation rtf text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books';
const {UnRTF } = require("node-unrtf");
import * as os from 'os';
import * as sfmConsole from './sfmConsole';
import * as toolbox from './toolbox';

/**
 * Regex for line containing verse(s)
 */
export const VERSE_LINE_PATTERN = /[vV](\d)+(.+)/;

/**
 * Regex for verse/multiple verses and text
 */
export const VERSE_PATTERN = /(\d+)-?(\d+)?\s?(.*)/;

/**
 * Extract a book name and chapter number from the filename
 * @param {string} file - Path to the Toolbox text file
 * @returns {fileInfoType} - Object containing the book name and chapter number
 */
export function getBookAndChapter(file: string) : toolbox.fileInfoType {
  const filename = path.parse(file).base;
  const pattern = /(Lem|lem)?(\d*\D+)(\d+)\D?\.rtf/;
  const match = filename.match(pattern);
  const obj: toolbox.fileInfoType = {
    bookName: "Placeholder",
    chapterNumber: 0
  };
  if (match) {
    // Fix any typo in book name
    const bookName = books.getBookByName(match[2].trim()).name;
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
 * Parse a back translation rtf text file and modify the corresponding
 * book Object containing the chapter information
 * @param {book.objType} bookObj - Book object to modify
 * @param {string} file - Path to the Toolbox text file
 * @param {number} currentChapter - Book chapter to modify
 * @param {sfmConsole.SFMConsole} - Object that maintains logging
 * @param {boolean} debugMode - Whether to print additional logging
 */
export async function updateObj(bookObj: books.objType, file: string, currentChapter: number,
    s: sfmConsole.SFMConsole, debugMode = false) {
  if (!os.type().startsWith('Linux')) {
    console.error("unRtf needs to run on Linux");
    process.exit(1);
  }  
  const unRtfPath = os.type().startsWith('Linux') ? "/usr/bin" : ""; // Path for UnRtf
  const unRtf = new UnRTF(unRtfPath);
  const options = {
    outputText: true
  };
  let section_title_written = false;
  let verseNum = 1; // Keep track of the current verse to write

  // Convert RTF to raw text. Lines split by newlines
  let backTranslation = await unRtf.convert(file, options);
  backTranslation = backTranslation.replace(/(\r?\n){2,}/g, '\r\n');
  let backTranslationData = backTranslation.split(/\r?\n/);

  // Remove empty lines, along with rtf metadata and title
  backTranslationData = backTranslationData.filter(item => item);
  backTranslationData.forEach(l => { 
    if (l.startsWith('###') || l.startsWith('AUTHOR:') || l.startsWith('---') || l.startsWith('Lem')) {
      // Skip rtf metadata and title
      return;
    }
    const versesMatch = l.match(VERSE_LINE_PATTERN);
    if (versesMatch) {
      // Split verses into separate lines and process them
      const escapedLine = l.replace(/\s?[vV](\d+)\s?/g,'\\v$1');
      let splitVerses = escapedLine.split(/\\v/);
      splitVerses = splitVerses.filter(item => item);
      splitVerses.forEach(verse => {
        const verseMatch = verse.match(VERSE_PATTERN);
        if (verseMatch) {
          verseNum = verseMatch[2] ? verseMatch[2] : verseMatch[1];

          // Add a new verse
          const unit: books.unitType = {
            type: "verse",
            text: verseMatch[3],
            number: verseMatch[1]
          };
          if (verseMatch[2]) {
            unit.bridgeEnd = verseMatch[2];
          }

          bookObj.content[currentChapter].content.push(unit);
          //console.log('verse ' + verseMatch[1] + ': ' + verseMatch[2]);
        } else {
          // Parsing error. Possibly section header split a verse, so join with the last verse
          let contentLength = bookObj.content[currentChapter].content.length;
          if (contentLength > 1) {
            bookObj.content[currentChapter].content[contentLength-2].text += ' (split section) ' + verse;
          }
          s.log('warn', `Stray verse, appending to previous verse in ${bookObj.header.bookInfo.name} ` +
            `${currentChapter}:${verseNum} with: ${verse}`);
        }
      });

      //console.log(l + '\n');
    } else {
      // Process section header
      const unit: books.unitType = {
        type: "section",
        text: l.trim(),
        number: (section_title_written) ? 2 : 1
      };
      section_title_written = true;

      // Add section
      bookObj.content[currentChapter].content.push(unit);
      //console.log('header: ' + l + '\n');
    }

  });

  // Sanity check on verse numbers for the current chapter
  if (bookObj.header.bookInfo.versesInChapter &&
      verseNum-1 > bookObj.header.bookInfo.versesInChapter[currentChapter]) {
    s.log('warn', `${bookObj.header.bookInfo.name} ch ${currentChapter} has ` +
      `${verseNum-1} verses, should be ${bookObj.header.bookInfo.versesInChapter[currentChapter]}.`);
  }

  if (bookObj.header.bookInfo.versesInChapter &&
      bookObj.header.bookInfo.versesInChapter[currentChapter] != verseNum) {
    s.log('warn', `${bookObj.header.bookInfo.name} ${currentChapter} expected ` +
      `${bookObj.header.bookInfo.versesInChapter[currentChapter]} verses but got ${verseNum}`); 
  }

}
