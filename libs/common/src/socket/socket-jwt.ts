import * as jwt from 'jsonwebtoken';

// socket.io handshake authentication. It replaces socketio-jwt, which is abandoned and pins
// jsonwebtoken 8, and behaves the same way: the token comes from an `Authorization: Bearer`
// header or a `token` query parameter, the decoded payload lands on socket.decoded_token,
// and a refusal is an error whose `data` says why, which the client receives as connect_error.
export class UnauthorizedError extends Error {
  readonly data: { message: string; code: string; type: 'UnauthorizedError' };

  constructor(code: string, message: string) {
    super(message);
    this.data = { message, code, type: 'UnauthorizedError' };
  }
}

function tokenFrom(socket: any): string | undefined {
  const header: string | undefined = socket.request?.headers?.authorization;
  if (header) {
    const [scheme, credentials] = header.split(' ');
    if (/^Bearer$/i.test(scheme) && credentials) return credentials;
  }
  const query = socket.handshake?.query?.token;
  return typeof query === 'string' && query ? query : undefined;
}

export function socketJwtAuth(secret: string, isValid: (decoded: any) => boolean = () => true) {
  return (socket: any, next: (err?: Error) => void) => {
    const token = tokenFrom(socket);
    if (!token) {
      return next(new UnauthorizedError('credentials_required', 'no token provided'));
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err: any) {
      return next(new UnauthorizedError('invalid_token', err?.message ?? 'invalid token'));
    }
    if (!isValid(decoded)) {
      return next(new UnauthorizedError('INVALID_TOKEN', 'Invalid token'));
    }
    socket.encoded_token = token;
    socket.decoded_token = decoded;
    next();
  };
}
