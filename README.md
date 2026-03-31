# AsistenteContable

Aplicacion personal para llevar contabilidad y finanzas desde web y movil, con foco en ingresos, gastos, categorias, metodos de pago, deudas, recordatorios y futuras automatizaciones.

## Vision del producto

`AsistenteContable` nace para resolver una necesidad muy concreta: tener en un solo lugar el registro de la contabilidad personal, el seguimiento de gastos y el control progresivo de creditos o deudas.

La idea es que el sistema permita:

- Registrar ingresos como nomina, honorarios u otras entradas.
- Registrar gastos discriminados por categoria.
- Guardar el metodo de pago usado en cada movimiento.
- Hacer seguimiento al saldo pendiente de creditos y deudas.
- Crear recordatorios para pagos mensuales.
- Detectar cuando el gasto del mes crece demasiado frente a los ingresos.
- Usarse tanto desde navegador como desde celular.
- Evolucionar a integraciones con Atajos de iPhone, recordatorios y notificaciones.

## Estado del proyecto

Actualmente el repositorio tiene dos capas de trabajo:

- Un MVP estatico para validar rapidamente el flujo de negocio.
- Una base moderna para evolucionar a una app real con persistencia, backend y despliegue con Docker.

### MVP estatico

Estos archivos permiten probar el concepto sin depender de backend:

- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `service-worker.js`

Este MVP usa `localStorage` para guardar datos en el navegador.

### Fase 2

La nueva base ya esta preparada con:

- `Next.js`
- `TypeScript`
- `PostgreSQL`
- `Prisma`
- `Docker`
- `Docker Compose`

Esta capa es la que vamos a usar para convertir la idea en una aplicacion real y sincronizable.

## Tecnologias principales

- `Next.js 15`: frontend y base para backend web.
- `React 19`: capa de UI.
- `TypeScript`: tipado y mantenibilidad.
- `PostgreSQL 16`: persistencia principal.
- `Prisma`: modelado y acceso a datos.
- `Docker`: entorno reproducible.
- `Docker Compose`: orquestacion local de app y base de datos.

## Arquitectura inicial

La estructura base del proyecto es:

```text
AsistenteContable/
├─ app/                  # App Router de Next.js
├─ components/           # Componentes de UI reutilizables
├─ lib/                  # Utilidades y datos semilla temporales
├─ prisma/               # Esquema de base de datos
├─ public/               # Archivos publicos
├─ Dockerfile            # Imagen de la aplicacion
├─ docker-compose.yml    # Servicios locales
├─ package.json          # Scripts y dependencias
└─ README.md
```

## Modelo de dominio actual

El esquema inicial contempla estas entidades:

### `Transaction`

Representa ingresos y gastos con:

- descripcion
- monto
- tipo (`INCOME` o `EXPENSE`)
- categoria
- metodo de pago
- fecha del movimiento

### `Debt`

Representa una deuda o credito con:

- nombre
- saldo inicial
- saldo actual
- pago mensual esperado
- dia de pago opcional

### `DebtPayment`

Representa cada abono a una deuda:

- monto abonado
- fecha del pago
- relacion con la deuda

### `Reminder`

Representa compromisos de pago futuros:

- titulo
- monto estimado
- fecha de vencimiento
- estado de cumplimiento

## Funcionalidades actuales

- Inicio de sesion por correo y contrasena.
- Registro de usuarios desde UI.
- Inicio de sesion con Google cuando se configuran las credenciales OAuth.
- CRUD web para transacciones, deudas, abonos y recordatorios.
- Dashboard alimentado desde PostgreSQL.
- Tokens personales para integraciones.
- API JSON protegida con `Bearer token`.
- Base preparada para Atajos de iPhone y automatizaciones personales.

## Puesta en marcha local

### Opcion 1: desarrollo local con Node

1. Copia el archivo de variables:

```bash
cp .env.example .env
```

En Windows PowerShell puedes crear `.env` manualmente tomando como base `.env.example`.

2. Instala dependencias:

```bash
npm install
```

3. Levanta la base de datos:

```bash
docker compose up -d db
```

