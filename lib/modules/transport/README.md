# Transport Module

This module provides an abstraction for configuring microservice transport clients using NestJS. It is designed to be reusable across different projects and currently supports NATS and Redis.

## Features

- Flexible configuration for NATS and Redis transports
- Support for synchronous and asynchronous configuration
- Convenience methods for common configurations
- Robust and transport-specific typing
- Maintains backward compatibility

## Basic Usage

### Simple Configuration with NATS

```typescript
import { TransportModule } from '@your-org/piatti-common-lib';

@Module({
  imports: [TransportModule.forNats(['nats://localhost:4222'])],
})
export class AppModule {}
```

### Simple Configuration with Redis

```typescript
import { TransportModule } from '@your-org/piatti-common-lib';

@Module({
  imports: [TransportModule.forRedis('localhost', 6379)],
})
export class AppModule {}
```

### Advanced Configuration

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
    {
      name: 'REDIS_CLIENT',
      transport: Transport.REDIS,
      options: {
        host: 'localhost',
        port: 6379,
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

### Asynchronous Configuration

```typescript
import { TransportModule } from '@your-org/piatti-common-lib';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

@Module({
  imports: [
    TransportModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        clients: [
          {
            transport: Transport.NATS,
            options: {
              servers: configService.get<string[]>('NATS_SERVERS'),
            },
          },
        ],
        isGlobal: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## API Reference

### TransportModule

#### Static Methods

- `register(options: TransportModuleOptions)`: Synchronous configuration
- `registerAsync(options)`: Asynchronous configuration
- `forNats(servers: string[], isGlobal?)`: Quick configuration for NATS
- `forRedis(host: string, port?, isGlobal?)`: Quick configuration for Redis

### Interfaces and Types

#### TransportModuleOptions

```typescript
interface TransportModuleOptions {
  clients: TransportConfigOptions[];
  isGlobal?: boolean;
}
```

#### TransportConfigOptions

Union type that includes specific configurations for NATS and Redis:

```typescript
type TransportConfigOptions = NatsTransportConfig | RedisTransportConfig;
```

#### Transport-Specific Configurations

**NATS:**

```typescript
interface NatsTransportConfig {
  name?: string;
  transport: Transport.NATS;
  options: {
    servers?: string[];
    queue?: string;
    queueGroup?: string;
    // ... other NATS options
  };
}
```

**Redis:**

```typescript
interface RedisTransportConfig {
  name?: string;
  transport: Transport.REDIS;
  options: {
    host?: string;
    port?: number;
    retryAttempts?: number;
    retryDelay?: number;
    // ... other Redis options
  };
}
```

### Typing Advantages

With this implementation, you get:

1. **Complete IntelliSense**: TypeScript will help you with autocompletion for transport-specific options
2. **Compile-time validation**: Configuration errors are detected before running the code
3. **Built-in documentation**: Types act as documentation for available options
4. **Safe refactoring**: Configuration changes are automatically detected

### Example with Complete Typing

```typescript
import {
  TransportModule,
  NatsTransportConfig,
} from '@your-org/piatti-common-lib';
import { Transport } from '@nestjs/microservices';

const natsConfig: NatsTransportConfig = {
  name: 'NATS_CLIENT',
  transport: Transport.NATS, // ✅ Correct typing
  options: {
    servers: ['nats://localhost:4222'],
    queue: 'my-service-queue',
    // ✅ IntelliSense will show all valid options for NATS
  },
};

@Module({
  imports: [
    TransportModule.register({
      clients: [natsConfig],
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## Migration from Previous Version

If you're already using the previous module with hardcoded configuration, you can migrate like this:

**Before:**

```typescript
@Module({
  imports: [TransportModule],
})
export class AppModule {}
```

**After:**

```typescript
@Module({
  imports: [
    TransportModule.forNats(
      process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
    ),
  ],
})
export class AppModule {}
```

## Using the MessagingService

Once you've configured the module, you can inject and use the `MessagingService`:

```typescript
import { MessagingService } from '@your-org/piatti-common-lib';

@Injectable()
export class MyService {
  constructor(private readonly messagingService: MessagingService) {}

  async sendMessage() {
    return this.messagingService.send('pattern', { data: 'example' });
  }
}
```
