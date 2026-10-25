import { BitlyService } from './bitly';

describe('BitlyService', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.BITLY_TOKEN;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.BITLY_TOKEN = originalToken;
  });

  it('returns the link unshortened when no token is configured', async () => {
    delete process.env.BITLY_TOKEN;
    global.fetch = jest.fn();
    expect(await new BitlyService().shorten('https://example.com/long')).toBe('https://example.com/long');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('asks Bitly v4 to shorten the link with the configured token', async () => {
    process.env.BITLY_TOKEN = 'tok';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ link: 'https://bit.ly/abc' }) });

    expect(await new BitlyService().shorten('https://example.com/long')).toBe('https://bit.ly/abc');
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api-ssl.bitly.com/v4/shorten');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ long_url: 'https://example.com/long' });
  });

  it('throws when Bitly refuses, so callers fall back to the long link', async () => {
    process.env.BITLY_TOKEN = 'tok';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'FORBIDDEN' });
    await expect(new BitlyService().shorten('https://example.com/long')).rejects.toThrow('403');
  });
});
