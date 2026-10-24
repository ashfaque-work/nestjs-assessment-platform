import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GetUserRequest } from '../dto';
import { AuthGrpcService } from '../grpc-clients';
import { resolveGrpc } from '../helpers/user-secrets';

@Injectable()
export class AuthCommonService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private authGrpcService: AuthGrpcService,
  ) {}

  async getUser(request: GetUserRequest) {
    return await this.authGrpcService.GetUser(request);
  }

  // Note a change an account manager made in the audit log. Called after the change succeeded;
  // a failure to record it is logged but never undoes or fails the change.
  async recordAudit(req: any, action: string, target?: { _id?: unknown; name?: string; email?: string } | null, details?: string) {
    try {
      await resolveGrpc(this.authGrpcService.RecordAudit({
        instancekey: req?.headers?.instancekey ?? req?.instancekey,
        actorId: String(req?.user?._id ?? ''),
        actorName: req?.user?.name ?? req?.user?.email ?? '',
        action,
        targetId: target?._id ? String(target._id) : '',
        targetName: target?.name ?? target?.email ?? '',
        details: details ?? '',
      }));
    } catch (error) {
      Logger.error(`could not record audit entry ${action}: ${error?.message ?? error}`);
    }
  }

  async listAudit(instancekey: string, page: number, limit: number) {
    return resolveGrpc(this.authGrpcService.ListAudit({ instancekey, page, limit }));
  }

  async validateJwtToken(jwt: string) {
    try {
      const validToken = this.jwtService.verify(jwt, {
        secret: this.configService.get('JWT_SECRET'),
      });
      const tokenPayload = this.jwtService.decode(jwt);
      return tokenPayload;
    } catch (error) {
      Logger.error(error);
      throw new UnauthorizedException('JWT EXPIRED / WRONG JWT')
    }
  }
}
