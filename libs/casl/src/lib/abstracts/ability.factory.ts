import { ExecutionContext, Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
  MongoQuery,
  Subject,
} from '@casl/ability';
import { AbilityFactoryBuilder, AuthPayload } from '../types';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export abstract class AbilityFactory<
  TAction extends string = string,
  TSubject extends Subject = Subject,
  TAuth = AuthPayload
> {
  /** Creates an ability instance based on the provided auth information */
  private async create(auth?: TAuth): Promise<MongoAbility> {
    const builder = new AbilityBuilder<
      MongoAbility<[TAction, TSubject], MongoQuery>
    >(createMongoAbility);
    await this.defineRules(builder, auth);
    return builder.build();
  }

  /** Abstract method to define authorization rules, implemented by subclasses */
  abstract defineRules(
    builder: AbilityFactoryBuilder<TSubject, TAction>,
    auth?: TAuth
  ): Promise<void>;

  /** Abstract method to extract auth information from the context, implemented by subclasses */
  abstract getAuthFromContext(context: ExecutionContext): Promise<TAuth | undefined>;

  /** Creates and returns an ability for the given context, attaching auth and ability to the appropriate target */
  async createForContext(context: ExecutionContext) {
    const auth = await this.getAuthFromContext(context);
    const ability = await this.create(auth);
    const data = this.getArgs(context);
    const target = this.getAttachTarget(context);
    if (target) {
      target['auth'] = auth;     // Attach auth for use in the request lifecycle
      target['ability'] = ability; // Optionally attach ability for convenience
    }
    return { ability, auth, data , req: target};
  }

  /** Determines the appropriate object to attach auth/ability to, based on context type */
   protected getAttachTarget(context: ExecutionContext) {
    const type = context.getType<GqlContextType>();
    switch (type) {
      case 'http': {
        return context.switchToHttp().getRequest();
      }
      case 'graphql': {
        const ctx = GqlExecutionContext.create(context).getContext();
        return ctx.req || ctx; // Prefer attaching to req if available, otherwise context
      }
      case 'ws': {
        return context.switchToWs().getClient(); // Use client for persistent connection data
      }
      case 'rpc': {
        return context.switchToRpc().getContext(); // No attachment for RPC by default due to varying transport behavior
      }
      default: {
        return null; // Unknown context types get no attachment
      }
    }
  }

  /** Extracts ags or params or data or body from request based host type */
  protected getArgs(context: ExecutionContext) {
    const type = context.getType<GqlContextType>();
    switch (type) {
      case 'http': {
        return  context.switchToHttp().getRequest().params;

      }
      case 'graphql': {
        return { ...GqlExecutionContext.create(context).getArgs() };
      }
      case 'ws': {
        return context.switchToWs().getData();
      }
      case 'rpc': {
        return context.switchToRpc().getData();
      }
      default: {
        return null;
      }
    }
  }
}
