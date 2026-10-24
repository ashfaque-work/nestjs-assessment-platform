import { Module } from "@nestjs/common";
import { DatabaseModule, Setting, SettingRepository, SettingSchema } from "../database";
import { RedisCaching } from "../services/redisCaching.service";
import { instanceKeys } from "../config";
import { RedisClient } from "../services/redisClient.service";

const settingEntity = { name: Setting.name, schema: SettingSchema };

@Module({
    imports: [
        DatabaseModule,
        ...createDatabaseModules([settingEntity], instanceKeys),
    ],
    providers: [RedisCaching, SettingRepository, RedisClient],
    exports: [RedisCaching],
})

export class RedisModule { }

function createDatabaseModules(entities: { name: string; schema: any }[], connectionNames: string[]): any[] {
    return connectionNames.map((conn) => DatabaseModule.forFeature(entities, conn));
}