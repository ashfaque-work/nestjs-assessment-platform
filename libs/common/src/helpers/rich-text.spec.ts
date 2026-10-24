import { sanitizeRichText } from './rich-text';

describe('sanitizeRichText', () => {
  it('keeps the formatting an editor produces', () => {
    const html = '<p style="text-align:center"><strong>Bold</strong> <em>and</em> <a href="https://example.com">a link</a></p><ul><li>one</li></ul>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('keeps images, including pasted data URLs', () => {
    const html = '<img src="data:image/png;base64,AAAA" alt="pasted" />';
    expect(sanitizeRichText(html)).toBe('<img src="data:image/png;base64,AAAA" alt="pasted" />');
  });

  it('removes scripts and their contents', () => {
    expect(sanitizeRichText('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>');
  });

  it('removes event handler attributes', () => {
    expect(sanitizeRichText('<img src="https://example.com/x.png" onerror="alert(1)" />')).toBe('<img src="https://example.com/x.png" />');
  });

  it('removes javascript: links', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('answers non-strings with an empty string, as strip-js did', () => {
    expect(sanitizeRichText(undefined)).toBe('');
    expect(sanitizeRichText(null)).toBe('');
    expect(sanitizeRichText(42)).toBe('');
  });
});
