import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Configure pdfjs-dist worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const ACCEPTED_EXTENSIONS = '.pdf,.docx,.pptx,.jpg,.jpeg,.png';

/**
 * Parses study documents (PDF, DOCX, PPTX, Images) into plain text.
 * @param {File} file 
 * @returns {Promise<{text: string, fileName: string, fileType: string, pageCount: number, wordCount: number, base64Image?: string, mimeType?: string}>}
 */
export async function parseDocument(file) {
  const fileName = file.name;
  const ext = fileName.split('.').pop().toLowerCase();
  
  let text = '';
  let pageCount = 1;
  let base64Image = null;
  let mimeType = file.type;

  try {
    if (ext === 'pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      pageCount = pdf.numPages;
      
      let fullText = '';
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map(item => item.str);
        fullText += strings.join(' ') + '\n';
      }
      text = fullText;
    } 
    else if (ext === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
      // Estimate pages based on word count (approx 300 words/page)
      pageCount = Math.ceil(text.split(/\s+/).length / 300);
    } 
    else if (ext === 'pptx') {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slides = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide'));
      pageCount = slides.length;
      
      let fullText = '';
      for (const slideName of slides) {
        const slideContent = await zip.file(slideName).async('string');
        // Extract text from slide XML (simplified)
        const slideText = slideContent.replace(/<[^>]+>/g, ' ');
        fullText += slideText + '\n';
      }
      text = fullText;
    } 
    else if (['jpg', 'jpeg', 'png'].includes(ext)) {
      text = `[Image Content: ${fileName}]`;
      pageCount = 1;
      base64Image = await fileToBase64(file);
    }
  } catch (err) {
    console.error('Document parsing failed:', err);
    throw new Error('Could not extract text from document. Ensure it is not password protected.');
  }

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return {
    text: text.trim(),
    fileName,
    fileType: ext === 'jpeg' ? 'jpg' : ext,
    pageCount,
    wordCount,
    base64Image,
    mimeType
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}
