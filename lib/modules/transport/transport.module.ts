import { DynamicModule, Global, Module } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { MessagingService } from './messaging.service';
import {
  TransportClientModule,
  TransportModuleOptions,
} from './transport.providers';

@Global()
@Module({
  providers: [MessagingService],
  exports: [MessagingService],
})
export class TransportModule {
  static register(options: TransportModuleOptions): DynamicModule {
    return {
      module: TransportModule,
      imports: [TransportClientModule.register(options)],
      providers: [MessagingService],
      exports: [MessagingService],
      global: options.isGlobal ?? true,
    };
  }

  static registerAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<TransportModuleOptions> | TransportModuleOptions;
    inject?: any[];
    isGlobal?: boolean;
  }): DynamicModule {
    return {
      module: TransportModule,
      imports: [TransportClientModule.registerAsync(options)],
      providers: [MessagingService],
      exports: [MessagingService],
      global: options.isGlobal ?? true,
    };
  }

  // Método de conveniencia para NATS con configuración simple
  static forNats(servers: string[], isGlobal = true): DynamicModule {
    return TransportModule.register({
      clients: [
        {
          transport: Transport.NATS,
          options: {
            servers,
          },
        },
      ],
      isGlobal,
    });
  }

  // Método de conveniencia para Redis con configuración simple
  static forRedis(
    host: string,
    port: number = 6379,
    isGlobal = true,
  ): DynamicModule {
    return TransportModule.register({
      clients: [
        {
          transport: Transport.REDIS,
          options: {
            host,
            port,
          },
        },
      ],
      isGlobal,
    });
  }
}
