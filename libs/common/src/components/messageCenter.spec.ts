import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Swig } from 'swig';
import { confinedTemplateLoader } from './messageCenter';

describe('confinedTemplateLoader', () => {
  let views: string;
  let outside: string;
  let swig: any;

  beforeAll(() => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mail-views-'));
    views = path.join(tmp, 'emails');
    fs.mkdirSync(views);
    fs.writeFileSync(path.join(views, 'footer.html'), 'Thanks, <%= productName %>');
    outside = path.join(tmp, 'secret.txt');
    fs.writeFileSync(outside, 'TOP SECRET');
    swig = new Swig({ varControls: ['<%=', '%>'], cache: false, loader: confinedTemplateLoader(views) });
  });

  it('still renders variables the way stored templates use them', () => {
    expect(swig.render('Hi <%= user.name %>', { locals: { user: { name: 'Asha' } } })).toBe('Hi Asha');
  });

  it('still includes a template from the email views', () => {
    expect(swig.render('{% include "footer.html" %}', { locals: { productName: 'Assess' } })).toBe('Thanks, Assess');
  });

  it('refuses an absolute path outside the email views', () => {
    expect(() => swig.render(`{% include "${outside.replace(/\\/g, '/')}" %}`)).toThrow(/outside the email views/);
  });

  it('refuses a ../ path out of the email views', () => {
    expect(() => swig.render('{% include "../secret.txt" %}')).toThrow(/outside the email views/);
  });
});
