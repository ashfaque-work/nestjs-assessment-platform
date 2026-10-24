import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createTemplateEngine } from './template-engine';

describe('createTemplateEngine', () => {
  let views: string;
  let outside: string;
  let engine: ReturnType<typeof createTemplateEngine>;

  beforeAll(() => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-views-'));
    views = path.join(tmp, 'emails');
    fs.mkdirSync(views);
    fs.writeFileSync(path.join(views, 'footer.html'), 'Thanks, <%= productName %>');
    outside = path.join(tmp, 'secret.txt');
    fs.writeFileSync(outside, 'TOP SECRET');
    engine = createTemplateEngine(views);
  });

  const render = (template: string, locals: any = {}) => engine.renderString(template, locals);

  describe('renders templates written for swig', () => {
    it('fills <%= %> variables, including nested ones', () => {
      expect(render('Hi <%= user.name %>, from <%= productName %>', { user: { name: 'Asha' }, productName: 'Assess' }))
        .toBe('Hi Asha, from Assess');
    });

    it('renders a missing variable, or a property of one, as nothing', () => {
      expect(render('[<%= missing %>][<%= missing.deeper %>]')).toBe('[][]');
    });

    it('escapes HTML in values by default, as swig did', () => {
      expect(render('<%= name %>', { name: '<b>x</b>' })).toBe('&lt;b&gt;x&lt;/b&gt;');
    });

    it('leaves {{ }} alone, since only <%= %> marks a variable', () => {
      expect(render('{{ not.a.variable }}')).toBe('{{ not.a.variable }}');
    });

    it('supports if/else and for loops', () => {
      const t = '{% if items.length %}{% for i in items %}<%= i %>,{% endfor %}{% else %}none{% endif %}';
      expect(render(t, { items: ['a', 'b'] })).toBe('a,b,');
      expect(render(t, { items: [] })).toBe('none');
    });

    it('supports the filters both engines share', () => {
      expect(render('<%= name|upper %> <%= missing|default("n/a") %> <%= list|join(", ") %>', { name: 'asha', list: [1, 2] }))
        .toBe('ASHA n/a 1, 2');
    });
  });

  describe('swig-only filters', () => {
    it('formats dates with PHP-style codes', () => {
      const when = new Date(Date.UTC(2026, 9, 5, 14, 7, 9));
      expect(render('<%= when|date("Y-m-d H:i:s", 0) %>', { when })).toBe('2026-10-05 14:07:09');
      expect(render('<%= when|date("D, jS F Y", 0) %>', { when })).toBe('Mon, 5th October 2026');
      expect(render('<%= when|date("\\\\Y\\\\e\\\\a\\\\r: Y", 0) %>', { when })).toBe('Year: 2026');
    });

    it('renders an empty or invalid date as nothing', () => {
      expect(render('[<%= when|date("Y") %>]', { when: null })).toBe('[]');
      expect(render('[<%= when|date("Y") %>]', { when: 'not a date' })).toBe('[]');
    });

    it('lets raw output pass unescaped', () => {
      expect(render('<%= html|raw %>', { html: '<b>x</b>' })).toBe('<b>x</b>');
    });

    it('encodes JSON, URLs and quotes, and removes duplicates', () => {
      expect(render('<%= v|json %>', { v: { a: 1 } })).toBe('{"a":1}');
      expect(render('<%= v|url_encode %>', { v: 'a b&c' })).toBe('a%20b%26c');
      // nunjucks also entity-encodes the backslash, which swig left alone; both show it\'s
      const decoded = render('<%= v|addslashes %>', { v: `it's` }).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
      expect(decoded).toBe(`it\\'s`);
      expect(render('<%= v|uniq|join(",") %>', { v: [1, 1, 2] })).toBe('1,2');
    });
  });

  describe('file access', () => {
    it('includes a template from the email views', () => {
      expect(render('{% include "footer.html" %}', { productName: 'Assess' })).toBe('Thanks, Assess');
    });

    it('refuses an absolute path outside the email views', () => {
      expect(() => render(`{% include "${outside.replace(/\\/g, '/')}" %}`)).toThrow();
    });

    it('refuses a ../ path out of the email views', () => {
      expect(() => render('{% include "../secret.txt" %}')).toThrow();
    });
  });
});
