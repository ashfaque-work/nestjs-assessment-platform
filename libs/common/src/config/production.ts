import { buildAppConfig, buildDbInstances, buildPushNotifications } from "./env.config";

// Production config. All values come from environment variables (see .env.example).
export const dbs_production = buildDbInstances();

export const productionEnv = {
  ...buildAppConfig(dbs_production),
  pushNotifications: { ...buildPushNotifications(), isAlwaysUseFCM: true },
};

export const productionPushNotifications = buildPushNotifications();
