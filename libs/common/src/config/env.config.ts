// Builds the application config from environment variables so no credentials live in the repo.
// Copy .env.example to .env and fill in the values you need.
import 'dotenv/config';
import * as path from 'path';

const env = (name: string, fallback = ''): string => process.env[name] ?? fallback;
const bool = (name: string, fallback: boolean): boolean =>
  process.env[name] === undefined ? fallback : process.env[name] === 'true';

export interface DbInstance {
  name: string;
  instancekey: string;
  origin: string;
  url: string;
  uri: string;
  assets: string;
  domain: string;
  active: boolean;
}

// DB_INSTANCES can override the list as JSON, e.g.
// [{"instancekey":"staging","uri":"mongodb://127.0.0.1:27017/stagingdb","assets":"default"}]
export function buildDbInstances(): DbInstance[] {
  const defaults = [
    { instancekey: 'staging', uri: env('MONGO_URI_STAGING', 'mongodb://127.0.0.1:27017/stagingdb'), assets: 'default', origin: env('ORIGIN_STAGING', 'http://localhost:4200') },
    { instancekey: 'proctoring', uri: env('MONGO_URI_PROCTORING', 'mongodb://127.0.0.1:27017/newstagingdb'), assets: 'proctor', origin: env('ORIGIN_PROCTORING', 'http://localhost:4201') },
  ];
  const list: any[] = process.env.DB_INSTANCES ? JSON.parse(process.env.DB_INSTANCES) : defaults;

  return list.map((db) => {
    const uri = new URL(db.uri);
    const origin = db.origin || 'http://localhost:4200';
    return {
      name: db.name || db.instancekey,
      instancekey: db.instancekey,
      origin,
      url: `${uri.host}${uri.pathname}`,
      uri: db.uri,
      assets: db.assets || db.instancekey,
      domain: db.domain || new URL(origin).host,
      active: db.active ?? true,
    };
  });
}

export function buildPushNotifications() {
  return {
    gcm: {
      id: env('GCM_SERVER_KEY'),
      msgcnt: 1,
      phonegap: true,
      dataDefaults: {
        delayWhileIdle: false,
        timeToLive: 4 * 7 * 24 * 3600, // 4 weeks
        retries: 4,
      },
      options: {},
    },
    apn: {
      gateway: env('APN_GATEWAY', 'gateway.push.apple.com'),
      badge: 1,
      defaultData: {
        expiry: 4 * 7 * 24 * 3600, // 4 weeks
        sound: 'ping.aiff',
      },
      options: {
        production: bool('APN_PRODUCTION', false),
      },
    },
    adm: {
      client_id: null,
      client_secret: null,
      expiresAfter: 4 * 7 * 24 * 3600, // 4 weeks
      options: {},
    },
  };
}

