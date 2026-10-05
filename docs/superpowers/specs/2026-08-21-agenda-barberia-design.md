# Agenda de reservas para barbero — Spec

Fecha: 2026-08-21

## Contexto y objetivo

Un barbero (cliente del usuario) necesita un link público único (pensado para
compartir en bio/descripción de redes sociales) donde:

- Sus clientes vean un hero con su nombre/marca y, debajo, un sistema de
  agendamiento tipo AgendaPro: eligen día y hora disponibles y reservan.
- Las horas reservadas quedan marcadas como ocupadas de inmediato (sin
  overbooking).
- El barbero, desde un panel propio, preselecciona qué días/horas atiende
  (disponibilidad base) sin necesitar ayuda técnica futura.

Se hosteará en una VPS propia del usuario (dominio se comprará más
adelante). Debe ser mobile-first (la mayoría de los clientes reservan desde
el celular), visualmente glassmorphism 3D, y requerir cero mantenimiento de
infraestructura a futuro (sin motor de DB que administrar, sin servidor de
correo propio).

Este proyecto también es pieza de portafolio del usuario: la arquitectura
debe ser limpia, en capas, no monolítica.

## Alcance (MVP)

Incluye:
- Landing pública: hero (nombre del barbero) + widget de reserva.
- Selección de servicio (opcional simple: lista fija de servicios con
  nombre/duración/precio, cargados por el barbero desde el admin).
- Calendario: solo muestra días que el barbero habilitó y que tienen al
  menos un horario libre.
- Selección de hora: solo horas dentro de la disponibilidad del barbero y
  no ocupadas por otra reserva.
- Formulario de reserva: nombre, teléfono, email del cliente.
- Confirmación en pantalla + email automático (Resend) al cliente.
- Panel admin (`/admin`), protegido con contraseña única (variable de
  entorno), donde el barbero:
  - Marca qué días de la semana / fechas específicas atiende y en qué
    rango horario.
  - Ve y puede cancelar reservas.
  - Administra la lista de servicios.

Fuera de alcance (no en este MVP, se puede agregar después):
- Múltiples barberos/sucursales.
- Pagos online / señas.
- Recordatorios por WhatsApp/SMS.
- Reprogramación de citas por el cliente (por ahora cancela y reagenda).

## Arquitectura

**Stack:** Next.js 15 (App Router) + TypeScript estricto, Prisma ORM +
SQLite, Resend (email transaccional), Tailwind CSS para el sistema visual
glassmorphism 3D importado desde Claude Design.

**Por qué SQLite:** un solo archivo en la VPS, sin proceso de motor de DB
que mantener/actualizar, backup = copiar el archivo. Apropiado para 1
barbero / tráfico bajo-medio. Prisma abstrae el acceso, así que migrar a
Postgres en el futuro (si crece a multi-barbero) no rompe el resto del
código.

**Por qué Next.js sobre alternativas más livianas (Astro):** para efectos
de portafolio es el stack de mayor reconocimiento; con `output: 'standalone'`
el footprint en la VPS es igualmente mínimo (un proceso Node vía PM2).

**Estructura de carpetas (por capas/dominio, no monolito):**

```
src/
├── app/
│   ├── (public)/page.tsx        # landing: hero + isla de reserva
│   ├── admin/                    # panel protegido del barbero
│   │   ├── login/
│   │   ├── disponibilidad/
│   │   ├── reservas/
│   │   └── servicios/
│   └── api/                      # route handlers puntuales (ej. cron/limpieza)
├── modules/
│   ├── booking/                  # dominio: reservas
│   │   ├── domain/                # reglas: no solapar horarios, ventana mínima
│   │   ├── repository.ts          # acceso a datos vía Prisma, detrás de interfaz
│   │   ├── service.ts             # casos de uso (crear reserva, cancelar)
│   │   └── actions.ts             # Server Actions consumidos por la UI
│   ├── availability/              # dominio: disponibilidad del barbero
│   │   ├── domain/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── services-catalog/          # dominio: servicios que ofrece (corte, barba, etc.)
│   ├── notifications/             # envío de email vía Resend, aislado detrás de interfaz
│   └── auth/                      # sesión admin (contraseña única + cookie firmada)
├── components/                    # UI compartida, design system glassmorphism 3D
├── lib/                            # infra transversal: prisma client, env validation (zod)
└── styles/
prisma/
├── schema.prisma
└── migrations/
```

Cada módulo expone su lógica solo a través de `service.ts` /
`actions.ts`; nada fuera del módulo importa `repository.ts` directamente.
Esto permite testear reglas de negocio sin DB real y cambiar de motor de
datos sin tocar la UI.

## Modelo de datos (Prisma, alto nivel)

