import * as books from './books';
import * as fs from 'fs';

/**
 * Parse a JSON file and converts it to USFM
 * @param {Books.objType} bookObj - a book type of JSON object
 */
export function convertToSFM(bookObj: books.objType) : any {

  const ID_MARKER = "\\id ";
  const USFM_MARKER = "\\usfm ";
  const HEADER_MARKER = "\\h ";
  const TOC_MARKER = "\\toc ";
  const MAIN_TITLE_MARKER = "\\mt ";
  const CHAPTER_MARKER = "\\c ";
  const SECTION_MARKER = "\\s1 ";
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
      if(chapter.content){
        const sectionsAndVerses = chapter.content;
        sectionsAndVerses.forEach(function(unit) {
          switch(unit.type) {
            case "section":
              SFMtext += SECTION_MARKER + unit.text + PARAGRAPH_MARKER + CRLF;
              break;
            case "verse":
              SFMtext += VERSE_MARKER + unit.number + ' ' + unit.text + CRLF;
              break;
            default:
              throw 'Invalid type on ' + JSON.stringify(unit) + '. \nLooking for "section" or "verse".';
          }
        });
      }
    }
  });

  const bookNum = bookObj.header.bookInfo.num;
  const bookCode = bookObj.header.bookInfo.code;
  const projectName = bookObj.header.projectName;
  const padZero = bookObj.header.bookInfo.num < 10 ? '0': '';
  fs.writeFileSync('./' + padZero + bookNum + bookCode + projectName + '.SFM', SFMtext);

}
