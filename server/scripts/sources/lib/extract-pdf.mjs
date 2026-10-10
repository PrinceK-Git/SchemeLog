/**
 * PDF text extraction with page locators. pdfjs runs in Node with JavaScript
 * evaluation disabled, and no PDF is ever opened by the app.
 */

/**
 * @param {Buffer} buffer
 * @returns {Promise<{ pages: { page: number, text: string }[], needsOcr: boolean }>}
 */
export async function extractPdf(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
    // No network access while parsing: standard fonts and cmaps stay local.
    useWorkerFetch: false,
  });
  const document = await task.promise;
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = '';
      let lastY = null;
      for (const item of content.items) {
        if (typeof item.str !== 'string') continue;
        const y = item.transform?.[5];
        if (lastY !== null && y !== undefined && Math.abs(y - lastY) > 2) text += '\n';
        text += item.str;
        if (item.hasEOL) text += '\n';
        lastY = y ?? lastY;
      }
      pages.push({ page: pageNumber, text: text.replace(/[ \t]+/g, ' ').trim() });
      page.cleanup();
    }
  } finally {
    await document.destroy();
  }

  // A scanned PDF has no text layer; it is marked needs-ocr and read by a person.
  const characters = pages.reduce((total, page) => total + page.text.length, 0);
  const needsOcr = pages.length > 0 && characters < pages.length * 40;
  return { pages, needsOcr };
}
