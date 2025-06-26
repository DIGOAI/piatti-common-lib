import { DynamicModule } from '@nestjs/common';
import {
  ClientProviderOptions,
  ClientsModule,
  NatsOptions,
  RedisOptions,
  Transport,
} from '@nestjs/microservices';
import { TRANSPORT_CLIENT } from './transport.constants';

// Union type para los diferentes tipos de opciones de transporte
export type NatsTransportOptions = NatsOptions['options'];
export type RedisTransportOptions = RedisOptions['options'];

// Interface base para configuración de transporte
export interface BaseTransportConfig {
  name?: string;
  transport: Transport;
}

// Interfaces específicas para cada tipo de transporte
export interface NatsTransportConfig extends BaseTransportConfig {
  transport: Transport.NATS;
  options: NatsTransportOptions;
}

export interface RedisTransportConfig extends BaseTransportConfig {
  transport: Transport.REDIS;
  options: RedisTransportOptions;
}

// Union type principal para configuraciones de transporte
export type TransportConfigOptions = NatsTransportConfig | RedisTransportConfig;

export interface TransportModuleOptions {
  clients: TransportConfigOptions[];
  isGlobal?: boolean;
}

export class TransportClientModule {
  static register(options: TransportModuleOptions): DynamicModule {
    const clientProviders: ClientProviderOptions[] = options.clients.map(
      (client) =>
        ({
          name: client.name || TRANSPORT_CLIENT,
          transport: client.transport,
          options: client.options,
        }) as ClientProviderOptions,
    );

    return ClientsModule.register(clientProviders);
  }

  static registerAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<TransportModuleOptions> | TransportModuleOptions;
    inject?: any[];
    isGlobal?: boolean;
  }): DynamicModule {
    return {
      module: ClientsModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: TRANSPORT_CLIENT,
            useFactory: async (...args: any[]) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              const config = await options.useFactory(...args);
              return config.clients[0] || {};
            },
            inject: options.inject,
          },
        ]),
      ],
      global: options.isGlobal,
    };
  }
}

// Mantener compatibilidad hacia atrás con configuración por defecto
export const createDefaultTransportModule = (
  servers: string[],
): DynamicModule => {
  return TransportClientModule.register({
    clients: [
      {
        name: TRANSPORT_CLIENT,
        transport: Transport.NATS,
        options: {
          servers,
        },
      },
    ],
  });
};
