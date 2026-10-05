# Rediseño de reserva pública + paleta dorada unificada

## Objetivo

Reemplazar la pantalla pública de reserva por un wizard de 5 pasos basado en
el diseño importado `booking design mockup` (Claude Design, proyecto
`a442e690-181a-4c68-a5b2-962de95bcf2f`), y usar su paleta dorada para
unificar el look de **toda la app** (pantalla pública + panel admin),
manteniendo el dorado como acento principal.

Fuera de alcance: cambiar la lógica de negocio de disponibilidad/reservas,
cambiar el modelo de datos, o rediseñar la estructura del panel admin más
allá de re-tokenizar sus colores.

## Paleta y tokens (`src/app/globals.css`)

Sustituye la familia rausch/sky/mint/grape por tokens semánticos nuevos,
para que ningún componente vuelva a referenciar un color "de marca" por
nombre literal:

- `--accent-100/500/900` → dorado: `#f2cd8f` / `#d9a34a` / `#b9772e`
  (reemplaza todo uso de rausch/sky para CTAs y acentos de marca)
- `--danger-500/900` → mismo valor que el actual rausch-500/900 (`#e23e5c` /
  `#9e1e3c`), renombrado — evita perder el color de error ya usado en
  formularios
- `--success-500/900` → mismo valor que el actual mint-500/900 (`#1e9e72` /
  `#0d6a4b`), renombrado — usado en confirmaciones/success states
- Escala neutra oscura para el fondo (`--surface-950/900/800`), reemplaza el
  gradiente claro actual por el gradiente radial oscuro con blobs que ya usa
  el modo oscuro hoy (se convierte en el único modo — la app pasa a ser
  dark-first, coherente con el diseño importado)
- `--glass-bg/border/shadow/blur` se ajustan a los valores oscuros ya
  definidos hoy bajo `prefers-color-scheme: dark` (se promueven a `:root`)
- Tipografía: `Big Shoulders Display` (`--font-display`) + `Manrope`
  (`--font-sans`), reemplazando Plus Jakarta Sans + DM Sans en
  `src/app/layout.tsx`

`grape-*` no tiene reemplazo semántico claro (no se usa para nada crítico
tras revisar los 12 archivos que referencian la paleta vieja) — se elimina.

## Componentes afectados (retokenización, sin cambio de API)

Archivos que hoy referencian `--rausch-*/--sky-*/--mint-*/--grape-*` o las
fuentes viejas directamente, y pasan a usar los tokens semánticos nuevos:

- `src/components/ui/GlassButton.tsx`, `GlassStat.tsx`
- `src/components/charts/RevenueBarChart.tsx`
- `src/components/admin/ReservasCalendar.tsx`
- `src/app/admin/reservas/page.tsx`, `src/app/admin/login/page.tsx`,
  `src/app/admin/layout.tsx`
- `src/components/hero/Hero.tsx`, `src/components/booking/ConfirmationTicket.tsx`

`GlassCard.tsx` y `GlassInput.tsx` ya son neutros (usan solo
`--glass-*`/`--foreground*`) — no requieren cambios de color, solo heredan
los tokens nuevos automáticamente.

## Wizard de reserva pública

Reemplaza `src/components/booking/BookingWidget.tsx` (revelado progresivo
de secciones apiladas) por un wizard real de **un paso visible a la vez**
con barra de progreso animada, igual que el diseño importado:

- `src/components/booking/StepProgress.tsx` — barra de 5 pasos (Servicio,
  Día, Hora, Datos, Listo), recibe `currentStep: number` y `labels: string[]`
- `src/components/booking/domain/wizardSteps.ts` — lógica pura sin UI:
  `type StepId = "service" | "day" | "time" | "confirm" | "success"`,
  `STEP_ORDER: StepId[]`, `canAdvance(step, state): boolean` (p. ej. no se
  puede avanzar de "day" sin `selectedDate`) — testeada con Vitest
- `src/components/booking/BookingWizard.tsx` — reemplaza `BookingWidget.tsx`
  (mismo punto de entrada: recibe `services: ServiceItem[]`, se monta desde
  `src/app/page.tsx`). Mantiene el mismo estado y las mismas Server Actions
  que `BookingWidget` ya usa (`getFreeDaysAction`, `getFreeSlotsAction`,
  `createAppointmentAction` — sin cambios, ya están wireadas a datos reales,
  nada de la lógica `hash()` demo del archivo importado se usa). Renderiza
  un único paso a la vez usando `Calendar`, `TimeSlotPicker`, `BookingForm`,
  `ConfirmationTicket` ya existentes (restyleados, no reescritos) más
  botones "Atrás/Siguiente"
- `Hero.tsx` se retira de `page.tsx`: su contenido (nombre + tagline) pasa a
  vivir dentro del wizard como encabezado del paso "Servicio", igual que el
  diseño importado (todo dentro de una sola card de vidrio). El componente
  `Hero.tsx` se elimina.

## Testing

- `wizardSteps.test.ts` (nuevo): `canAdvance` para cada paso, `STEP_ORDER`
  completo
- Suite existente (`npm test`) debe seguir en verde — no se toca lógica de
  disponibilidad/booking, solo UI
- Verificación manual end-to-end en navegador: flujo completo de reserva
  (servicio → día → hora → datos → confirmación) contra datos reales, y
  panel admin (login, disponibilidad, reservas) para confirmar que la
  retokenización no rompe legibilidad/contraste

## Desviación del plan original (fidelidad pixel-perfect)

Tras la primera implementación (reutilizando `GlassCard`/`GlassButton` con
estética "glass chip"), el usuario pidió una réplica exacta del archivo
importado en vez de una reinterpretación. Se rehizo el wizard con
componentes dedicados (`WizardButton`, `StepProgress`, `ServiceStep`,
`DayStep`, `TimeStep`, `ConfirmStep`, `SuccessStep`, `BookingSummary`) que
reproducen literalmente los valores de diseño (colores rgba, blobs
animados, badge con pulso, checkmark SVG animado, botones con barrido
"shine"), en vez de reutilizar el lenguaje visual del panel admin. El panel
admin sigue usando `GlassCard`/`GlassButton`/`glass-surface` (Task 2, sin
cambios), que ya comparten los mismos tokens de color.

## Riesgos y mitigación (para no alargar ni introducir errores)

- Retokenizar en vez de reescribir componentes ya probados (`GlassCard`,
  `Calendar`, `TimeSlotPicker`, `BookingForm`, `ConfirmationTicket`) — solo
  cambian referencias de color/fuente, no lógica
- Un solo cambio de tokens en `globals.css` propaga a los 12 archivos por
  variables CSS — no hay que tocar valores hex sueltos en cada componente
- Nada del modelo de datos, Server Actions o módulos de dominio cambia
