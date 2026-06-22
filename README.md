# Morning Routine — Kiro

App personal de rutina matutina con autenticación Google, gestión de tareas, pendientes a mediano plazo, seguimiento emocional e historial. Acceso restringido a un solo usuario.

**Stack:** HTML · CSS · JS vanilla · Supabase (auth + PostgreSQL) · Vercel

**URL:** https://morning-routine-kiro.vercel.app

---

## Funcionalidades

### Autenticación
- Login con Google OAuth
- Acceso restringido únicamente a `ca.isaac.mendoza@gmail.com`
- Cierre de sesión manual

### Timer inteligente — tres estados
- **Antes de las 5:30am** → cuenta regresiva para despertar
- **Entre 5:30 y 8:00am** → cuenta regresiva para estar listo (cambia color según urgencia)
- **Después de las 8:00am** → cuenta regresiva para el próximo despertar
- Cambia automáticamente sin recargar la página

### Tareas diarias
- CRUD completo (agregar, editar nombre, editar duración, eliminar)
- Horarios calculados automáticamente según hora de inicio configurable
- Barra de progreso del día (tareas completadas / total)
- **Reset automático cada nuevo día** — las tareas se desmarcan al abrir la app en un día diferente
- Tiempo total y hora estimada de finalización

### Pendientes a mediano plazo
- CRUD completo con fecha límite
- Urgencia visual automática por color:
  - 🟢 Verde → más de 7 días
  - 🟡 Amarillo → 4 a 7 días
  - 🔴 Rojo → 3 días o menos / vencido
- Ordenados automáticamente del más urgente al más lejano
- Título editable con doble clic
- Calendario personalizado al hacer clic en la fecha
- Contador de días restantes en tiempo real
- Completados se mantienen visibles el mismo día con checkmark
- Al día siguiente los completados se mueven al historial automáticamente

### Historial de pendientes
- Lista de todos los pendientes completados
- Fecha en que fue completado cada uno
- Indicador de si se completó a tiempo o tarde respecto a la fecha límite

### Estado de ánimo (Mood check-in)
- 6 opciones de estado: 😴 cansado · 😟 estresado · 😢 triste · 😐 neutral · 🙂 bien · ⚡ con energía
- Actualizable en cualquier momento durante el día
- Se guarda en el log diario de Supabase

### Widgets
- **Clima CDMX** — temperatura actual y recomendación (paraguas, lentes, etc.) vía Open-Meteo
- **Agenda del día** — eventos de Google Calendar con horarios

### Historial y métricas
- Historial de los últimos 30 días con mood y % de completado
- Métricas emocionales:
  - Promedio de completado
  - Días perfectos (100%)
  - Racha actual de días activos 🔥
  - Estado de ánimo más frecuente
  - Distribución emocional en gráfica de barras
  - Mapa visual de los últimos 30 días

### UI / UX
- Diseño terminal con tipografía JetBrains Mono
- Partículas animadas de fondo
- Indicador de "guardando..." en tiempo real
- Totalmente responsivo — versión móvil con timer centrado

---

## Estructura del proyecto

```
Morning_Routine_Kiro/
├── index.html          ← Esqueleto HTML puro, sin lógica
├── README.md
│
├── css/
│   ├── base.css        ← Variables CSS, reset, tipografía, botones globales
│   ├── layout.css      ← Auth screen, app shell, header, countdown, progress bar, responsive
│   ├── widgets.css     ← Clima, Google Calendar, canvas partículas
│   ├── pending.css     ← Pendientes a mediano plazo
│   ├── tasks.css       ← Tarjetas de tareas diarias
│   ├── mood.css        ← Check-in de estado de ánimo
│   └── history.css     ← Panel de historial y métricas emocionales
│
└── js/
    ├── main.js         ← Cliente Supabase, auth Google OAuth, showApp/showAuth
    ├── countdown.js    ← Timer con tres estados del día
    ├── widgets.js      ← Clima Open-Meteo + Google Calendar API
    ├── tasks.js        ← CRUD tareas diarias, render, reset automático diario
    ├── pending.js      ← CRUD pendientes, urgencia, historial, archivado diario
    ├── mood.js         ← Mood check-in + logDay()
    ├── history.js      ← Historial 30 días + métricas emocionales
    └── particles.js    ← Animación de partículas de fondo (canvas)
```

---

## Mapa de funcionalidades → archivos

| Funcionalidad | CSS | JS |
|---|---|---|
| Login con Google | `layout.css` | `main.js` |
| Timer tres estados | `layout.css` | `countdown.js` |
| Widget clima CDMX | `widgets.css` | `widgets.js` |
| Agenda Google Calendar | `widgets.css` | `widgets.js` |
| Tareas diarias (CRUD) | `tasks.css` | `tasks.js` |
| Reset automático diario | — | `tasks.js` |
| Barra de progreso | `layout.css` | `tasks.js` |
| Pendientes a mediano plazo | `pending.css` | `pending.js` |
| Historial de pendientes | `pending.css` | `pending.js` |
| Mood check-in | `mood.css` | `mood.js` |
| Historial 30 días | `history.css` | `history.js` |
| Métricas emocionales | `history.css` | `history.js` |
| Partículas animadas | `widgets.css` | `particles.js` |

---

## Base de datos Supabase

### Tabla `tasks`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| name | text | Nombre de la tarea |
| duration | int | Duración en minutos |
| done | bool | Completada hoy |
| position | int | Orden de aparición |

### Tabla `daily_log`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| date | date | Fecha del registro |
| mood | text | Emoji de estado de ánimo |
| tasks_total | int | Total de tareas ese día |
| tasks_done | int | Tareas completadas ese día |

### Tabla `pending_items`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK auth.users |
| title | text | Descripción del pendiente |
| due_date | date | Fecha límite |
| done | bool | Completado |
| completed_at | timestamptz | Fecha y hora de completado |
| archived | bool | Archivado al historial |
| created_at | timestamptz | Fecha de creación |

---

## Lógica de urgencia en pendientes

| Color | Clase CSS | Días restantes |
|---|---|---|
| 🟢 Verde | `urgency-low` | Más de 7 días |
| 🟡 Amarillo | `urgency-mid` | 4 a 7 días |
| 🔴 Rojo | `urgency-high` | 3 días o menos / vencido |

---

## Deploy

- **Hosting:** Vercel (auto-deploy desde `main`)
- **Auth redirect:** configurado en Supabase → Authentication → URL Configuration
- **Variables de entorno:** ninguna — las claves públicas están en `main.js`