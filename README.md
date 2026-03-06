# Polyhedral Park Planner Web App

Repositorio del TFG.
- frontend: React + Vite + Chakra UI + MobX
- backend: NestJS + TypeScript
- db: PostgreSQL + Prisma

### Configuración de variables de entorno

Por motivos de seguridad, los archivos `.env` no se incluyen en el repositorio.

Para ejecutar el proyecto en local:

1. Copiar el archivo `.env.example` y renombrarlo como `.env`.
2. Sustituir los valores de ejemplo por las credenciales reales del entorno de desarrollo.
3. Ejecutar las migraciones necesarias con Prisma.

```bash
npx prisma migrate dev
npm run start:dev
```
