import { buildAppConfig, buildDbInstances, buildPushNotifications } from "./env.config";

// Development config. All values come from environment variables (see .env.example).
export const dbs_development = buildDbInstances();

export const localEnv = buildAppConfig(dbs_development);

export const localPushNotifications = buildPushNotifications();
