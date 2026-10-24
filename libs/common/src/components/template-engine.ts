import * as nunjucks from 'nunjucks';
import * as moment from 'moment';

// Email and SMS templates are stored per tenant and were written for swig: variables in
// <%= %>, tags in {% %}, output escaped by default. swig is abandoned, so they render with
// nunjucks configured the same way, plus the swig filters nunjucks does not have.
//
// The loader only serves files under `basepath`. Template bodies arrive through the admin
// API, and swig's loader followed `{% include "/etc/passwd" %}` anywhere on disk.
export function createTemplateEngine(basepath: string): nunjucks.Environment {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(basepath, { noCache: true }), {
    autoescape: true,
    tags: { variableStart: '<%=', variableEnd: '%>' },
  });

  env.addFilter('date', (value: any, format = 'Y-m-d', offset?: number) => phpDate(value, format, offset));
  env.addFilter('raw', (value: any) => new nunjucks.runtime.SafeString(value ?? ''));
  env.addFilter('json', (value: any, indent?: number) => new nunjucks.runtime.SafeString(JSON.stringify(value, null, indent)));
  env.addFilter('json_encode', (value: any, indent?: number) => new nunjucks.runtime.SafeString(JSON.stringify(value, null, indent)));
  env.addFilter('addslashes', (value: any) => String(value ?? '').replace(/([\\'"])/g, '\\$1'));
  env.addFilter('uniq', (value: any) => (Array.isArray(value) ? [...new Set(value)] : value));
  env.addFilter('url_encode', (value: any) => encodeURIComponent(String(value ?? '')));
  env.addFilter('url_decode', (value: any) => decodeURIComponent(String(value ?? '')));
  return env;
}

// swig's date filter takes PHP date() format characters; a backslash escapes one literally.
const PHP_TO_MOMENT: Record<string, string> = {
  d: 'DD', D: 'ddd', j: 'D', l: 'dddd', N: 'E', S: '', w: 'd', z: 'DDD',
  W: 'WW', F: 'MMMM', m: 'MM', M: 'MMM', n: 'M', Y: 'YYYY', y: 'YY', o: 'GGGG',
  a: 'a', A: 'A', g: 'h', G: 'H', h: 'hh', H: 'HH', i: 'mm', s: 'ss', u: 'SSSSSS',
  O: 'ZZ', P: 'Z', U: 'X',
};

function phpDate(value: any, format: string, offset?: number): string {
  if (value === undefined || value === null || value === '') return '';
  let m = moment(value);
  if (!m.isValid()) return '';
  // swig's offset is minutes behind UTC, the sign Date#getTimezoneOffset uses
  if (typeof offset === 'number') m = m.utcOffset(-offset);
  let out = '';
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch === '\\' && i + 1 < format.length) {
      out += format[++i];
    } else if (ch === 'S') {
      out += m.format('Do').replace(/^\d+/, '');
    } else if (ch === 'z') {
      out += String(m.dayOfYear() - 1);
    } else if (ch === 't') {
      out += String(m.daysInMonth());
    } else if (ch === 'L') {
      out += m.isLeapYear() ? '1' : '0';
    } else if (ch === 'c') {
      out += m.toISOString(true);
    } else if (ch === 'r') {
      out += m.format('ddd, DD MMM YYYY HH:mm:ss ZZ');
    } else if (PHP_TO_MOMENT[ch] !== undefined) {
      out += m.format(PHP_TO_MOMENT[ch]);
    } else {
      out += ch;
    }
  }
  return out;
}
