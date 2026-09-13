import { dbs_production, productionEnv, productionPushNotifications } from "./production";
import { dbs_development, localEnv, localPushNotifications } from "./local";

// Set APP_ENV=dev for development, anything else uses the production config
export const environment: string = process.env.APP_ENV === "dev" ? "dev" : "prod";

export const dbConfig = environment === "prod" ? dbs_production : dbs_development;
export const config = environment === "prod" ? productionEnv : localEnv;
export const pushNotifications = environment === "prod" ? productionPushNotifications : localPushNotifications;
export const greenTDBik = config['greenTDBCon']?.['instancekey'];
export const instanceKeys = greenTDBik
  ? [...dbConfig.map((db) => db.instancekey), greenTDBik]
  : dbConfig.map((db) => db.instancekey);

export function getAssets(instancekey: string): string {
  const dbEntry = dbConfig.find(db => db.instancekey === instancekey);
  return dbEntry ? `assets/${dbEntry.assets}` : "default_assets";
}