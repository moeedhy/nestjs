import { createParamDecorator } from '@nestjs/common';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';


export const AuthData = createParamDecorator((data, context)=> {
  const type = context.getType<GqlContextType>();
  switch (type) {
    case 'http': {
      return context.switchToHttp().getRequest().auth;
    }
    case 'graphql': {
      return GqlExecutionContext.create(context).getContext()?.req?.auth ?? GqlExecutionContext.create(context).getContext().auth;
    }
    case 'rpc': {
      return context.switchToRpc().getContext().auth;
    }
    case 'ws': {
      return context.switchToWs().getClient().auth;
    }
  }
})
