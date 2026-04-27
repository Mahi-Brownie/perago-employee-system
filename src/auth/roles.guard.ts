import { Injectable, CanActivate, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request?.user;

    if (!user) {
      this.logger.warn(`Access denied: missing authenticated user on ${context.getHandler().name}`);
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.role) {
      this.logger.warn(`Access denied: authenticated user has no role on ${context.getHandler().name}`);
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(`Access denied: user role=${user.role} not authorized for ${context.getHandler().name}. Required roles: [${requiredRoles.join(', ')}]`);
    }

    return hasRole;
  }
}