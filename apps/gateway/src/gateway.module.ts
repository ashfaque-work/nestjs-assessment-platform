import { AuthCommonModule } from "@app/common/auth/auth.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { CourseModule } from "./course/course.module";
import { ClassroomModule } from "./classroom/classroom.module";
import { AssessmentModule } from "./assessment/assessment.module";
import { AdministrationModule } from "./administration/administration.module";
import { QuestionBankModule } from "./question-bank/question-bank.module";
import { AttemptModule } from "./attempt/attempt.module";
import { RedisModule, SocketModule } from "@app/common";
import { EcommerceModule } from "./ecommerce/ecommerce.module";
import { NotifyModule } from "./notify/notify.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // A generous ceiling per IP so one client cannot hammer the API; the login
    // and password-reset routes set much stricter limits of their own.
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: Number(process.env.THROTTLE_TTL ?? 60_000),
      limit: Number(process.env.THROTTLE_LIMIT ?? 600),
    }]),
    SocketModule, RedisModule, AuthCommonModule,
    AuthModule, NotifyModule, CourseModule, ClassroomModule, AssessmentModule, AdministrationModule,
    QuestionBankModule, AttemptModule, EcommerceModule
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class GatewayModule { }
