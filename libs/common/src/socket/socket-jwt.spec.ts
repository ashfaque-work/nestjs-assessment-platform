import * as jwt from 'jsonwebtoken';
import { socketJwtAuth, UnauthorizedError } from './socket-jwt';

const SECRET = 'test-secret';
const hasUser = (decoded: any) => Boolean(decoded?.userId);

const socketWith = ({ header, query }: { header?: string; query?: string }) => ({
  request: { headers: header ? { authorization: header } : {} },
  handshake: { query: query ? { token: query } : {} },
}) as any;

const run = (socket: any) =>
  new Promise<Error | undefined>((resolve) => socketJwtAuth(SECRET, hasUser)(socket, resolve));

describe('socketJwtAuth', () => {
  const token = jwt.sign({ userId: 'u1', roles: ['student'], ik: 'staging' }, SECRET);

  it('accepts a token from the query string and exposes the payload', async () => {
    const socket = socketWith({ query: token });
    expect(await run(socket)).toBeUndefined();
    expect(socket.decoded_token).toMatchObject({ userId: 'u1', ik: 'staging' });
    expect(socket.encoded_token).toBe(token);
  });

  it('accepts a Bearer token from the Authorization header', async () => {
    const socket = socketWith({ header: `Bearer ${token}` });
    expect(await run(socket)).toBeUndefined();
    expect(socket.decoded_token.userId).toBe('u1');
  });

  it('refuses a connection without a token', async () => {
    const err = await run(socketWith({}));
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect((err as UnauthorizedError).data.code).toBe('credentials_required');
  });

  it('refuses a token signed with another secret', async () => {
    const err = await run(socketWith({ query: jwt.sign({ userId: 'u1' }, 'other') }));
    expect((err as UnauthorizedError).data).toMatchObject({ code: 'invalid_token', type: 'UnauthorizedError' });
  });

  it('refuses an expired token', async () => {
    const expired = jwt.sign({ userId: 'u1', exp: Math.floor(Date.now() / 1000) - 60 }, SECRET);
    expect((await run(socketWith({ query: expired })) as UnauthorizedError).data.code).toBe('invalid_token');
  });

  it('refuses a valid token without a userId', async () => {
    const err = await run(socketWith({ query: jwt.sign({ roles: [] }, SECRET) }));
    expect((err as UnauthorizedError).data.code).toBe('INVALID_TOKEN');
  });
});
