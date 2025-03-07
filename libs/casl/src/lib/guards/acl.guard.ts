import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import { SubjectHook } from '../interfaces';
import { AclMetadata } from '../decorators';
import { subject as an } from '@casl/ability';
import { AbilityFactory } from '../abstracts';

@Injectable()
export  class AclGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    @Inject('ACL_FACTORY')private readonly casl: AbilityFactory,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {


    const metadata = this.reflector.get<AclMetadata>(
      'acl',
      context.getHandler(),
    );

    // If no metadata is present, allow access
    if (!metadata) {
      return true;
    }

    const { action, subject, hookToken } = metadata;
    const { ability, auth, data , req} = await this.casl.createForContext(context);


    // If hookToken is provided, use it to get the subject entity
    if (hookToken) {
      const hook = this.moduleRef.get<string, SubjectHook>(hookToken, {
        strict: false,
      });

      const entity = await hook.run(data, auth);

      if (!entity) {
        return false;
      }

      req[subject] = entity;
      return ability.can(action, an(subject, entity));
    }

    // If no hookToken, just check permission against the subject class/string
    return ability.can(action, subject);
  }
}
