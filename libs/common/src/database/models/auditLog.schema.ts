import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AbstractDocument } from '../abstract.schema';

// One change an account manager made: who, what, to whom, when
@Schema({ timestamps: true, collection: 'auditlogs' })
export class AuditLog extends AbstractDocument {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  actor: mongoose.Schema.Types.ObjectId;

  @Prop()
  actorName: string;

  // e.g. user.add, user.edit, user.roles, user.status, settings.update
  @Prop({ required: true })
  action: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  target: mongoose.Schema.Types.ObjectId;

  @Prop()
  targetName: string;

  // what changed, in words (never a password)
  @Prop()
  details: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
