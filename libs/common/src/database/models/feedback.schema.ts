import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../abstract.schema';
import { Types } from 'mongoose';
import { ObjectId } from 'mongodb';

@Schema({ strict: true, minimize: false, timestamps: true })
export class Feedback extends AbstractDocument {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId
    @Prop({ type: Types.ObjectId, ref: 'PracticeSet' })
    practiceSetId?: Types.ObjectId
    @Prop({ type: Types.ObjectId })
    attemptId?: Types.ObjectId
    @Prop({ type: Types.ObjectId, ref: 'Courses' })
    courseId?: Types.ObjectId
    @Prop()
    idOffline?: string
    @Prop({ type: Types.ObjectId, ref: 'User' })
    owner?: Types.ObjectId
    @Prop({ default: '' })
    comment: string
    @Prop({ default: 0 })
    rating: number
    @Prop({ type: [{ name: String, value: Boolean }] })
    feedbacks?: {name: string, value: boolean}[]
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback)