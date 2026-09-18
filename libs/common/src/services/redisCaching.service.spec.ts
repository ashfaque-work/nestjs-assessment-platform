import { RedisCaching } from './redisCaching.service';

// A Redis client that answers on a later tick, like ioredis does. A callback that throws there
// is an uncaught exception, which restarted the auth service for a bad verification code.
function fakeRedis(store: Record<string, string> = {}) {
  const later = (fn: () => void) => process.nextTick(fn);
  return {
    get: (key: string, cb: Function) => later(() => cb(null, store[key] ?? null)),
    setex: (key: string, value: string, _ttl: number, cb: Function) => later(() => { store[key] = value; cb(null, 'OK'); }),
    set: (key: string, value: string, cb: Function) => later(() => { store[key] = value; cb(null, 'OK'); }),
    del: (key: string, cb: Function) => later(() => { const had = key in store; delete store[key]; cb(null, had ? 1 : 0); }),
  };
}

const req = { instancekey: 'staging' };

describe('RedisCaching callbacks', () => {
  let uncaught: jest.Mock;

  beforeEach(() => {
    uncaught = jest.fn();
    process.on('uncaughtException', uncaught);
  });

  afterEach(() => {
    process.off('uncaughtException', uncaught);
  });

  it('rejects instead of crashing when a callback throws', async () => {
    const cache = new RedisCaching({} as any, fakeRedis() as any);

    await expect(cache.get(req, 'missing-code', () => {
      throw new Error('Your Code is invalid or has expired');
    })).rejects.toThrow('Your Code is invalid or has expired');
    expect(uncaught).not.toHaveBeenCalled();
  });

  it('resolves with what the callback returns', async () => {
    const cache = new RedisCaching({} as any, fakeRedis({ 'staging,key=code1': JSON.stringify({ user: 'u1' }) }) as any);

    await expect(cache.get(req, 'code1', (data) => ({ response: data.user }))).resolves.toEqual({ response: 'u1' });
  });

  it('waits for an async callback', async () => {
    const cache = new RedisCaching({} as any, fakeRedis() as any);

    await expect(cache.get(req, 'x', async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 'done';
    })).resolves.toBe('done');
  });

  it('settles getSetting when the setting is not cached and the callback throws', async () => {
    const settings = { findOne: jest.fn().mockResolvedValue({ slug: 'whiteLabel' }) };
    const cache = new RedisCaching(settings as any, fakeRedis() as any);

    // Before, this path never settled, so the request hung until the gateway timed out
    await expect(cache.getSetting(req, () => {
      throw new Error('feature disabled');
    })).rejects.toThrow('feature disabled');
  });

  it('does not read the database again when the setting is cached', async () => {
    const settings = { findOne: jest.fn() };
    const cache = new RedisCaching(settings as any, fakeRedis({ 'staging,key=whiteLabel': '{"slug":"whiteLabel"}' }) as any);

    await expect(cache.getSettingAsync('staging')).resolves.toEqual({ slug: 'whiteLabel' });
    expect(settings.findOne).not.toHaveBeenCalled();
  });

  it('del passes the number of removed keys to its callback', async () => {
    const cache = new RedisCaching({} as any, fakeRedis({ 'staging,key=user_1': '{}' }) as any);

    await expect(cache.del(req, 'user_1', (count) => count)).resolves.toBe(1);
  });
});
