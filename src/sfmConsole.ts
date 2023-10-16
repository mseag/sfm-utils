// Copyright 2023 SIL International
// Utility to write to console along with "Extra Book A" SFM file.
import * as books from './books.js';
import * as fs from 'fs';

/**
 * Console level
 */
export type consoleType =
  "warn" | "info" | "log" | "error";

export type consoleUnitType = {
  type: consoleType;
  text: string;
}

export class SFMConsole {
  projectName: string;                   // Name of the PTX Project
  private loggingObj: consoleUnitType[]; // Object to contain logging info
  private extraBook: books.bookType;     // Info on which PTX extra book to use for logging

  constructor(projectName: string, bookCode: books.CodeType) {
    this.projectName = projectName;
    this.loggingObj = [];

    this.extraBook = books.getBookByCode(bookCode);
    if (this.extraBook.num < 94 || this.extraBook.num > 100) {
      console.error(`SFMConsole(): Book code ${bookCode} is not between Extra Book A (XXA) and Extra Book G (XXG)`);
    }
  }

  /**
   * Append to log
   * @param {consoleType} mode - level to write to console
   * @param {string} text - string to write to console and log
   */
  public log(mode: consoleType, text: string) {
    switch(mode) {
      case "warn" :
        console.warn(text);
        break;
      case "info" :
        console.info(text);
        break;
      case "log" :
        console.log(text);
        break;
      case "error" :
        console.error(text);
        break;
      default:
        console.error(`SFMConsole(): Unexpected write mode: ${mode}\n`);
    }

    const unit: consoleUnitType = {
      type: mode,
      text: text
    };
    if (this.loggingObj) {
      this.loggingObj.push(unit);
    } else {
      console.error(`SFMConsole() loggingObj not initialized`);
    }
  }

  /**
   * Write content of log to extra book file
   */
  public writeLog() {
    const LOGFILE =  './' + this.extraBook.num + this.extraBook.code + this.projectName + '.SFM';
    console.info(`Init on log ${process.cwd()} ${LOGFILE}`);
    if (fs.existsSync(LOGFILE)) {
      console.warn("Overwriting log file: " + LOGFILE);
    }

    const HEADER = '\\id ' + this.extraBook.code + ' - ' + this.projectName + '\n';
    let content = HEADER;
    this.loggingObj.forEach(l => {
      content += '\\rem ' + l.type + ': ' + l.text + '\n';
    });

    fs.writeFileSync(LOGFILE, content);
  }
}
