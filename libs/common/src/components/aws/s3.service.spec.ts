import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { S3Service } from './s3.service';

// The Lambda calls moved from aws-sdk v2 to v3. v3 sends and returns the payload as bytes;
// callers (the adaptive test engine) still expect Payload as JSON text, as v2 returned it.
describe('S3Service Lambda calls', () => {
  const service = new S3Service({ get: () => undefined, getOrThrow: () => 'bucket' } as any);
  let send: jest.SpyInstance;

  beforeEach(() => {
    send = jest.spyOn(LambdaClient.prototype, 'send').mockImplementation(async () => ({
      StatusCode: 200,
      Payload: new TextEncoder().encode(JSON.stringify({ question: 'q1' })),
    }));
  });

  afterEach(() => send.mockRestore());

  it('returns the response payload as text that parses as before', async () => {
    const data: any = await service.adaptive('next', { attempt: 'a1' });

    expect(data.StatusCode).toBe(200);
    expect(typeof data.Payload).toBe('string');
    expect(JSON.parse(data.Payload)).toEqual({ question: 'q1' });
  });

  it('sends the method along with the payload', async () => {
    await service.adaptive('next', { attempt: 'a1' });

    const command = send.mock.calls[0][0] as InvokeCommand;
    const sent = JSON.parse(new TextDecoder().decode(command.input.Payload as Uint8Array));
    expect(sent).toEqual({ attempt: 'a1', method: 'next' });
  });

  it('passes the face recognition request through', async () => {
    await service.recognito('verify', 'stagingdb', 'u1', 'a1');

    const command = send.mock.calls[0][0] as InvokeCommand;
    const sent = JSON.parse(new TextDecoder().decode(command.input.Payload as Uint8Array));
    expect(sent).toEqual({ db: 'stagingdb', student: 'u1', attempt: 'a1', mode: 'verify' });
  });

  it('rejects when the invocation fails, so callers can handle it', async () => {
    send.mockRejectedValueOnce(new Error('AccessDenied'));
    await expect(service.recognito('verify', 'db', 'u1', 'a1')).rejects.toThrow('AccessDenied');
  });
});
