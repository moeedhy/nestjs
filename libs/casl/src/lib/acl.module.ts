import { DynamicModule, Module } from '@nestjs/common';

import { AclModuleOptions } from './types';
import { AclGuard } from './guards';

@Module({})
export class AclModule {
  static forRoot(options: AclModuleOptions): DynamicModule {
    return {
      module: AclModule,
      global: true,
      providers: [
        ...options.hookProviders,
        { provide: 'ACL_FACTORY', useClass: options.abilityFactory },
        AclGuard,
      ],
      exports: [AclGuard],
    };
  }
}
