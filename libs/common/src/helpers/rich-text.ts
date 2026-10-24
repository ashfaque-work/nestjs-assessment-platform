import * as sanitizeHtml from 'sanitize-html';

// Rich text that users post (discussions, comments) is stored as HTML and rendered to
// other users, so anything executable is removed before it is saved: scripts, event
// handler attributes and javascript: URLs. Formatting from the editor survives.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'del', 'ins'],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'name', 'target', 'rel', 'title'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
    '*': ['class', 'style'],
  },
  allowedSchemesByTag: { img: ['http', 'https', 'data', 'cid'] },
};

export function sanitizeRichText(html: unknown): string {
  return typeof html === 'string' ? sanitizeHtml(html, OPTIONS) : '';
}
