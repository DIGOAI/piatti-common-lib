# Piatti Common Library

This is a common library for projects that use `NestJS`. It provides reusable modules and services to facilitate application development.

## Features

- [Transport Module](#transport-module): Abstraction for configuring microservice transport clients.

## Transport Module

This module provides an abstraction for configuring microservice transport clients using `NestJS`. It is designed to be reusable across different projects and currently supports `NATS` and `Redis`.

### Features

- Flexible configuration for `NATS` and `Redis` transports
- Support for synchronous and asynchronous configuration
- Convenience methods for common configurations
- Robust and transport-specific typing
- Maintains backward compatibility

### Basic Usage

#### Simple Configuration with NATS

```typescript
import { TransportModule } from '@your-org/piatti-common-lib';

@Module({
  imports: [TransportModule.forNats(['nats://localhost:4222'])],
})
export class AppModule {}
```

#### Advanced Configuration

```typescript
import {
  TransportModule,
  TransportModuleOptions,
} from '@your-org/piatti-common-lib';
import { Transport } from '@nestjs/microservices';

const transportConfig: TransportModuleOptions = {
  clients: [
    {
      name: 'NATS_CLIENT',
      transport: Transport.NATS,
      options: {
        servers: ['nats://localhost:4222'],
        queue: 'my-queue',
      },
    },
  ],
  isGlobal: true,
};

@Module({
  imports: [TransportModule.register(transportConfig)],
})
export class AppModule {}
```

> [!NOTE]
> For detailed usage and configuration options, refer to the [Transport Module documentation](lib/modules/transport/README.md).
