# AsistenteContable

Aplicación web personal para administrar ingresos, gastos, deudas, tarjetas y recordatorios con persistencia real en PostgreSQL, autenticación segura y despliegue con Docker.

## Qué Resuelve

`AsistenteContable` está pensado para centralizar el control financiero personal en una sola aplicación:

- registrar ingresos y gastos por categoría
- guardar el método de pago de cada movimiento
- controlar créditos, rotativos y tarjetas de crédito
- estimar intereses, capital y tiempo de salida de una deuda
- manejar ciclos financieros personalizados
- crear recordatorios de pago y alarmas
- exponer una API segura para integraciones como Atajos de iPhone

## Stack Definitivo

- `Next.js 15`
- `React 19`
- `TypeScript`
- `PostgreSQL 16`
- `Prisma`
- `NextAuth`
- `Docker` y `Docker Compose`

## Arquitectura

```text
AsistenteContable/
├─ app/                         # App Router y endpoints
├─ components/                  # UI reutilizable
├─ lib/                         # auth, datos, finanzas y notificaciones
├─ prisma/                      # esquema de base de datos
├─ public/                      # activos públicos
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
└─ README.md
```

## Módulos Principales

### Autenticación

- login con correo y contraseña
- registro de usuarios desde UI
- login con Google opcional
- guards para rutas privadas
- sesión con expiración por inactividad

### Movimientos

- ingresos y gastos
- categorías configuradas en UI
- método de pago
- soporte para compras con tarjeta en cuotas
- impacto directo en balance del ciclo

### Deudas Y Tarjetas

- crédito de tasa fija
- crédito rotativo
- tarjeta de crédito
- pagos registrados con separación estimada entre interés y capital
- progreso real del saldo
- fecha estimada de última cuota
- simulación comparando cuota actual vs cuota aumentada

### Ciclo Financiero

- ciclo configurable con fecha exacta de inicio y fin
- el balance del periodo usa ese ciclo en lugar del mes calendario

### Recordatorios

Hay dos tipos de recordatorio:

- `PAYMENT`
  Notifica desde `N` días antes de la fecha de pago y deja de avisar cuando se registra como completado.

- `ALARM`
  Dispara la notificación en una fecha y hora exactas.

Cada recordatorio puede activar uno o varios canales:

- correo
- push
- WhatsApp

Además, el sistema guarda un historial de entregas por canal para evitar duplicados y dar trazabilidad.

### Integraciones

- API protegida por `Bearer token`
- endpoint interno para despachar recordatorios por cron
- endpoint para registrar suscripciones Web Push

## Modelo De Datos

Las entidades principales son:

- `User`
- `Session`
- `ApiToken`
- `Transaction`
- `Debt`
- `DebtPayment`
- `Reminder`
- `ReminderDelivery`
- `PushSubscription`

## Variables De Entorno

Ejemplo base:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asistente_contable?schema=public"
AUTH_SECRET="cambia-este-secreto"
NEXTAUTH_SECRET="cambia-este-secreto"
NEXTAUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

CRON_SECRET=""

SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

WEB_PUSH_PUBLIC_KEY=""
WEB_PUSH_PRIVATE_KEY=""
WEB_PUSH_SUBJECT="mailto:tu-correo@ejemplo.com"

WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_TO=""
```

Notas:

- `.env` no se sube al repositorio
- `DATABASE_URL` dentro de Docker se resuelve contra el host `db`
- `CRON_SECRET` protege el endpoint interno de despachos

## Puesta En Marcha

### Opción 1: Docker

```bash
docker compose up -d --build
```

Esto levanta:

- app en `http://localhost:3000`
- PostgreSQL en `localhost:5432`

### Opción 2: Desarrollo Local

1. Crea `.env` usando `.env.example`
2. Instala dependencias:

```bash
npm install
```

3. Levanta la base:

```bash
docker compose up -d db
```

4. Sincroniza Prisma:

```bash
npx prisma db push
```

5. Ejecuta la app:

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:studio
```

## Autenticación

La aplicación protege las pantallas privadas y la API:

- rutas privadas redirigen a `/login` si no hay sesión
- la API de integraciones exige `Authorization: Bearer TU_TOKEN`
- el login con Google se habilita solo si existen credenciales OAuth válidas

Redirect URI local para Google:

```text
http://localhost:3000/api/auth/callback/google
```

## API Disponible

### Transacciones

- `GET /api/v1/transactions`
- `POST /api/v1/transactions`

### Deudas

- `GET /api/v1/debts`
- `POST /api/v1/debts`
- `POST /api/v1/debts/:debtId/payments`

### Recordatorios

- `GET /api/v1/reminders`
- `POST /api/v1/reminders`

### Push

- `POST /api/push/subscriptions`

### Despachador Interno

- `POST /api/internal/reminders/dispatch`

Header requerido:

```http
x-cron-secret: TU_CRON_SECRET
```

## Notificaciones

### Correo

Ya está operativo con SMTP. Necesitas:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Push

La estructura quedó preparada para:

- registrar suscripciones del navegador
- almacenar endpoints por usuario
- despachar recordatorios por Web Push

Para habilitarlo totalmente faltan:

- claves VAPID reales
- cliente frontend que solicite permisos y registre la suscripción
- envío efectivo al endpoint de cada suscripción

### WhatsApp

La integración quedó preparada para Meta WhatsApp Cloud API. Necesitas:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TO`

## Validación Técnica

Flujos ya validados en el proyecto:

- `npm install`
- `npx prisma db push`
- `npm run lint`
- `npm run build`
- `docker compose up -d --build`

## Estado Del Repositorio

El repositorio ya no conserva el MVP estático anterior. La base activa y soportada del producto es únicamente la aplicación moderna sobre `Next.js + Prisma + PostgreSQL + Docker`.

## Roadmap Sugerido

- edición y eliminación de transacciones y deudas desde UI
- presupuestos por categoría
- envío real de Web Push
- automatización periódica del despachador
- historial avanzado y reportes por periodo
- despliegue productivo en servidor
