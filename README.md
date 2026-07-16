# AsistenteContable

Aplicación web personal para administrar ingresos, gastos, deudas, tarjetas, análisis y recordatorios con persistencia real en PostgreSQL, autenticación segura y despliegue con Docker.

## Estado Actual

`AsistenteContable` ya funciona como producto operativo para control financiero personal. Hoy permite:

- registrar ingresos y gastos por categoría y método de pago
- manejar ciclos financieros personalizados, distintos al mes calendario
- controlar deudas de cuota fija, rotativos y tarjetas de crédito
- registrar pagos y estimar capital, interés y fecha de salida
- modelar compras con tarjeta en cuotas, por corte y fecha de pago
- cerrar cortes de tarjeta y guardar snapshots históricos del extracto
- analizar gasto por categoría, método, tendencia y comparación entre ciclos
- crear recordatorios de pago y alarmas con soporte para varios canales
- exponer una API segura para integraciones y automatizaciones
- monitorear errores y salud del servicio con observabilidad base

## Stack

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
├─ app/                         # App Router, pantallas y endpoints
├─ components/                  # UI reutilizable
├─ lib/                         # auth, finanzas, datos, notificaciones y utilidades
├─ prisma/                      # esquema y cliente de base de datos
├─ public/                      # activos públicos
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
└─ README.md
```

## Módulos Del Producto

### Autenticación

- registro por correo y contraseña
- login por credenciales
- login con Google opcional
- guards de rutas privadas
- sesión con expiración por inactividad

### Movimientos

- ingresos y gastos
- categorías sugeridas en UI
- método de pago
- soporte para compras con tarjeta de crédito
- edición y eliminación desde interfaz

Regla importante:

- las compras con `tarjeta de crédito` no golpean directamente el balance de caja del ciclo
- el flujo de caja se impacta cuando registras el pago de la tarjeta

### Deudas

Soporta:

- `FIXED_INSTALLMENT`
- `REVOLVING_CREDIT`
- `CREDIT_CARD`

Incluye:

- valor inicial y saldo actual
- `EA`
- cuota pactada o mínima configurada
- número de cuotas pactadas
- fecha de inicio
- cálculo de progreso real del crédito
- proyección de salida y simulación con cuota aumentada
- edición y eliminación desde UI

### Tarjetas De Crédito

El módulo de tarjetas ya tiene comportamiento dedicado:

- asociación de compras a una tarjeta específica
- definición de corte actual o siguiente al registrar compras
- cálculo por fecha de corte y fecha de pago
- edición individual de compras
- cambio de cuotas en compras
- cálculo de facturado del corte actual y del próximo corte
- mínimo proyectado basado en mínimo/configuración y cuotas del corte
- historial de compras por tarjeta
- cierre manual de corte para congelar una foto del extracto
- historial de cortes cerrados

### Ciclo Financiero

Cada usuario puede definir su propio ciclo con fecha exacta de inicio y fin. El balance, ingresos y gastos del tablero principal usan ese ciclo en vez del mes calendario.

### Análisis

El módulo de análisis incluye:

- gasto por categoría
- gasto por método de pago
- top gastos
- tendencia de los últimos 6 meses
- filtros por período, tipo, categoría y método de pago
- comparación entre ciclo actual y ciclo anterior

### Recordatorios

Hay dos tipos:

- `PAYMENT`
- `ALARM`

Comportamiento actual:

- los recordatorios de pago avisan desde `N` días antes
- dejan de notificar cuando se marcan como completados
- las alarmas disparan en una fecha y hora exactas
- pueden configurarse por correo, push o WhatsApp
- ya existe historial de entregas por canal
- se pueden crear, editar, completar y eliminar desde la UI

## Modelo De Datos

Entidades principales:

- `User`
- `Session`
- `ApiToken`
- `Transaction`
- `Debt`
- `DebtPayment`
- `CreditCardStatementSnapshot`
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

RESEND_API_KEY=""
EMAIL_FROM=""
RESEND_FROM=""

WEB_PUSH_PUBLIC_KEY=""
WEB_PUSH_PRIVATE_KEY=""
WEB_PUSH_SUBJECT="mailto:tu-correo@ejemplo.com"

WHATSAPP_ACCESS_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""
WHATSAPP_TO=""
```

Notas:

