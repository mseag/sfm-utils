// Copyright 2023 SIL International
// Types and utilities for handling back translation rtf text file
import * as fs from 'fs';
import * as path from 'path'
import * as books from './books';
const {UnRTF } = require("node-unrtf");
import * as sfmConsole from './sfmConsole';
import * as toolbox from './toolbox';

/**
 * Regex for line containing verse(s)
 */
export const VERSE_LINE_PATTERN = /[vV](\d)+(.+)/;

/**
 * Regex for individual verses
 */
export const VERSE_PATTERN = /(\d+)(.*)/;

/**
 * Extract a book name and chapter number from the filename
 * @param {string} file - Path to the Toolbox text file
 * @returns {fileInfoType} - Object containing the book name and chapter number
 */
export function getBookAndChapter(file: string) : toolbox.fileInfoType {
  const filename = path.parse(file).base;
  const pattern = /Lem(\w+)(\d+)\.rtf/;
  const match = filename.match(pattern);
  const obj: toolbox.fileInfoType = {
    bookName: "Placeholder",
    chapterNumber: 0
  };
  if (match) {
    // Fix any typo in book name
    const bookName = books.getBookByName(match[1]).name;
    if (bookName !== "Placeholder") {
      obj.bookName = bookName;
      obj.chapterNumber = parseInt(match[2]);
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
  const unRtf = new UnRTF("/usr/bin"); // Assumes Linux installed unrtf
  const options = {
    outputText: true
  };

  // Convert RTF to raw text, dropping the first 10 rows (9 rows rtf metadata + 1 row title). Lines split by newlines
  let backTranslation = await unRtf.convert(file, options);
  backTranslation = backTranslation.replace(/(\r?\n){2,}/g, '\r\n');
  const backTranslationData = backTranslation.split(/\r?\n/).splice(10);

  const SECTION_TITLE = 'title.';
  if (backTranslationData[backTranslationData.length - 1] == '') {
    // If last line empty, remove it
    backTranslationData.pop();
  }

  backTranslationData.forEach(l => {
    const versesMatch = l.match(VERSE_LINE_PATTERN);
    if (versesMatch) {
      // Process verses
      let escapedLine = l.replace(/\s?[vV](\d+)\s?/g,'\\v$1');
      let splitVerses = escapedLine.split(/\\v/);
      splitVerses.forEach(verse => {
        if (verse?.length > 0) {
          let verseMatch = verse.match(VERSE_PATTERN);
          if (verseMatch) {
            console.log('verse ' + verseMatch[1] + ': ' + verseMatch[2]);
          } else {
            console.error('Unable to split ' + verse);
          }
        }
      });

      console.log(l + '\n');
    } else {
      // Process section header
      console.log('header: ' + l + '\n');
    }

  });
  
}