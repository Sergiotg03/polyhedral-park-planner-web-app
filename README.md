<p align="left">
  <img src="frontend/public/favicon.ico" alt="Polyhedral Park Planner logo" width="120" />
</p>

# Polyhedral Park Planner Web App

Repositorio del Trabajo de Fin de Grado del proyecto **Polyhedral Park Planner Web App**.

La aplicación está dividida en dos partes:

- `frontend/`: cliente web desarrollado con React, Vite, Chakra UI y MobX.
- `backend/`: API desarrollada con NestJS y TypeScript.
- Base de datos: PostgreSQL gestionada mediante Prisma.
- Despliegue: Neon para base de datos, Render para backend y Vercel para frontend.

## Requisitos previos

Antes de ejecutar el proyecto en local es necesario tener instalado:

- Node.js 20 o superior
- npm
- PostgreSQL

## Estructura del proyecto

```text
polyhedral-park-planner-web-app/
├── frontend/
├── backend/
```

## Configuración del entorno

Para ejecutar el proyecto en local hay que crear un archivo `.env` dentro de `backend/`.

### backend/.env

```env
PORT=3000
DATABASE_URL="postgresql://usuario:password@host-pooler/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://usuario:password@host-direct/neondb?sslmode=require&channel_binding=require"
JWT_SECRET="cambia_esto_por_un_secreto_seguro"
```

### Explicación de variables

- `PORT`: puerto en el que se ejecuta el backend.
- `DATABASE_URL`: conexión principal a la base de datos.
- `DIRECT_URL`: conexión directa a la base de datos para migraciones con Prisma.
- `JWT_SECRET`: clave para generar y validar los tokens JWT.

## Instalación

### 1. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 2. Instalar dependencias del frontend

```bash
cd ../frontend
npm install
```

## Preparación de la base de datos

Desde la carpeta `backend/`, ejecutar los comandos necesarios de Prisma para aplicar el esquema a la base de datos.

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

Si no se quieren generar nuevas migraciones y solo se desea aplicar las existentes, se puede usar:

```bash
npx prisma migrate deploy
```

## Ejecución en local

### 1. Iniciar el backend

Desde `backend/`:

```bash
npm run start:dev
```

El backend quedará disponible en:

```text
http://localhost:3000
```

### 2. Iniciar el frontend

Desde `frontend/`:

```bash
npm run dev
```

El frontend quedará disponible en:

```text
http://localhost:5173
```

## Despliegue

La aplicación está desplegada en producción con la siguiente arquitectura:

- Frontend: Vercel
- Backend: Render
- Base de datos: Neon

### URLs de despliegue

- Frontend: https://polyhedral-park-planner.vercel.app/
- Backend: https://polyhedral-park-planner-backend.onrender.com/

## Funcionamiento básico

La aplicación dispone actualmente de autenticación de usuarios con los siguientes endpoints en el backend:

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
