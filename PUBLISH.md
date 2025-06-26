# Guía de Publicación NPM

## Pasos para publicar la librería

### 1. Preparación antes de publicar

```bash
# Instalar dependencias
pnpm install

# Compilar la librería
pnpm run build

# Verificar que no hay errores de TypeScript
npx tsc --noEmit
```

### 2. Versioning (Semantic Versioning)

```bash
# Para cambios menores (bug fixes)
npm version patch

# Para nuevas funcionalidades (backwards compatible)
npm version minor

# Para cambios que rompen compatibilidad
npm version major
```

### 3. Publicar en NPM

```bash
# Login en NPM (solo la primera vez)
npm login

# Publicar
npm publish

# Para publicar una versión beta
npm publish --tag beta
```

### 4. Verificar la publicación

Después de publicar, verifica que tu paquete esté disponible:

- Visita: https://www.npmjs.com/package/piatti-common-lib
- O instala en otro proyecto: `npm install piatti-common-lib`

## Scripts disponibles

- `pnpm run build` - Compila la librería
- `pnpm run build:clean` - Limpia y compila
- `pnpm run clean` - Elimina la carpeta dist

## Notas importantes

1. El script `prepublishOnly` se ejecuta automáticamente antes de publicar
2. Solo se incluyen los archivos especificados en el campo `files` del package.json
3. El `.npmignore` excluye archivos de desarrollo del paquete publicado
