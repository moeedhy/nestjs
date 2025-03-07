import { SubjectHook } from '../interfaces';
import { SetMetadata, Type } from '@nestjs/common';

export interface AclOptions<T> {
  action: string;
  subject: Type<T>;
  hook?: Type<SubjectHook<T>>;
}

export interface AclMetadata {
  action: string;
  subject: string;
  hookToken?: string;
}

export function ACL<T>(
  action: string,
  subject: Type<T>,
  hook?: Type<SubjectHook<T>>,
) {
  return SetMetadata<'acl', AclMetadata>('acl', {
    action: action,
    subject: subject.name,
    hookToken: hook?.name,
  });
}

