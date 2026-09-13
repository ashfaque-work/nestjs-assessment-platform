// authentication.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthCommonService } from '../auth.service';

// Routes that never require a token. Matched against the exact path (no query string),
// so `/any/route?x=auth/login` cannot skip authentication.
const PUBLIC_ROUTES: { method?: string; path: string }[] = [
  { path: '/auth/login' },
  { method: 'POST', path: '/auth/users' },
  { path: '/auth/recoverPassword' },
];

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private authService: AuthCommonService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const path: string = (request.path || request.url.split('?')[0]).replace(/\/+$/, '');
      Logger.debug(`call the url:: ${request.method} ${path}`);
      request.instancekey = request.headers.instancekey;
      const token = request.headers.authtoken;
      if (PUBLIC_ROUTES.some(r => r.path === path && (!r.method || r.method === request.method))) {
        return true;
      }

      if (!token) {
        // Handle case where token is missing
        throw new UnauthorizedException('authtoken is missing');
      }

      // Validate and decode the JWT token
      const decodedTokenPayload = await this.authService.validateJwtToken(token);

      // A token issued for one instance must not be used against another instance
      if (request.instancekey && decodedTokenPayload.ik && request.instancekey !== decodedTokenPayload.ik) {
        throw new UnauthorizedException('Token does not belong to this instance');
      }

      // Attach the decoded user to the request for downstream use
      const user = await this.authService.getUser({
        instancekey: request.instancekey ? request.instancekey : decodedTokenPayload.ik,
        _id: decodedTokenPayload.userId,
      });

      // Always overwrite client supplied userid/roles with the verified values
      request.body = { ...request.body, userid: user._id, roles: user.roles };
      request.user = user;
      return true;
    } catch (error) {
      Logger.error(error?.message);
      throw new UnauthorizedException(error.message)
    }
  }
}
