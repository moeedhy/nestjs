import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { SubjectHook } from '../interfaces';
import { AclMetadata } from '../decorators';
import { GqlExecutionContext } from '@nestjs/graphql';
import { subject as an } from '@casl/ability';
import { AbilityFactory } from '../abstracts';
import { GqlContext, JwtAccessTokenPayload } from '@actimeety/common';

@Injectable()
export class AclGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly casl: AbilityFactory,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const gqlContext = ctx.getContext<GqlContext>();
    const auth = gqlContext.req?.headers?.auth
      ? (JSON.parse(gqlContext.req.headers.auth) as JwtAccessTokenPayload)
      : undefined;

    if (auth) {
      gqlContext['auth'] = { ...auth };
    }
    const metadata = this.reflector.get<AclMetadata>(
      'acl',
      context.getHandler(),
    );

    // If no metadata is present, allow access
    if (!metadata) {
      return true;
    }

    const { action, subject, hookToken } = metadata;
    const ability = await this.casl.create(auth);

    // If hookToken is provided, use it to get the subject entity
    if (hookToken) {
      const hook = this.moduleRef.get<string, SubjectHook>(hookToken, {
        strict: true,
      });

      const entity = await hook.run({ ...ctx.getArgs() }, auth);

      if (!entity) {
        return false;
      }

      return ability.can(action, an(subject, entity));
    }

    // If no hookToken, just check permission against the subject class/string
    return ability.can(action, subject);
  }
}
