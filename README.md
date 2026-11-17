# MyWallet — Administración de Finanzas Personales

Aplicación de escritorio (Windows y macOS con Electron) y web para personas naturales diseñada para administrar ingresos, gastos clasificados con subcategorías e inversiones, pagos esenciales verificables, presupuestos mensuales en pesos colombianos (COP) con alertas automáticas, deudas, metas de ahorro y reportes descargables en **PDF** y **Excel**.

---

## Arquitectura y Módulos

El proyecto está organizado como un **monorepo** con workspaces de npm (`server` + `client`) más la capa de escritorio (`electron/`), completamente modular y tipado con TypeScript:

```text
mywallet/
├── package.json                 # Scripts unificados (dev, build, electron:dev, dist:win, dist:mac)
├── electron-builder.yml         # Empaquetado NSIS (Windows .exe) y DMG/ZIP (macOS) + auto-updates
├── build/                       # Íconos del instalador y acceso directo de escritorio
├── electron/                    # Capa de escritorio multiplataforma (Electron)
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts              # Ciclo de vida Express + SQLite en userData + BrowserWindow seguro
│       ├── preload.ts           # Puente aislado (contextBridge) con `window.mywalletDesktop`
│       └── updater.ts           # Actualizaciones automáticas con `electron-updater`
├── server/                      # Backend: Node.js + Express + SQLite (better-sqlite3)
│   ├── assets/                  # 👉 Coloca aquí `logo.png` para personalizar el PDF
│   └── src/
│       ├── config/              # Variables de entorno dinámicas, reglas 50/30/20, identidad de marca
│       ├── db/                  # Conexión SQLite (con WAL y cierre limpio), esquema y seed
│       ├── middlewares/         # Manejador global de errores y 404
│       ├── modules/             # Módulos independientes (routes -> controller -> service -> repository)
│       │   ├── categories/      # Categorías e ítems/subcategorías con frecuencia mensual
│       │   ├── essentials/      # Checklist mensual de pagos esenciales con bloqueo tras pago
│       │   ├── onboarding/      # Cuestionario inicial único y bloqueo tras completarse
│       │   ├── transactions/    # Registro de ingresos/gastos y detección de alertas
│       │   ├── budgets/         # Presupuestos mensuales y copia del mes anterior
│       │   ├── goals/           # Metas de ahorro y aportes/retiros
│       │   ├── debts/           # Control de deudas, método avalancha y abonos
│       │   ├── summary/         # "¿Cuánto me queda?", regla 50/30/20, tendencias y comparativa
│       │   └── reports/         # Generadores PDF (PDFKit) y Excel (ExcelJS)
│       ├── routes/              # Enrutador principal `/api`
│       ├── types/               # Contratos de dominio
│       └── utils/               # Fechas, moneda COP, validaciones Zod y errores HTTP
└── client/                      # Frontend: React + TypeScript + Tailwind CSS + Recharts
    ├── public/brand/            # 👉 Gráficos SVG reemplazables (logo, hero, estado vacío)
    └── src/
        ├── config/              # Marca (`brand.ts`), navegación (`navigation.ts`), íconos (`icons.ts`)
        ├── context/             # Estado global (`WalletContext.tsx`) y notificaciones
        ├── services/            # Cliente HTTP adaptable a Electron (`getApiBase()` en `api.ts`)
        ├── components/
        │   ├── charts/          # Gráficos con Recharts (tendencia 6M, categorías, comparativa)
        │   ├── layout/          # Barra superior con controles de actualización/datos y menú flotante inferior
        │   └── ui/              # Tarjetas, modales, inputs con formato automático de miles (`1,000`), toasts
        └── features/
            ├── onboarding/      # Asistente interactivo inicial (ingresos, gastos, deudas, metas)
            ├── dashboard/       # "¿Cuánto me queda?" + distribución 50/30/20 + checklist esenciales
            ├── transactions/    # Ingresos, gastos, subcategorías, inversiones y filtros
            ├── budgets/         # Presupuestos mensuales y alertas visuales
            ├── goals/           # Metas de ahorro y control de deudas
            └── reports/         # Descarga PDF/Excel y comparativa contra el mes anterior
```

---

## Instalación y Ejecución

1. **Instalar dependencias** desde la raíz del proyecto:
   ```bash
   npm install
   ```

2. **(Opcional) Configurar variables de entorno** en `server/.env`:
   Puedes copiar `server/.env.example` como `server/.env` para ajustar puerto, moneda (`APP_CURRENCY=COP`) o formato regional (`APP_LOCALE=es-CO`).

3. **Iniciar en modo desarrollo** (levanta API en `:4000` y Frontend en `:5173`):
   ```bash
   npm run dev
   ```
   > Al arrancar por primera vez, la base de datos inicia **sin movimientos ni presupuestos** y muestra únicamente el **Asistente Financiero Inicial** con preguntas guiadas (sueldo, freelance, gastos con **subcategorías y frecuencia mensual**, deudas y metas). Una vez completado, esa encuesta inicial se bloquea y desaparece de la interfaz para evitar duplicidades o alteraciones accidentales en los datos ya registrados.

4. **Verificar tipos o compilar para producción**:
   ```bash
   npm run typecheck
   npm run build
   npm start
   ```

---

## Aplicación de Escritorio (Electron — Windows y macOS)

MyWallet está preparado para distribuirse como instalador de doble clic para **Windows (`.exe` NSIS)** y **macOS (`.dmg` + `.zip` Apple Silicon e Intel)** cumpliendo los 6 pilares de arquitectura segura:

