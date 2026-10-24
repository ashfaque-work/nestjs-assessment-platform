import { buildPushNotifications } from '../config/env.config';
import { buildPushMessage } from './pushNotification';

describe('push notification settings', () => {
  const original = process.env.FCM_SERVICE_ACCOUNT;
  afterEach(() => {
    if (original === undefined) delete process.env.FCM_SERVICE_ACCOUNT;
    else process.env.FCM_SERVICE_ACCOUNT = original;
  });

  it('has no service account when FCM is not configured', () => {
    delete process.env.FCM_SERVICE_ACCOUNT;
    expect(buildPushNotifications().fcm.serviceAccountKey).toBeUndefined();
  });

  it('reads the Firebase service account from FCM_SERVICE_ACCOUNT', () => {
    process.env.FCM_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'demo', client_email: 'push@demo.iam.gserviceaccount.com' });
    expect(buildPushNotifications().fcm.serviceAccountKey).toEqual({
      project_id: 'demo',
      client_email: 'push@demo.iam.gserviceaccount.com',
    });
  });

  it('no longer carries the retired GCM key or the unused APNs and ADM settings', () => {
    const settings = buildPushNotifications();
    expect(Object.keys(settings)).toEqual(['fcm']);
  });
});

describe('buildPushMessage', () => {
  const state = { name: 'student.game', params: { id: 'g1' } };
  const message = buildPushMessage(['t1', 't2'], 'Your turn', 'It is your turn to play game', { custom: { state } });

  it('sends custom fields as string data, with objects as JSON', () => {
    expect(message.tokens).toEqual(['t1', 't2']);
    expect(message.data).toEqual({ state: JSON.stringify(state) });
  });

  it('repeats title and message in Android data, as before', () => {
    expect(message.android.priority).toBe('high');
    expect(message.android.data).toEqual({ state: JSON.stringify(state), title: 'Your turn', message: 'It is your turn to play game' });
  });

  it('wakes iOS with an alert and keeps the custom fields in the APNs payload', () => {
    expect(message.apns.payload.aps).toMatchObject({ alert: { title: 'Your turn', body: 'It is your turn to play game' }, contentAvailable: true });
    expect(message.apns.payload.state).toEqual(state);
  });

  it('copes with no options at all', () => {
    expect(buildPushMessage(['t'], 'Welcome', 'Hello').data).toEqual({});
  });
});
