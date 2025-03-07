import { createParamDecorator, Type } from '@nestjs/common';
import { SubjectClass, SubjectType } from '@casl/ability';
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql';


export const Subject = createParamDecorator((data: SubjectType, context)=> {
  const type = context.getType<GqlContextType>();

  const subjectName  =  typeof data === 'string' ? data : data.name;

  switch (type) {
    case 'http': {
      return context.switchToHttp().getRequest()[subjectName];
    }
    case 'graphql': {
      return GqlExecutionContext.create(context).getContext()?.req?.[subjectName] ?? GqlExecutionContext.create(context).getContext()[subjectName];
    }
    case 'rpc': {
      return context.switchToRpc().getContext()[subjectName];
    }
    case 'ws': {
      return context.switchToWs().getClient()[subjectName];
    }
  }

})
