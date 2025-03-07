import { DynamicModule, Module } from '@nestjs/common';
import { AclService } from './acl.service';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigModule } from '@nestjs/config';
import { CONFIGS } from '@actimeety/common';
import { AclModuleOptions } from './types';
import { AclGuard } from './guards';

@Module({})
export class AclModule {
  static forRoot(options: AclModuleOptions): DynamicModule {
    return {
      module: AclModule,
      global: true,
      imports: [
        ClientsModule.registerAsync([
          {
            name: 'ACL_CLIENT',
            imports: [ConfigModule.forFeature(CONFIGS.GRPC)],
            inject: [CONFIGS.GRPC.KEY],
            useFactory: (config: CONFIGS['GRPC']) => {
              return config.client('graph');
            },
          },
        ]),
      ],
      providers: [
        AclService,
        ...options.hookProviders,
        { provide: 'ACL_FACTORY', useClass: options.abilityFactory },
        AclGuard,
      ],
      exports: [AclGuard, AclService],
    };
  }
}
