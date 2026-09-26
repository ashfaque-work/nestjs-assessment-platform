import { Injectable, Logger } from "@nestjs/common";
import { AbstractRepository } from "../abstract.repository";
import { instanceKeys } from "@app/common/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AuditLog } from "../models";

@Injectable()
export class AuditLogRepository extends AbstractRepository<AuditLog> {
  protected readonly logger = new Logger(AuditLogRepository.name);
  static conn = instanceKeys;

  constructor(
    @InjectModel(AuditLog.name, AuditLogRepository.conn[0] ? AuditLogRepository.conn[0] : 'staging') conn0: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[1] ? AuditLogRepository.conn[1] : 'staging') conn1: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[2] ? AuditLogRepository.conn[2] : 'staging') conn2: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[3] ? AuditLogRepository.conn[3] : 'staging') conn3: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[4] ? AuditLogRepository.conn[4] : 'staging') conn4: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[5] ? AuditLogRepository.conn[5] : 'staging') conn5: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[6] ? AuditLogRepository.conn[6] : 'staging') conn6: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[7] ? AuditLogRepository.conn[7] : 'staging') conn7: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[8] ? AuditLogRepository.conn[8] : 'staging') conn8: Model<AuditLog>,
    @InjectModel(AuditLog.name, AuditLogRepository.conn[9] ? AuditLogRepository.conn[9] : 'staging') conn9: Model<AuditLog>,
  ) {
    super({
      [AuditLogRepository.conn.at(0)]: conn0,
      [AuditLogRepository.conn.at(1)]: conn1,
      [AuditLogRepository.conn.at(2)]: conn2,
      [AuditLogRepository.conn.at(3)]: conn3,
      [AuditLogRepository.conn.at(4)]: conn4,
      [AuditLogRepository.conn.at(5)]: conn5,
      [AuditLogRepository.conn.at(6)]: conn6,
      [AuditLogRepository.conn.at(7)]: conn7,
      [AuditLogRepository.conn.at(8)]: conn8,
      [AuditLogRepository.conn.at(9)]: conn9,
    })
  }

  setInstanceKey(instancekey: string) {
    AbstractRepository.instancekey = instancekey;
  }
}