// Copyright 2022 SIL International
// Utilities for handling file paths
import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively push to an array all the txt file paths from inside a given directory
 * @param { string } directory - a path to a directory to recurse through
 * @param { string[] } fileArray - a string array to fill with the paths of txt/rtf files
 */
export function getTextFilesInside(directory: string, fileArray: string[]){
  fs.readdirSync(directory).forEach(function(item){
    const absolutePath = path.join(directory, item);
    if (fs.statSync(absolutePath).isDirectory()){
      return getTextFilesInside(absolutePath, fileArray);
    } else{
      if (item.substring(item.lastIndexOf('.')+1, item.length).match(/txt|rtf/)) {
        fileArray.push(absolutePath);
      }
      return;
    }
  });
}

/**
 * Check the first level of a directory to find book directories
 * @param { string } superDirectory - a path to a directory to search for book directories
 */
export function getBookDirectories(superDirectory: string, bookDirectoryArray: string[]){
  fs.readdirSync(superDirectory).forEach(function(item) {
    const absolutePath = path.join(superDirectory, item);
    if (fs.statSync(absolutePath).isDirectory()) {
      bookDirectoryArray.push(absolutePath);
    }
  })
}
