// Copyright 2022 SIL International
// Types and utilities for handling Toolbox text file
import * as fs from 'fs';
import * as path from 'path'

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
 * @returns {Object} - Object containing the book name and chapter number
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
    obj.bookName = match[1];
    obj.chapterNumber = parseInt(match[2])
  } else {
    console.warn('Unable to determine info from: ' + filename);
  }

  return obj;
}

/**
 * Parse a Toolbox text file and convert it to JSON
 * @param {string} file - Path to the Toolbox text file
 * @returns {Object} - Object containing the chapter information
 */
export function parse(file: string) : any {
  const bookInfo = getBookAndChapter(file);

  // Read in Toolbox file and strip out empty lines
  let toolboxFile = fs.readFileSync(file, 'utf-8');
  toolboxFile = toolboxFile.replace(/\n{2,}/g, '\n');
  const toolboxData = toolboxFile.split(/\r?\n/);

  // Parse each line
  toolboxData.forEach(line => {
    console.info('');
  });
  return {};
}

