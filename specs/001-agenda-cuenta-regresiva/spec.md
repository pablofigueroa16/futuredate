# Spec 001 — Grilla zoomable + cuenta regresiva

> **Estado:** Aprobada · **Fecha:** 2026-06-16 · **Autor:** Pablo
> Define el QUÉ y el POR QUÉ. Sin decisiones de tecnología (eso va en `plan.md`).

## 1. Problema

El usuario gestiona su vida en Google Calendar. Las apps de calendario muestran bien el
**mes actual**, pero cuando el próximo evento importante cae en un mes futuro hay que
cambiar de mes y/o hacer scroll para verlo, y aun así no se aprecia **de un vistazo cuánto
falta**. El usuario quiere abrir la app y, sin scroll ni navegar, (a) saber cuánto falta
para lo próximo y (b) tener **todos sus eventos a la vista** con el nivel de detalle que él
elija.

## 2. Usuario y objetivo

- **Usuario:** una persona con su propia cuenta de Google (uso personal, single-user por
  ahora; multiusuario no rompe el diseño pero no es objetivo).
- **Objetivo:** ver, crear y gestionar sus citas en **una sola grilla con zoom semántico**
  donde siempre cabe todo en pantalla, y tener siempre presente el tiempo que falta para lo
  próximo.

## 3. Concepto de UI (resumen)

Dos elementos, siempre juntos:

1. **Franja "Próximo" (sticky, arriba):** muestra el próximo evento futuro con cuenta
   regresiva en vivo, más los eventos que el usuario **fije (★)**. Visible en todo momento.
2. **Grilla zoomable (centro, protagonista):** una única grilla de días donde el **zoom no
   agranda píxeles, sino que cambia cuántos días se muestran**. Regla de oro:
   **en cada nivel, TODOS los cuadrados caben en pantalla — nunca hay scroll.**

El **zoom sustituye a las pestañas de vista**: no hay "Agenda/Mes/Año" como modos
separados; hay un control de nivel.

### Niveles de zoom

| Nivel | Días | Disposición | Cada día-cuadrado muestra | Acciones |
|-------|------|-------------|---------------------------|----------|
| **0 — Día** | 1 (hoy) | bloque de horas | evento completo | crear/editar (form), arrastrar/redimensionar |
| **1 — Semana** | 7 | 7 columnas | bloques de evento | mover (arrastrar), editar (form) |
| **2 — Mes** | ~30 | grilla 7-ancho clásica | chips + "+N más" | mover, click → form |
| **3 — Trimestre** | ~90 | compacta | puntos / nº eventos + ★ | click → baja a Mes |
| **4 — Año** | ~365 | **tipo GitHub**: semanas en columnas (7 alto × ~53 ancho) | intensidad (heatmap) + ★ | hover = tooltip, click → baja |

- Al **subir de nivel**, los cuadrados nuevos **aparecen con animación** y todos se
  **reescalan** para seguir cupiendo en pantalla.
- La **disposición se adapta** al nivel para llenar una pantalla ancha sin scroll (el año NO
  se apila en 53 filas; usa semanas como columnas, estilo gráfico de contribuciones).
- Conforme el cuadrado se achica, su contenido **se degrada con elegancia**: evento completo
  → chip → punto → color de intensidad.
- Los eventos **fijados ★ se marcan en TODOS los niveles**, así nunca desaparecen.

## 4. Historias de usuario

- **US-1 (panorama sin scroll, prioritaria):** Como usuario, alejo la grilla hasta el año y
  veo **todos mis eventos a la vez, sin scroll**; un evento a 41 días aparece como casilla
  marcada y la franja me dice "en 41 d".
- **US-2 (franja):** Como usuario, veo siempre arriba mi próximo evento con cuenta regresiva
  en vivo, más los eventos que fijé (★), sin importar el nivel de zoom.
- **US-3 (zoom):** Como usuario, cambio de nivel (Día↔Semana↔Mes↔Trimestre↔Año) y la grilla
  añade/quita cuadrados con animación, manteniendo todo visible sin scroll.
- **US-4 (auth):** Como usuario, inicio sesión con Google y autorizo el acceso a mi
  calendario una sola vez; la sesión persiste.
- **US-5 (crear):** Como usuario, creo una cita con un **formulario clásico** (título,
  inicio/fin, lugar, descripción) y aparece en Google Calendar y en la grilla.
- **US-6 (editar/borrar):** Como usuario, edito o elimino una cita; en niveles finos puedo
  **arrastrar** un evento para moverlo de día.
- **US-7 (fijar):** Como usuario, fijo (★) un evento importante para que aparezca en la
  franja y se marque en todos los niveles de la grilla.
- **US-8 (metadatos):** Como usuario, pongo **etiquetas** y una **antelación de recordatorio**
  propia a un evento; estos datos son míos y no viven en Google.

