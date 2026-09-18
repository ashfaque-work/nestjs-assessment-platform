import { toGrpcError } from '@app/common/helpers/grpc-error';
import { Injectable } from '@nestjs/common';
import { emailsFromEnv, HostRateRepository, NotificationRepository, RedisCaching, UsersRepository } from '@app/common';
import { GrpcInternalException } from 'nestjs-grpc-exceptions';
import { Types } from 'mongoose';
import { CreateHostRateReq, FeedbackReq, ShareLinkReq, TestSendMailReq } from '@app/common/dto/administration';
import { SMSBus } from '@app/common/bus/sms.bus';
import { MessageCenter } from '@app/common/components/messageCenter';

@Injectable()
export class HostRateService {
  constructor(
    private readonly hostRateRepository: HostRateRepository,
    private readonly usersRepository: UsersRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly redisCaching: RedisCaching,
    private readonly sMSBus: SMSBus,
    private readonly messageCenter: MessageCenter
  ) { }

  async createHostRate(request: CreateHostRateReq) {
    try {
      const data = {
        user: new Types.ObjectId(request.user._id),
        rating: request.body.rating,
        comment: request.body.comment
      };

      this.hostRateRepository.setInstanceKey(request.instancekey);
      await this.hostRateRepository.create(data);

      return;
    } catch (error) {
      throw toGrpcError(error);
    }
  }

  async shareLink(request: ShareLinkReq) {
    try {
      const { body, user } = request;
      const data = { ...body, user };

      const settings = await this.redisCaching.getSetting(request);

      const phoneNumberToSend = [];
      const text = `I have started using this learning platform. ${settings.baseUrl}`;

      if (data.phones) {
        const validPhones = await this.sMSBus.findValidPhoneNumber(data.phones);
        phoneNumberToSend.push(...validPhones.phone);

        if (validPhones.notValidatePhone.length > 0) {
          this.usersRepository.setInstanceKey(request.instancekey);
          const users = await this.usersRepository.find({
            $or: [
              { userId: { $in: data.phones } },
              { phoneNumber: { $in: data.phones } },
              { phoneNumberFull: { $in: data.phones } },
            ],
          });

          if (users.length > 0) {
            const additionalPhones = await this.sMSBus.getPhoneNumberByUsers(users);
            phoneNumberToSend.push(...additionalPhones);
          }
        }

        this.notificationRepository.setInstanceKey(request.instancekey);
        if (phoneNumberToSend.length > 0) {
          await Promise.all(phoneNumberToSend.map(async phone => {
            await this.notificationRepository.create({
              modelId: 'shareLink',
              isScheduled: true,
              isEmail: false,
              to: phone,
              sms: text,
            });
          }));
        }
      }

      if (data.emails) {
        const dataMsgCenter = {
          receiver: user,
          modelId: 'shareLink',
          to: data.emails.join(','),
          isScheduled: true,
        };

        await this.messageCenter.sendWithTemplate(request,
          'sharing-invitation',
          {
            senderName: data.user.name,
            logo: `${settings.baseUrl}images/logo2.png`,
            sharingLink: settings.baseUrl,
            subject: 'Invitation to join',
          },
          dataMsgCenter,
        );
      }

      return;
    } catch (error) {
      throw toGrpcError(error);
    }
  }

  async feedback(request: FeedbackReq) {
    try {
      const settings = await this.redisCaching.getSetting(request);

      const opt = {
        logo: settings.baseUrl + 'images/logo2.png',
        senderName: request.user.name,
        subject: request.body.subject,
        content: request.body.message
      };

      const dataMsgCenter = {
        to: emailsFromEnv('HOST_RATE_EMAILS').join(','),
        modelId: 'hostRate',
        isScheduled: true
      };

      await this.messageCenter.sendWithTemplate(request, 'sharing-invitation', opt, dataMsgCenter);

      return;
    } catch (error) {
      throw toGrpcError(error);
    }
  }

  async testSendMail(request: TestSendMailReq) {
    try {
      const settings = await this.redisCaching.getSetting(request);

      const data = {
        senderName: 'test',
        logo: settings.baseUrl + 'images/logo2.png',
        sharingLink: settings.baseUrl,
        subject: 'Invitation to join'
      };

      const dataMsgCenter = {
        to: emailsFromEnv('TEST_MAIL_TO').join(','),
        modelId: 'testEmail',
        isScheduled: true
      };

      await this.messageCenter.sendWithTemplate(request, 'sharing-invitation', data, dataMsgCenter);

      return;
    } catch (error) {
      throw toGrpcError(error);
    }
  }

}