- `Service`: id, nombre, duración (min), precio, activo.
- `AvailabilityRule`: reglas recurrentes por día de semana (ej. lunes a
  viernes 10:00–19:00) + posibilidad de excepciones puntuales
  (bloquear/abrir una fecha específica).
- `Appointment`: id, fecha, horaInicio, horaFin, serviceId, nombre cliente,
  teléfono, email, estado (confirmada/cancelada), idempotencyKey (único),
  createdAt. Índice único compuesto en `(date, horaInicio)` para bloquear
  a nivel de DB cualquier doble reserva del mismo slot (ver sección de
  prevención de condición de carrera más abajo).
- `AdminSession`: no se persiste en DB — sesión vía cookie firmada
  (JWT simple) validada contra hash de contraseña en variable de entorno.

Regla de negocio central (en `booking/domain`): un `Appointment` solo puede
crearse si el rango horario cae dentro de una `AvailabilityRule` vigente y
no se solapa con otro `Appointment` confirmado — validado en el servidor
(Server Action), no solo en el cliente.

**Prevención de doble reserva (condición de carrera):** validar en el
servidor y luego insertar en dos pasos separados no es suficiente — dos
clientes pueden reservar el mismo horario si llegan casi simultáneamente
(TOCTOU). La verificación de solapamiento y el `INSERT` del `Appointment`
se ejecutan dentro de una única transacción de Prisma
(`prisma.$transaction`), y además `Appointment` tiene un índice único
compuesto en `(date, horaInicio)` a nivel de base de datos como segunda
barrera: si dos requests concurrentes pasan la validación en memoria, el
segundo `INSERT` falla por violar el constraint único y ese caso se
captura para devolver "ese horario ya no está disponible" en vez de un
error genérico.

**Zona horaria:** todas las fechas/horas se guardan y comparan en la
timezone del barbero (fija, configurable por variable de entorno
`BUSINESS_TIMEZONE`, ej. `America/Santiago`), nunca en la timezone del
servidor ni la del navegador del cliente. La conversión a la hora local
del cliente ocurre solo en la UI, para mostrar (no para calcular
disponibilidad).

**Idempotencia del formulario de reserva:** el widget genera un
`idempotencyKey` (UUID) al abrir el formulario y lo reenvía tal cual en
reintentos/doble clic; el botón de confirmar se deshabilita al enviar. El
`service.ts` de `booking` descarta una segunda creación con la misma
`idempotencyKey` devolviendo la reserva ya creada en vez de duplicarla.

## Flujo de agendamiento (cliente)

1. Cliente abre el link → ve hero + calendario.
2. El calendario pide al servidor (Server Action) los días con
   disponibilidad libre en un rango (ej. próximas 4 semanas).
3. Cliente elige día → se piden las horas libres de ese día específico
   (recalculado en el servidor: disponibilidad menos reservas existentes).
4. Cliente elige hora + servicio, completa nombre/teléfono/email.
5. Al confirmar, el servidor **revalida** que el slot sigue libre
   (evita condición de carrera si dos clientes reservan a la vez) antes de
   crear el `Appointment`.
6. Se muestra confirmación en pantalla y se dispara email vía Resend
   (si falla el email, la reserva igual queda creada — el email no es
   bloqueante).

## Panel admin (barbero)

- Login con contraseña única → cookie de sesión firmada, expira en X días.
- Disponibilidad: UI simple para marcar rango horario por día de semana +
  bloquear fechas puntuales (vacaciones, feriados).
- Reservas: listado de próximas reservas, opción de cancelar (libera el
  slot).
- Servicios: alta/edición simple de nombre, duración, precio.

## Diseño visual

Se importa el sistema de diseño desde el proyecto de Claude Design
(`design-system mockup` + `support.js`) vía el MCP `claude-design`,
llevando su lenguaje glassmorphism 3D al máximo (grande, colorido, 3D) pero
manteniendo elegancia — aplicado tanto al hero como al widget de
agendamiento. Se traduce a componentes React + Tailwind reutilizables en
`components/`.

## Testing

- Unit tests sobre `domain/` de `booking` y `availability` (reglas de
  solapamiento, ventanas horarias) — sin DB real.
- Tests de integración sobre `service.ts` con SQLite en memoria/archivo
  temporal, incluyendo un test que dispara dos creaciones concurrentes del
  mismo slot y verifica que solo una de las dos genere un `Appointment`
  (prueba directa de la barrera anti doble-reserva).

## Deploy

- Build `output: 'standalone'`, proceso gestionado con PM2 en la VPS.
- Variables de entorno: `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`,
  `RESEND_API_KEY`, `DATABASE_URL` (archivo SQLite), `BUSINESS_TIMEZONE`
  (timezone fija del barbero, ej. `America/Santiago`).
- Sin dominio propio aún: accesible por IP:puerto o subdominio temporal
  hasta que el usuario compre el dominio.