| Elemento | Implementación en MyWallet |
| :--- | :--- |
| **SQLite persistente** | En modo escritorio empaquetado, `DB_PATH` se configura dentro de `app.getPath('userData')`:<br>• **Windows**: `%APPDATA%\MyWallet\data\mywallet.db`<br>• **macOS**: `~/Library/Application Support/MyWallet/data/mywallet.db`<br>Nunca se guarda en la carpeta de instalación ni se borra al actualizar/reinstalar (`deleteAppDataOnUninstall: false`). |
| **Express automático** | Electron inicia Express en `127.0.0.1` (`port: 0` en producción o `4000` con respaldo dinámico si está ocupado) y lo detiene limpiamente en `before-quit` ejecutando `wal_checkpoint(TRUNCATE)` sobre SQLite. |
| **React compilado** | `client/vite.config.ts` usa `base: './'` y compila hacia `client/dist`, servido automáticamente por Express local sin exponer código fuente. |
| **Rutas API** | `electron/src/preload.ts` expone `window.mywalletDesktop.apiBaseUrl` hacia `client/src/services/api.ts` (`getApiBase()`), ajustando automáticamente llamadas REST y descargas PDF/Excel. |
| **Seguridad estricta** | `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`, puente mínimo por `contextBridge`, bloqueo de `<webview>`, popups y navegaciones externas. |
| **Actualizaciones** | `electron-updater` (`electron/src/updater.ts`) descarga nuevas versiones en segundo plano y permite instalarlas desde la barra superior (`Header`). |

### Comandos de Escritorio y Generación de Instaladores

1. **Probar Electron en modo desarrollo** (con recarga en vivo de API y React):
   ```bash
   npm run electron:dev
   ```

2. **Probar Electron compilado en producción local**:
   ```bash
   npm run rebuild:native
   npm run electron:start
   ```

3. **Generar el instalador para distribución** (los archivos quedan en la carpeta `release/`):
   - **Windows** (`MyWallet-Setup-1.0.0.exe`, instalación en 1 clic, crea acceso directo en Escritorio y abre la app al terminar):
     ```bash
     npm run dist:win
     ```
   - **macOS** (`MyWallet-1.0.0-arm64.dmg` / `x64.dmg` y `.zip` para auto-actualizaciones):
     ```bash
     npm run dist:mac
     ```
   > Nota: Para generar instaladores de macOS (`.dmg`), ejecuta `npm run dist:mac` desde un equipo Mac (o CI con macOS). Para activar las actualizaciones automáticas con `npm run dist:publish`, reemplaza `owner` y `repo` en `electron-builder.yml` y configura tu token `GH_TOKEN`.

---

## Cómo reemplazar los elementos gráficos

Toda la identidad visual está centralizada para que puedas cambiarla sin tocar la lógica de la app:

1. **Logotipo e ilustraciones web**: reemplaza los archivos SVG en `client/public/brand/`:
   - `client/public/brand/logo.svg` — Logotipo en la barra superior y favicon.
   - `client/public/brand/hero-illustration.svg` — Ilustración del panel *"¿Cuánto me queda?"*.
   - `client/public/brand/empty-state.svg` — Ilustración cuando no hay registros.
   - Configura nombre, lema, moneda o rutas en `client/src/config/brand.ts`.

2. **Logotipo en reportes PDF**:
   - Coloca una imagen PNG o JPG en `server/assets/logo.png` (PDFKit incrusta PNG/JPG automáticamente en la cabecera del reporte).
   - Ajusta nombre, lema o color corporativo en `server/src/config/brand.ts`.

---

## Endpoints principales de la API (`/api`)

| Módulo | Endpoints |
| :--- | :--- |
| Salud y Demo | `GET /api/health`, `POST /api/seed` |
| Onboarding | `GET /api/onboarding/status`, `POST /api/onboarding` (bloqueado tras completarse) |
| Categorías | `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id`, `POST /api/categories/:id/subcategories`, `PUT/DELETE /api/categories/subcategories/:subId` |
| Esenciales | `GET /api/essentials?month=YYYY-MM`, `POST /api/essentials/payments/:id/check` |
| Movimientos | `GET/POST /api/transactions`, `GET/PUT/DELETE /api/transactions/:id` |
| Presupuestos | `GET/POST /api/budgets`, `POST /api/budgets/copy`, `PUT/DELETE /api/budgets/:id` |
| Metas | `GET/POST /api/goals`, `PUT/DELETE /api/goals/:id`, `GET/POST /api/goals/:id/contributions` |
| Deudas | `GET/POST /api/debts`, `PUT/DELETE /api/debts/:id`, `POST /api/debts/:id/payments` |
| Analítica | `GET /api/summary`, `GET /api/summary/trend`, `GET /api/summary/comparison` |
| Reportes | `GET /api/reports/pdf?month=YYYY-MM`, `GET /api/reports/excel?month=YYYY-MM` |

---

## Guía rápida para escalar el proyecto

- **Multiusuario / Autenticación**: agregar tabla `users` y columna `user_id` en `server/src/db/schema.ts`, proteger `/api` con un middleware JWT y filtrar los repositorios por `userId`.
- **Migración a PostgreSQL**: solo necesitas reemplazar las consultas dentro de los archivos `*.repository.ts` manteniendo intactos los controladores, servicios y frontend.
- **Nuevos módulos**: crea una carpeta bajo `server/src/modules/<modulo>/`, regístrala en `server/src/routes/index.ts`, añade su vista en `client/src/features/` y agrégala a `client/src/config/navigation.ts` para que aparezca automáticamente en el menú flotante inferior.