- `.env` no se sube al repositorio
- dentro de Docker, `DATABASE_URL` debe apuntar al host `db`
- `CRON_SECRET` protege el endpoint interno de despacho

## Puesta En Marcha

### Opción 1: Docker

```bash
docker compose up -d --build
```

Servicios:

- app en `http://localhost:3000`
- PostgreSQL en `localhost:5432`

### Opción 2: Desarrollo Local

1. Crea `.env` a partir de `.env.example`
2. Instala dependencias

```bash
npm install
```

3. Levanta la base

```bash
docker compose up -d db
```

4. Sincroniza Prisma

```bash
npx prisma db push
```

5. Ejecuta la app

```bash
npm run dev
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npx prisma db push
npx prisma studio
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
- `GET /api/health`
- `GET /api/ready`

Header requerido:

```http
x-cron-secret: TU_CRON_SECRET
```

## Notificaciones

### Correo

El canal de correo usa la API HTTP de Resend, compatible con Render, Railway y Cloudflare Workers:

- `RESEND_API_KEY`
- `EMAIL_FROM`

Compatibilidad opcional:

- `RESEND_FROM`

Notas:

- `EMAIL_FROM` debe ser un remitente autorizado en Resend
- en `Integraciones` puedes verificar la conexión del canal, enviar un correo de prueba y despachar recordatorios manualmente
- los botones de esas acciones muestran estado de carga para evitar dobles clics o confusión mientras el servidor procesa la petición

### Push

La base ya existe para:

- registrar suscripciones
- guardar endpoints por usuario
- despachar recordatorios por canal

Para activarlo completamente faltan:

- claves VAPID reales
- service worker del lado cliente
- suscripción desde navegador o PWA
- envío Web Push efectivo

### WhatsApp

La estructura está preparada para integrarse con Meta WhatsApp Cloud API. Se requieren:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TO`

## Observabilidad

La aplicación ahora incluye una base de observabilidad operativa:

- `global error boundary` con registro estructurado de fallos inesperados de UI
- logging estructurado en JSON para rutas y acciones clave, visible en Render y Cloudflare
- endpoint `GET /api/health` para validar que la app está viva
- endpoint `GET /api/ready` para validar conectividad con PostgreSQL
- trazabilidad de recordatorios enviados, omitidos o fallidos en base de datos

## Validación Técnica

Flujos verificados en el proyecto:

- `npx prisma db push`
- `npm run lint`
- `npm run build`
- `npx opennextjs-cloudflare build`
- `docker compose up -d --build`
- `GET /api/health`
- `GET /api/ready`

## Seguridad

- rutas privadas protegidas
- sesión invalidada por inactividad
- API protegida por `Bearer token`
- secretos fuera del repositorio
- autenticación social opcional con Google

## Estado Del Repositorio

Este repositorio ya no conserva el MVP estático inicial. La base soportada del producto es únicamente la aplicación moderna sobre `Next.js + Prisma + PostgreSQL + Docker`.

## Próximos Pasos Recomendados

- notificaciones reales de punta a punta por correo
- habilitar push web/móvil
- integrar WhatsApp
- filtros más avanzados en movimientos y extractos
- presupuestos por categoría
- despliegue productivo

## Cloudflare Workers

La aplicación quedó preparada para desplegarse también en Cloudflare Workers con OpenNext:

- configuración base en [`wrangler.jsonc`](C:\Users\User\Documents\Proyectos\AsistenteContable\wrangler.jsonc)
- adapter en [`open-next.config.ts`](C:\Users\User\Documents\Proyectos\AsistenteContable\open-next.config.ts)
- scripts `npm run preview`, `npm run deploy`, `npm run cf:prepare-wasm` y `npm run cf-typegen`
- ejemplo de variables para Wrangler en [`\.dev.vars.example`](C:\Users\User\Documents\Proyectos\AsistenteContable\.dev.vars.example)

Notas:

- para Cloudflare productivo conviene usar una `DATABASE_URL` de Neon
- el despliegue prepara y deduplica automáticamente el motor WASM de Prisma para importarlo como módulo precompilado
- `keep_vars` conserva las variables y secretos administrados desde Cloudflare entre despliegues
- en local, `wrangler dev` usa `.dev.vars`, no `.env`
- en Windows, OpenNext advierte compatibilidad parcial; el build puede completarse aunque el preview local sea menos estable que en Linux/Cloudflare
