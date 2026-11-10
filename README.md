# @digoai/piatti-common

Librería común de los microservicios NestJS de **Piatti**. Reúne el código de transporte NATS/Redis, métricas Prometheus y logging que comparten los servicios, para no repetirlo en cada repositorio.

Se publica en npm como [`@digoai/piatti-common`](https://www.npmjs.com/package/@digoai/piatti-common). Este repositorio es su código fuente.

## Módulos

| Módulo | Exportado | Descripción |
|---|---|---|
| [Transport](lib/modules/transport/README.md) | Sí | `TransportModule` y `MessagingService`: configura clientes NATS o Redis y envía mensajes (`send`) o eventos (`emit`). |
| [Metrics](lib/modules/metrics/README.md) | Sí | `MetricsModule`: expone `/metrics` para Prometheus con métricas de Node.js y de cada petición HTTP o handler NATS. |
| [Logging](lib/modules/logging/README.md) | No | `LoggingModule` con Pino y propagación del `request-id` de punta a punta ([guía](lib/modules/logging/END_TO_END_TRACING.md)). Existe en el código, pero [`lib/index.ts`](lib/index.ts) todavía no lo exporta. |

## Versiones

| Versión | Etiqueta npm | Contenido |
|---|---|---|
| `1.0.1` | `latest` | Transport. Es la versión que usan hoy los microservicios. |
| `1.1.0` | `beta` | Transport + Metrics. |

## Instalación

```bash
pnpm add @digoai/piatti-common
```

Dependencias peer que debe tener el servicio: `@nestjs/common`, `@nestjs/core` y `@nestjs/microservices` (^11), `class-transformer`, `class-validator`, `reflect-metadata`, `rxjs` y `pino-pretty`.

## Uso

### Transport

Registra un cliente NATS global y usa `MessagingService` para hablar con otros servicios:

```typescript
import { Module } from '@nestjs/common';
import { TransportModule } from '@digoai/piatti-common';

@Module({
  imports: [TransportModule.forNats(['nats://localhost:4222'])],
})
export class AppModule {}
```

```typescript
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { MessagingService } from '@digoai/piatti-common';

@Injectable()
export class OrdersService {
  constructor(private readonly client: MessagingService) {}

  getTenant(tenantId: string) {
    return firstValueFrom(this.client.send('tenant.get.id', { id: tenantId }));
  }

  notifyUpdate(order: unknown) {
    this.client.emit('ws.orders.update', order);
  }
}
```

`MessagingService` agrega el `request-id` de la petición a la metadata del mensaje para poder seguirla entre servicios.

Para una configuración avanzada (Redis, varios clientes, `registerAsync`), ver la [documentación del módulo Transport](lib/modules/transport/README.md).

### Metrics

```typescript
import { MetricsModule } from '@digoai/piatti-common';

@Module({
  imports: [MetricsModule.forRoot({ defaultLabels: { service: 'order-ms' } })],
})
export class AppModule {}
```

Expone `/metrics` en el mismo puerto HTTP del servicio y registra `app_requests_total` y `app_request_duration_seconds` por `type` (`http` o `rpc`), `pattern` y `status`. Ver la [documentación del módulo Metrics](lib/modules/metrics/README.md).

## Desarrollo

Requisitos: Node.js 24.22.1 (ver [`.nvmrc`](.nvmrc)) y pnpm 11.28.8 (`corepack enable`).

```bash
git clone https://github.com/DIGOAI/piatti-common-lib.git
cd piatti-common-lib
corepack enable
pnpm install
pnpm run build        # compila lib/ a dist/ con tsconfig.build.json
```

| Comando | Qué hace |
|---|---|
| `pnpm run build` | Compila a `dist/` |
| `pnpm run clean` | Borra `dist/` y `.tsbuildinfo` |
| `pnpm run build:clean` | Limpia y compila |
| `pnpm run version:patch` / `version:minor` / `version:major` | Sube la versión y crea el commit `🔖` y el tag |

### Probar cambios en un servicio sin publicar

Los servicios instalan la librería desde npm, no desde esta carpeta. Para probar un cambio local:

```bash
# En piatti-common-lib
pnpm run build && pnpm pack          # genera digoai-piatti-common-<versión>.tgz

# En el servicio
pnpm add ../piatti-common-lib/digoai-piatti-common-<versión>.tgz
```

No edites archivos dentro de `node_modules` del servicio. Revierte la dependencia a la versión publicada antes de hacer commit.

## Publicación

Los pasos completos están en [PUBLISH.md](PUBLISH.md). En resumen:

1. Compila y revisa los tipos (`pnpm run build`).
2. Sube la versión con `pnpm run version:<patch|minor|major>` según [SemVer](https://semver.org/lang/es/).
3. Publica con `npm publish` (o `npm publish --tag beta` para una prerelease). `prepublishOnly` compila antes de publicar.
4. Actualiza `@digoai/piatti-common` en el `package.json` de cada servicio que necesite la nueva versión.

El paquete solo incluye `dist/`, `README.md` y `package.json` (campo `files`).

## Ecosistema Piatti

Esta librería la usan los microservicios del backend de Piatti:

| Repositorio | Rol |
|---|---|
| [piatti-gateway-ms](https://github.com/DIGOAI/piatti-gateway-ms) (`client-gw`) | API Gateway (no usa esta librería) |
| [piatti-auth-ms](https://github.com/DIGOAI/piatti-auth-ms) | Autenticación, usuarios, empleados y JWT |
| [piatti-tenant-ms](https://github.com/DIGOAI/piatti-tenant-ms) | Restaurantes, configuración y catálogo |
| [piatti-order-ms](https://github.com/DIGOAI/piatti-order-ms) | Órdenes, ítems y mesas |
| [piatti-billing-ms](https://github.com/DIGOAI/piatti-billing-ms) | Cobros, pagos, caja, créditos y facturación |
| [piatti-report-ms](https://github.com/DIGOAI/piatti-report-ms) | Reportes de solo lectura |
| [inventory-ms](https://github.com/DIGOAI/inventory-ms) | Inventario: bodegas, kardex y recetas |

## Ayuda

Reporta errores o propone cambios en los [issues de este repositorio](https://github.com/DIGOAI/piatti-common-lib/issues).

## Mantenimiento y contribución

Lo mantiene el equipo de DIGO ([DIGOAI](https://github.com/DIGOAI)).

1. Crea una rama desde `main` y abre el PR hacia `main`.
2. Escribe los commits con [gitmoji](https://gitmoji.dev) (`✨` funcionalidad, `🐛` corrección, `🔧` configuración, `🔖` versión).
3. Un cambio que rompe la API pública requiere una versión mayor y actualizar los servicios que la usan.

## Licencia

[MIT](https://opensource.org/licenses/MIT), según el campo `license` de `package.json`.
