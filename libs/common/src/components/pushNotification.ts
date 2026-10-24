import { Injectable, Logger } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { ClassroomRepository, DeviceRepository } from '../database';
import * as config from '../config';

const APP_NAME = config.pushNotifications.fcm.appName;
// Firebase accepts at most 500 tokens per multicast request.
const BATCH_SIZE = 500;

// FCM data values must be strings; objects (such as the mobile `state` to open) go as JSON.
function asFcmData(values: Record<string, any> = {}): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value != null) data[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return data;
}

// The message shape node-pushnotifications built for FCM, so the mobile apps read the same
// fields: `custom` as data, title and message repeated in Android data, and an APNs alert
// that wakes the app.
export function buildPushMessage(tokens: string[], title: string, body: string, options: any = {}): MulticastMessage {
  const custom = options.custom && typeof options.custom === 'object' ? options.custom : {};
  return {
    tokens,
    data: asFcmData(custom),
    android: {
      priority: 'high',
      notification: { title, body },
      data: asFcmData({ ...custom, title, message: body }),
    },
    apns: {
      payload: {
        aps: { alert: { title, body }, contentAvailable: true, badge: 1, sound: 'ping.aiff' },
        ...custom,
      },
    },
  };
}

@Injectable()
export class PushService {
  private app: App | null | undefined;

  constructor(
    private readonly classroomRepository: ClassroomRepository,
    private readonly deviceRepository: DeviceRepository,
  ) { }

  // Built on first use so a service without FCM credentials still starts.
  private firebaseApp(): App | null {
    if (this.app !== undefined) return this.app;
    const serviceAccount = config.pushNotifications.fcm.serviceAccountKey;
    if (!serviceAccount) {
      Logger.warn('FCM_SERVICE_ACCOUNT is not set; push notifications are disabled');
      return (this.app = null);
    }
    this.app = getApps().find((a) => a.name === APP_NAME) ?? initializeApp({ credential: cert(serviceAccount) }, APP_NAME);
    return this.app;
  }

  private async send(tokens: string[], title: string, message: string, options: any, cb: Function): Promise<void> {
    const app = this.firebaseApp();
    if (!app) return cb(new Error('Push notifications are not configured'));
    try {
      const results = [];
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        results.push(await getMessaging(app).sendEachForMulticast(buildPushMessage(batch, title, message, options)));
      }
      cb(null, results);
    } catch (err) {
      cb(err);
    }
  }

  async pushToUsers(ik: string, users: string[], title: string, message: string, options: any, cb: Function = () => { }): Promise<void> {
    try {
      this.deviceRepository.setInstanceKey(ik);
      const devices = await this.deviceRepository.find({ user: { $in: users } }, { deviceToken: 1 });
      if (devices.length === 0) {
        return cb();
      }
      const tokens = devices.map(d => d.deviceToken);
      await this.send(tokens, title, message, options, cb);
    } catch (err) {
      cb(err);
    }
  }

  async pushToClassroom(ik: string, classroomId: string, excludeUser: string, title: string, message: string, options: any, cb: Function = () => { }): Promise<void> {
    try {
      this.classroomRepository.setInstanceKey(ik);
      const classroom = await this.classroomRepository.findById(classroomId, { students: 1 }, { lean: true });
      if (!classroom) {
        return cb();
      }
      let allIds = classroom.students.map(s => s.studentId);
      if (excludeUser) {
        allIds = allIds.filter(s => s && !s.equals(excludeUser));
      }
      if (allIds.length === 0) {
        return cb();
      }
      //   const devices = await this.deviceModel.find({ user: { $in: allIds } }, { deviceToken: 1 }).lean().exec();
      //   if (devices.length === 0) {
      //     return cb();
      //   }
      //   const tokens = devices.map(d => d.deviceToken);
      //   this.send(tokens, title, message, options, cb);
    } catch (err) {
      cb(err);
    }
  }
}
