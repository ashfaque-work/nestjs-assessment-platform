import { AbstractRepository } from './abstract.repository';
import { tenantContext } from './tenant-context';

// The instancekey selects which database a repository reads. Before it was stored per
// request, two concurrent requests for different instances could overwrite each other's key.
describe('tenant context', () => {
  const setKeyThenRead = (key: string, delayMs: number) =>
    tenantContext.run({}, async () => {
      AbstractRepository.instancekey = key;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return AbstractRepository.instancekey;
    });

  it('keeps each request on its own instance while they overlap', async () => {
    const [first, second, third] = await Promise.all([
      setKeyThenRead('alpha', 30),
      setKeyThenRead('beta', 10),
      setKeyThenRead('gamma', 20),
    ]);
    expect([first, second, third]).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('survives several awaits inside one request', async () => {
    const key = await tenantContext.run({}, async () => {
      AbstractRepository.instancekey = 'alpha';
      await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));
      return AbstractRepository.instancekey;
    });
    expect(key).toBe('alpha');
  });

  it('a nested call cannot change the caller instance', async () => {
    const key = await tenantContext.run({}, async () => {
      AbstractRepository.instancekey = 'alpha';
      await tenantContext.run({}, async () => { AbstractRepository.instancekey = 'beta'; });
      return AbstractRepository.instancekey;
    });
    expect(key).toBe('alpha');
  });

  it('uses the key the request arrived with when a handler never sets one', async () => {
    const key = await tenantContext.run({ instancekey: 'proctoring' }, async () => AbstractRepository.instancekey);
    expect(key).toBe('proctoring');
  });

  it('falls back to the default outside a request, for queues and cron jobs', () => {
    expect(typeof AbstractRepository.instancekey).toBe('string');
  });
});