export function buildAppConfig(dbs: DbInstance[]) {
  const baseUrl = env('BASE_URL', 'http://localhost:4200/');
  const redisHost = env('REDIS_HOST', '127.0.0.1');
  const redisPort = env('REDIS_PORT', '6379');
  const redisPass = env('REDIS_PASS');
  const awsRegion = env('AWS_REGION', env('S3_REGION', 'ap-south-1'));
  const awsKeyId = env('AWS_ACCESS_KEY_ID');
  const awsSecret = env('AWS_SECRET_ACCESS_KEY');

  const config: any = {
    // If initialized = false, dbs will be loaded from database, otherwise it will use current dbs
    initialized: true,
    version: 2,
    dbs,
    allowEdit: true,
    baseUrl,
    websiteName: baseUrl,
    domainName: baseUrl,
    root: path.normalize(__dirname + '/../../..'),
    app: {
      name: env('APP_NAME', 'assessmentPlatform'),
    },
    secrets: {
      session: env('SESSION_SECRET'),
    },
    secret: env('APP_SECRET'),
    boardinfinity_secretKey: env('BOARDINFINITY_SECRET_KEY'),
    roles: {
      director: 'director',
      publisher: 'publisher',
      student: 'student',
      support: 'support',
      teacher: 'teacher',
      mentor: 'mentor',
      agent: 'agent',
      manager: 'manager',
      admin: 'admin',
      centerHead: 'centerHead',
    },
    userRoles: ['student', 'teacher', 'mentor', 'publisher', 'admin', 'manager', 'agent'],
    mongo: {
      options: {
        autoIndex: false,
        maxPoolSize: 10,
      },
    },
    seedDB: false,
    disposableEmail: true,
    sendSMS: bool('SEND_SMS', false),
    debugMode: bool('DEBUG_MODE', true),
    port: 3000,
    adaptive_api: env('ADAPTIVE_API_URL'),
    reportApi: env('REPORT_API_URL'),
    redis: {
      uri: env('REDIS_URI', `redis://${redisHost}:${redisPort}`),
      host: redisHost,
      port: Number(redisPort),
      password: redisPass,
    },
    redisCluster: {
      cluster: [
        { host: redisHost, port: parseInt(redisPort, 10) || 6379 },
        { host: redisHost, port: parseInt(redisPort, 10) + 1 || 6380 },
        { host: redisHost, port: parseInt(redisPort, 10) + 2 || 6381 },
      ],
      master: {
        password: redisPass,
        port: redisPort,
        host: redisHost,
      },
      slaves: [
        { host: redisHost, port: parseInt(redisPort, 10) || 6379 },
        { host: redisHost, port: parseInt(redisPort, 10) + 1 || 6380 },
        { host: redisHost, port: parseInt(redisPort, 10) + 2 || 6381 },
      ],
    },
    currency: 'INR',
    logentries: {
      token: '',
    },
    logger: {
      level: 'debug',
      timestamp: true,
      colorize: true,
    },
    niitConfig: {
      attemptUrl: env('NIIT_ATTEMPT_URL'),
    },
    plivo: {
      AUTH_ID: env('PLIVO_AUTH_ID'),
      AUTH_TOKEN: env('PLIVO_AUTH_TOKEN'),
      NUMBER: env('PLIVO_NUMBER'),
    },
    codeRunnerUrl: env('CODE_RUNNER_URL', 'http://localhost:9100/'),
    ccavenueHandlerUrl: env('CCAVENUE_HANDLER_URL'),
    // db connection to get instances info
    adminCon: env('ADMIN_MONGO_URI', 'mongodb://127.0.0.1:27017/admin'),
    TURNserver: {
      server: env('TURN_SERVER'),
      secret: env('TURN_SECRET'),
    },
    aws: {
      region: awsRegion,
      s3: {
        userAssets: {
          bucket: env('S3_USER_ASSETS_BUCKET', env('S3_BUCKET')),
          accessKeyId: awsKeyId,
          secretAccessKey: awsSecret,
          baseFilePath: env('S3_USER_ASSETS_BASE_URL'),
        },
        faceReg: {
          bucket: env('S3_FACE_REG_BUCKET'),
          accessKeyId: awsKeyId,
          secretAccessKey: awsSecret,
          baseFilePath: env('S3_FACE_REG_BASE_URL'),
        },
      },
      lambda: {
        mode: 'debug',
        accessKeyId: awsKeyId,
        secretAccessKey: awsSecret,
        region: awsRegion,
        functions: {
          faceRec: env('LAMBDA_FACE_REC', 'recognito:$LATEST'),
          adaptive: env('LAMBDA_ADAPTIVE', 'adaptive:$LATEST'),
        },
      },
      rekognition: {
        accessKeyId: awsKeyId,
        secretAccessKey: awsSecret,
      },
    },
    pushNotifications: buildPushNotifications(),
  };

  // Optional extra database, only connected when configured
  if (process.env.GREENT_MONGO_URI) {
    config.greenTDBCon = {
      name: 'greenTDBCon',
      instancekey: env('GREENT_INSTANCEKEY', 'greenT'),
      uri: env('GREENT_MONGO_URI'),
    };
  }

  return config;
}
