import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { RedisCaching } from '@app/common/services';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class RequestAuthenticationGuard implements CanActivate {
    constructor(
        private readonly redisCache: RedisCaching,
        private readonly jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const request = context.switchToHttp().getRequest();
            const token = request.body.token || request.query.token || request.headers['x-access-token'];
            if (!token) {
                throw new UnauthorizedException({
                    success: false,
                    message: 'No token provided.'
                });
            }

            const settings = await this.redisCache.getSetting(request.headers)
            const clientID = request.body.provider || request.query.provider || process.env.PARTNER_SSO_CLIENT_ID || '12345';
            const secretKey = settings?.ssoConfig?.find(d => d.clientID == clientID)?.clientSecret;
            if (!secretKey) {
                throw new UnauthorizedException({
                    success: false,
                    message: 'SSO client is not configured.'
                });
            }

            // Only signed tokens are accepted. Plain JSON payloads used to be trusted as-is,
            // which let anyone call this endpoint without a secret.
            let decoded: any;
            try {
                decoded = this.jwtService.verify(token, { secret: secretKey })
            } catch (ex) {
                throw new BadRequestException({
                    success: false,
                    message: 'Invalid token'
                })
            }
            request.body.token = decoded;
            return true;
        } catch (ex) {
            Logger.error(ex?.message);
            if (ex instanceof BadRequestException) {
                throw new BadRequestException(ex.getResponse())
            }
            if (ex instanceof UnauthorizedException) {
                throw ex;
            }
            throw new UnauthorizedException({
                success: false,
                message: 'No token provided.'
            });
        }
    }
}
