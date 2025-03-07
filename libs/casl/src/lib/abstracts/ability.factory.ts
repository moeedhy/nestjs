import { Injectable } from '@nestjs/common';
import { JwtAccessTokenPayload } from '@actimeety/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  MongoQuery,
  Subject,
} from '@casl/ability';
import { AbilityFactoryBuilder } from '../types';

@Injectable()
export abstract class AbilityFactory<
  TAction extends string = string,
  TSubject extends Subject = Subject,
> {
  async create(auth?: JwtAccessTokenPayload): Promise<MongoAbility> {
    const builder = new AbilityBuilder<
      MongoAbility<[TAction, TSubject], MongoQuery>
    >(createMongoAbility);
    await this.defineRules(builder, auth);
    return builder.build();
  }

  abstract defineRules(
    builder: AbilityFactoryBuilder<TSubject, TAction>,
    auth?: JwtAccessTokenPayload,
  ): Promise<void>;
}