4. Sincroniza el esquema:

```bash
npx prisma db push
```

5. Ejecuta la app:

```bash
npm run dev
```

La app quedara disponible en `http://localhost:3000`.

### Opcion 2: entorno completo con Docker

```bash
docker compose up -d --build
```

Esto levanta:

- `app` en `http://localhost:3000`
- `db` PostgreSQL en `localhost:5432`

## Variables de entorno

Ejemplo actual:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/asistente_contable?schema=public"
AUTH_SECRET="cambia-este-secreto-por-uno-largo-y-aleatorio"
NEXTAUTH_SECRET="cambia-este-secreto-por-uno-largo-y-aleatorio"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Dentro de Docker Compose, el servicio `app` usa internamente `db` como host de PostgreSQL.

## Scripts disponibles

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:studio
```

## Autenticacion y guards

La aplicacion ahora usa autenticacion web con `Auth.js`:

- login por correo y contrasena
- registro de usuarios desde `/registro`
- login con Google cuando configuras OAuth
- proteccion de rutas privadas mediante `proxy.ts`
- proteccion de integraciones API mediante `Bearer token`

Las rutas privadas web no se pueden abrir solo con conocer la URL. Si no existe sesion valida, el usuario es redirigido a `/login`.

### Como activar Google Sign-In

1. Crea un proyecto en Google Cloud Console.
2. Configura OAuth 2.0 para aplicacion web.
3. Agrega como redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

4. Copia `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` al `.env`.
5. Define tambien `AUTH_SECRET`.

## API para integraciones moviles

Endpoints iniciales:

- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `GET /api/v1/debts`
- `POST /api/v1/debts`
- `POST /api/v1/debts/:debtId/payments`
- `GET /api/v1/reminders`
- `POST /api/v1/reminders`

Autorizacion:

```http
Authorization: Bearer TU_TOKEN
```

Ejemplo de creacion de transaccion:

```json
{
  "description": "Pago almuerzo",
  "amount": 24000,
  "type": "EXPENSE",
  "category": "Mercado",
  "paymentMethod": "NEQUI",
  "transactionAt": "2026-03-30"
}
```

## Archivos importantes

- `package.json`: dependencias y scripts del proyecto.
- `docker-compose.yml`: servicios `app` y `db`.
- `Dockerfile`: definicion de la imagen de la aplicacion.
- `prisma/schema.prisma`: modelo de datos inicial.
- `app/page.tsx`: dashboard base de la app.
- `app/globals.css`: sistema visual inicial.
- `.env.example`: ejemplo de configuracion local.

## Estado de validacion tecnica

En esta etapa deberia validarse:

- `npm install`
- `npx prisma db push`
- `npm run build`
- `docker compose up -d --build`
- registro de usuario
- login por credenciales
- consumo de API con token generado desde `/integraciones`

## Roadmap recomendado

### Fase 3

- Presupuesto mensual por categoria.
- Filtros por periodo, categoria y metodo de pago.
- Marcado de recordatorios como pagados.
- Edicion y eliminacion de movimientos existentes.

### Fase 4

- Alertas mas inteligentes por sobreconsumo.
- Historial de pagos de deuda y proyeccion de saldo.
- Panel de metricas mensuales y comparativos.
- Dashboard de categorias y metodos de pago.

### Fase 5

- Sincronizacion entre dispositivos.
- Integracion avanzada con Atajos de iPhone.
- Notificaciones por push, correo, Telegram o WhatsApp.
- Automatizaciones programadas de recordatorios y cierre mensual.

## Consideraciones actuales

- El MVP estatico sigue presente para referencia funcional.
- El dashboard principal ya usa datos reales desde Prisma.
- `lib/seed-data.ts` puede retirarse en una limpieza futura.
- La API actual esta pensada para uso personal y controlado.

## Siguiente paso sugerido

El paso con mejor retorno ahora mismo es implementar:

1. Presupuesto mensual por categoria.
2. Edicion y eliminacion de registros desde la UI.
3. Shortcut de iPhone para captura rapida de gastos.
4. Alertas y recordatorios activos fuera del dashboard.
