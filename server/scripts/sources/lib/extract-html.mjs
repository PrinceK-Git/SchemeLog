import { parse } from 'node-html-parser';

/**
 * HTML is untrusted input: it is parsed into text only, and scripts, styles,
 * iframes, and inline handlers are discarded before anything is stored.
 * Nothing extracted here is ever rendered as HTML by the app.
 */
const DROP = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'svg',
  'nav',
  'header',
  'footer',
  'form',
  'template',
]);

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const BLOCKS = new Set([
  'p',
  'li',
  'tr',
  'td',
  'th',
  'div',
  'section',
  'article',
  'dd',
  'dt',
  'pre',
]);

/**
 * Extract page text with a heading-path locator for each line.
 *
 * @param {string} html
 * @returns {{ lines: { text: string, locator: string }[], title: string }}
 */
export function extractHtml(html) {
  const root = parse(html, {
    lowerCaseTagName: true,
    comment: false,
    blockTextElements: { script: false, style: false, noscript: false },
  });

  for (const tag of DROP) for (const node of root.querySelectorAll(tag)) node.remove();

  const title = root.querySelector('title')?.text?.trim() ?? '';
  const lines = [];
  const headingPath = [];

  const visit = (node) => {
    if (node.nodeType === 3) return; // handled by the block below
    const tag = node.rawTagName?.toLowerCase();

    if (tag && HEADINGS.has(tag)) {
      const level = Number(tag[1]);
      const text = node.text.replace(/\s+/g, ' ').trim();
      headingPath.length = Math.max(0, level - 1);
      if (text) headingPath[level - 1] = text;
      if (text) lines.push({ text, locator: headingPath.filter(Boolean).join(' > ') });
      return;
    }

    const hasElementChildren = node.childNodes?.some((child) => child.nodeType === 1);
    if (tag && BLOCKS.has(tag) && !hasElementChildren) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (text)
        lines.push({ text, locator: headingPath.filter(Boolean).join(' > ') || 'Document' });
      return;
    }

    for (const child of node.childNodes ?? []) visit(child);
  };

  visit(root.querySelector('body') ?? root);

  // Drop immediate duplicates produced by nested blocks.
  const deduped = lines.filter((line, index) => index === 0 || line.text !== lines[index - 1].text);
  return { lines: deduped, title };
}
