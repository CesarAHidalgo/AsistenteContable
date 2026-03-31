# AsistenteContable

Proyecto para administrar contabilidad y finanzas personales desde web y movil.

## Estado actual

Este repositorio ya tiene dos capas:

- `index.html`, `styles.css` y `app.js`: MVP estatico para validar flujo rapidamente.
- `app/`, `components/`, `lib/`, `prisma/` y archivos Docker: base de Fase 2 con `Next.js + PostgreSQL + Prisma`.

## Objetivo de la Fase 2

- Persistencia real de movimientos, deudas y recordatorios.
- Acceso desde varios dispositivos.
- Base para autenticacion y automatizaciones.
- Integracion futura con Atajos de iPhone, recordatorios y notificaciones.

## Stack elegido

- `Next.js` para frontend y backend web.
- `PostgreSQL` como base de datos.
- `Prisma` como ORM.
- `Docker` y `Docker Compose` para entorno local consistente.

## Modelo inicial de dominio

- `Transaction`: ingresos y gastos con categoria, metodo de pago y fecha.
- `Debt`: deuda o credito con saldo inicial, saldo actual y pago mensual.
- `DebtPayment`: abonos aplicados a cada deuda.
- `Reminder`: pagos futuros y compromisos mensuales.

## Archivos clave

- `docker-compose.yml`: levanta app y base de datos.
- `Dockerfile`: imagen de la app.
- `prisma/schema.prisma`: modelo de datos inicial.
- `app/page.tsx`: dashboard base.
- `.env.example`: variable `DATABASE_URL`.

## Proximo paso recomendado

1. Reiniciar terminal para que reconozca `node`, `npm`, `git` y `docker`.
2. Copiar `.env.example` a `.env`.
3. Ejecutar `npm install`.
4. Ejecutar `docker compose up -d db`.
5. Ejecutar `npx prisma db push`.
6. Ejecutar `npm run dev`.

## Roadmap corto

1. Formularios reales para crear transacciones, deudas y recordatorios.
2. Acciones del servidor con Prisma.
3. Presupuesto mensual por categoria.
4. Alertas por exceso de gasto.
5. API segura para integracion movil.
