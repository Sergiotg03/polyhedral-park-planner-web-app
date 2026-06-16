<p align="left">
  <img src="frontend/public/favicon.ico" alt="Polyhedral Park Planner logo" width="120" />
</p>

# Polyhedral Park Planner Web App

Repositorio del Trabajo de Fin de Grado sobre la digitalización del juego **Polyhedral Park Planner**.

La aplicación permite registrarse, iniciar sesión, crear partidas, jugar sobre una hoja oficial aleatoria, usar dados, desbloquear y colocar elementos del parque, aplicar penalizaciones, finalizar la partida y consultar el historial con estadísticas generales.

## Tecnologías utilizadas

- Frontend: React, TypeScript, Vite y Chakra UI.
- Backend: NestJS, TypeScript y Prisma.
- Base de datos: PostgreSQL.
- Autenticación: JWT.
- Despliegue: Vercel para el frontend, Render para el backend y Neon para la base de datos.

## Estructura del proyecto

```text
polyhedral-park-planner-web-app/
|-- frontend/       Aplicación web
|-- backend/        API REST
`-- README.md
```

## Funcionalidades principales

- Registro e inicio de sesión de usuarios.
- Protección de rutas mediante token JWT.
- Creación de partidas asociadas al usuario.
- Selección aleatoria de una de las 100 hojas del juego.
- Visualización del tablero de la partida.
- Tirada de dados por ronda.
- Modificación de dados con penalización.
- Relanzamiento de dados con penalización.
- Desbloqueo de elementos según la suma de dados seleccionados.
- Colocación de árboles, caminos, agua y bancos en el tablero.
- Validación de acciones en el backend para evitar movimientos no válidos.
- Avance de ronda hasta completar las 10 rondas.
- Cartas de puntuación aleatorias.
- Cálculo de puntuación final y objetivos de victoria.
- Historial de partidas en curso y finalizadas.
- Estadísticas generales de la cuenta.

## Requisitos previos

Para ejecutar el proyecto en local hace falta tener instalado:

- Node.js 20 o superior.
- npm.
- Una base de datos PostgreSQL.

## Variables de entorno

Hay que crear un archivo `.env` dentro de `backend/` y otro dentro de `frontend/`.

### backend/.env

```env
DATABASE_URL="postgresql://usuario:password@host-pooler/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://usuario:password@host-direct/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="cambia-esto-por-una-clave-secreta-segura"
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### frontend/.env

```env
VITE_API_URL=http://localhost:3000
```

## Instalación

Instalar dependencias del backend:

```bash
cd backend
npm install
```

Instalar dependencias del frontend:

```bash
cd ../frontend
npm install
```

## Base de datos

Desde la carpeta `backend/`, generar el cliente de Prisma y aplicar las migraciones:

```bash
npx prisma generate
npx prisma migrate dev
```

En producción se deben aplicar las migraciones ya existentes:

```bash
npx prisma migrate deploy
```

## Ejecución en local

Iniciar el backend:

```bash
cd backend
npm run start:dev
```

El backend quedará disponible en:

```text
http://localhost:3000
```

Iniciar el frontend:

```bash
cd frontend
npm run dev
```

El frontend quedará disponible en:

```text
http://localhost:5173
```

## Scripts útiles

Backend:

```bash
npm run build
npm run start:dev
npm run start:prod
npm run test
npm run test:e2e
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Pruebas automáticas

Las pruebas e2e están divididas por iteraciones:

```text
backend/test/iteration-1.e2e-spec.ts
backend/test/iteration-2.e2e-spec.ts
backend/test/iteration-3.e2e-spec.ts
backend/test/iteration-4.e2e-spec.ts
```

Para ejecutar todas las pruebas e2e:

```bash
cd backend
npm run test:e2e
```

Para ejecutar una iteración concreta:

```bash
npm run test:e2e -- iteration-1.e2e-spec.ts
npm run test:e2e -- iteration-2.e2e-spec.ts
npm run test:e2e -- iteration-3.e2e-spec.ts
npm run test:e2e -- iteration-4.e2e-spec.ts
```

## Endpoints principales

Autenticación:

```text
POST /auth/register
POST /auth/login
GET  /auth/me
```

Partidas:

```text
POST /game-sessions
GET  /game-sessions
GET  /game-sessions/:id
POST /game-sessions/:id/roll-dice
POST /game-sessions/:id/modify-dice
POST /game-sessions/:id/reroll-dice
POST /game-sessions/:id/unlock-development
POST /game-sessions/:id/place-development
POST /game-sessions/:id/advance-round
```

## Despliegue

La aplicación está preparada para desplegarse con:

- Frontend en Vercel.
- Backend en Render.
- Base de datos en Neon.

URLs usadas durante el desarrollo:

```text
Frontend: https://polyhedral-park-planner.vercel.app/
Backend:  https://polyhedral-park-planner-backend.onrender.com/
```

En Render, el backend debe ejecutar las migraciones antes de arrancar la aplicación. Una forma sencilla es usar como comando de inicio:

```bash
npx prisma migrate deploy && npm run start:prod
```

## Notas

- Las acciones importantes de la partida se validan en el servidor.
- Las estadísticas de victorias, derrotas y puntuaciones máxima y mínima solo usan partidas finalizadas.
- Las estadísticas generales de partidas y elementos colocados cuentan también partidas en curso.
- En Render, si el servicio gratuito está inactivo, puede tardar unos minutos en despertar.
