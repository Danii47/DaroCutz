# DaroCutz

Web de reservas de citas para barbería. Astro (SSR con adaptador Node),
PostgreSQL con Drizzle ORM, desplegada en un VPS con Docker Compose.

Hay dos tipos de cuenta:

- **Administrador**: abre huecos disponibles, gestiona los lugares donde
  atiende, ve las reservas y aprueba las altas de clientes nuevos.
- **Cliente**: se registra, espera la aprobación del administrador y reserva
  uno de los huecos publicados. Solo puede tener una cita activa a la vez.

Todas las horas se manejan en **Europe/Madrid**, independientemente de la zona
horaria del servidor.

## Puesta en marcha en local

```sh
npm install
cp .env.example .env   # y rellena los valores
npm run dev            # http://localhost:4321
```

Variables de entorno:

| Variable        | Obligatoria | Descripción                                                     |
| :-------------- | :---------- | :-------------------------------------------------------------- |
| `DATABASE_URL`  | sí          | Cadena de conexión de PostgreSQL.                                |
| `JWT_SECRET`    | sí          | Clave de firma de sesión. Mínimo 32 caracteres aleatorios.       |
| `DB_PASSWORD`   | sí (Docker) | Contraseña de PostgreSQL que usa `docker-compose.yml`.           |
| `COOKIE_SECURE` | no          | `true`, `false` o `auto` (por defecto: Secure solo bajo https).  |

Genera un secreto decente con `openssl rand -base64 48`.

## Comandos

| Comando               | Acción                                                     |
| :-------------------- | :--------------------------------------------------------- |
| `npm run dev`         | Servidor de desarrollo en `localhost:4321`.                 |
| `npm run build`       | Compila a `./dist/`. No necesita acceso a la base de datos. |
| `npm run preview`     | Sirve la compilación de producción.                         |
| `npm run db:migrate`  | Aplica las migraciones SQL de `./drizzle`.                  |
| `npm run db:push`     | Sincroniza el esquema de Drizzle directamente (solo dev).   |
| `npx astro check`     | Comprobación de tipos.                                      |

## Base de datos

El esquema vive en `src/lib/db/schema.ts` y las migraciones en `drizzle/*.sql`.

Las migraciones son **SQL idempotente**: cada fichero se puede ejecutar tantas
veces como haga falta sin romper nada (`CREATE TABLE IF NOT EXISTS`,
`ADD COLUMN IF NOT EXISTS`, etc.). `scripts/migrate.mjs` las aplica en orden
alfabético, y el contenedor lo ejecuta **automáticamente al arrancar**, antes de
levantar el servidor. Un despliegue no requiere ningún paso manual.

Para añadir un cambio de esquema: edita `schema.ts` y crea un
`drizzle/000N_lo_que_sea.sql` escrito de forma idempotente.

Tablas:

- `users` — clientes y administradores (`is_admin`, `is_approved`).
- `locations` — lugares donde se atiende, con color y uno marcado por defecto.
- `appointments` — huecos. `user_id` a `NULL` significa que está libre.

## API

Todas las rutas devuelven JSON con la forma `{ success, ... }` y exigen sesión.
Las mutaciones están protegidas contra CSRF por la comprobación de origen de
Astro.

```
POST   /api/auth/register          Alta de cliente (queda pendiente)
POST   /api/auth/login             Iniciar sesión
POST   /api/auth/logout            Cerrar sesión

GET    /api/appointments           Huecos futuros (el admin ve más detalle)
GET    /api/appointments?type=reserved   Reservas confirmadas        [admin]
POST   /api/appointments           Abrir un hueco                    [admin]
PATCH  /api/appointments/:id       Reservar un hueco                 [cliente]
PUT    /api/appointments/:id       Liberar una reserva               [admin]
DELETE /api/appointments/:id       Borrar un hueco libre             [admin]
       ...?force=true              Borrar también si está reservado  [admin]

GET    /api/locations              Lugares
POST   /api/locations              Crear lugar                       [admin]
PATCH  /api/locations/:id          Editar lugar                      [admin]
DELETE /api/locations/:id          Borrar (o archivar si está en uso) [admin]

GET    /api/users/pending          Altas pendientes                  [admin]
POST   /api/users/:id/approve      Aprobar alta                      [admin]
POST   /api/users/:id/reject       Rechazar y eliminar               [admin]
```

## Despliegue

`git push` a `main` dispara `.github/workflows/deploy.yml`, que entra por SSH al
VPS, hace `git pull` y `docker compose up -d --build`. Al arrancar, el
contenedor aplica las migraciones pendientes y levanta el servidor.

`docker-compose.yml` **sí está versionado**: no contiene secretos, solo
referencias a las variables del `.env` del servidor, que nunca se sube.

La imagen no lleva secretos horneados: `DATABASE_URL` y `JWT_SECRET` se leen en
tiempo de ejecución, no durante el `build`. Postgres no publica ningún puerto;
solo es accesible desde la red interna de Docker.
