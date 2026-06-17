# Constitución de FutureDate

Principios no negociables. Toda spec, plan y línea de código debe poder justificarse
contra esta lista. Si algo la contradice, primero se cambia la constitución (con razón
explícita), luego el código.

## I. Spec-first

Ningún código entra sin una spec aprobada que lo respalde. El orden es siempre
`spec → plan → tasks → código`. Un cambio de comportamiento empieza editando la spec,
no el código.

## II. Type-safety de punta a punta

- TypeScript en modo estricto (`strict: true`, sin `any` implícito).
- Toda entrada externa (formularios, params, respuestas de Google) se valida con **Zod**
  antes de usarse.
- El esquema de base de datos (**Drizzle**) es la única fuente de tipos de la DB.

## III. Google Calendar es la fuente de verdad de los eventos

- Los eventos viven en Google. No duplicamos el evento completo en nuestra DB.
- Nuestra DB solo guarda: identidad/sesión, tokens, y **metadatos propios** que Google no
  ofrece (etiquetas, antelación de recordatorio personalizada, notas privadas, caché).
- Crear/editar/borrar un evento siempre escribe en Google primero; la DB se actualiza
  después.

## IV. El tiempo hasta el próximo evento es el rey

- El usuario debe ver **cuánto falta para su próximo evento futuro siempre, sin scroll**,
  sin importar en qué mes caiga.
- La cuenta regresiva y la agenda continua tienen prioridad de diseño sobre la cuadrícula
  mensual tradicional.
- "Próximo evento" = el primer evento cuyo inicio es posterior a `ahora`, en cualquier
  fecha futura.

## V. Los secretos no tocan el cliente

- Client ID/secret de Google, connection string de Neon y tokens **solo existen en el
  servidor**.
- Todo acceso a Google API y a la DB pasa por **server functions** de TanStack Start.
- Los refresh tokens se guardan en la DB asociados a la sesión, nunca en `localStorage`
  ni en cookies legibles por JS.

## VI. Estados explícitos, sin sorpresas

- Toda vista que carga datos maneja explícitamente: cargando, vacío, error y éxito.
- Las zonas horarias son explícitas: se respeta la zona del calendario y la del usuario;
  los cálculos de tiempo usan instantes UTC internamente.

## VII. Probamos la lógica que duele si falla

- La lógica de "cuál es el próximo evento" y el cálculo de tiempo restante tienen tests
  unitarios (incluyendo cambios de mes, año y horario de verano).
- Los server functions críticos (auth, sync) tienen tests.
- No exigimos cobertura de UI puramente presentacional.
