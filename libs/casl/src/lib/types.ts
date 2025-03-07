import {
  AbilityBuilder,
  MongoAbility,
  MongoQuery,
  Subject,
} from '@casl/ability';
import { AbilityFactory } from './abstracts';
import { Type } from '@nestjs/common';
import { SubjectHook } from './interfaces';

export enum AclActions {
  create = 'create',
  read = 'read',
  update = 'update',
  delete = 'delete',
  manage = 'manage',
}

export type AbilityFactoryBuilder<
  TSubject extends Subject,
  TAction extends string,
> = AbilityBuilder<MongoAbility<[TAction, TSubject], MongoQuery>>;

export type AclModuleOptions = {
  hookProviders: Type<SubjectHook>[];
  abilityFactory: Type<AbilityFactory>;
};



export type AuthPayload = {
  user?: {id: string};
}