## 5. Requisitos funcionales

- **RF-1** La app obtiene los eventos del calendario primario del usuario vía su cuenta
  Google autorizada.
- **RF-2** Existe una franja "Próximo" sticky, visible en todos los niveles, con el primer
  evento futuro + cuenta regresiva en vivo + eventos fijados (★).
- **RF-3** La cuenta regresiva calcula correctamente el tiempo restante cruzando días,
  meses, años y cambios de horario de verano.
- **RF-4** Existe una grilla única con **5 niveles de zoom** (0–4). En cada nivel, todos los
  cuadrados del rango caben en el viewport **sin scroll**.
- **RF-5** Al cambiar de nivel, la transición es **animada** (los cuadrados aparecen/se
  reescalan) y la **disposición se adapta** (año = estilo GitHub, semanas en columnas).
- **RF-6** El contenido de cada día-cuadrado **se adapta al nivel** (evento → chip → punto →
  heatmap), según la tabla de §3.
- **RF-7** Los eventos fijados (★) se marcan en todos los niveles y aparecen en la franja.
- **RF-8** El usuario puede crear, editar y eliminar eventos (formulario clásico); los
  cambios se reflejan en Google Calendar.
- **RF-9** En niveles finos (Día/Semana/Mes), el usuario puede **arrastrar** un evento para
  cambiarlo de día. En niveles gruesos (Trimestre/Año), un click **baja un nivel** sobre
  esa fecha.
- **RF-10** El usuario puede asignar etiquetas y antelación de recordatorio por evento
  (metadatos propios persistidos).
- **RF-11** Si no hay ningún evento futuro, la franja muestra un estado vacío claro.

## 6. Requisitos no funcionales

- **RNF-1** Tiempo a interactivo de la franja "Próximo" < 2 s (SSR del próximo evento, sin
  esperar a que cargue toda la grilla).
- **RNF-2** La regla "todo cabe sin scroll" se cumple en una pantalla de escritorio típica
  (≥ 1280×720) en todos los niveles.
- **RNF-3** Las transiciones de zoom van a 60 fps en equipo de gama media; si hay muchos
  eventos, se degrada el detalle, nunca la fluidez.
- **RNF-4** Los secretos y tokens nunca llegan al cliente (ver Constitución §V).
- **RNF-5** Accesible: la cuenta regresiva y los niveles de la grilla son operables por
  teclado y legibles por lector de pantalla; no dependen solo del color.
- **RNF-6** Zonas horarias correctas (cálculos en UTC, presentación en TZ del usuario).
- **RNF-7** Manejo de rate limits / errores de Google API con reintentos y mensaje claro.

## 7. Criterios de aceptación

- [ ] En nivel Año, **todos los eventos del año caben en pantalla sin scroll**; un evento a
      40 días se ve como casilla marcada y la franja dice "en 40 d".
- [ ] Subir Mes→Trimestre→Año anima la aparición de cuadrados y nunca produce scroll.
- [ ] La disposición del nivel Año es tipo GitHub (semanas en columnas), no 53 filas
      apiladas.
- [ ] Un evento fijado (★) se distingue en los 5 niveles y aparece en la franja.
- [ ] Crear un evento desde el formulario lo hace aparecer en Google Calendar.
- [ ] Arrastrar un evento un día en nivel Semana actualiza su fecha en Google.
- [ ] Editar la hora de un evento actualiza la cuenta regresiva de la franja.
- [ ] Cerrar sesión y volver a entrar no vuelve a pedir autorización (refresh token).
- [ ] Un evento etiquetado conserva su etiqueta tras recargar (persistida en DB).

## 8. Fuera de alcance (por ahora)

- **Ver varios años a la vez** en pantalla (queda navegación año-por-año con ◀ ▶; ver §9).
- Compartir calendarios / invitados / RSVP.
- Múltiples calendarios simultáneos (solo el primario al inicio).
- Notificaciones push / email (recordatorios visuales en la app de momento).
- Crear eventos **recurrentes** (sí leer/mostrar; crear queda para iteración posterior).
- Apps móviles nativas (desktop-first; el móvil no es objetivo de la v1).

## 9. Preguntas abiertas

- **Multi-año:** ¿varios años a la vez (cuadrados diminutos, riesgo de fluidez) o **año por
  año con botón ◀ ▶**? Decisión inclinada a botón; confirmar tras ver el nivel Año real.
- **Nivel más allá del año:** ¿existe un nivel 5 ("varios años"/"todo") o el año es el tope?
- ¿Recordatorios solo visuales o también notificación del navegador? (antes de Fase 4)
- ¿Quick-add con lenguaje natural además del formulario clásico? (posible mejora futura)
