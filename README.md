# MyWallet 💰

Aplicación corporativa de escritorio para la administración de finanzas personales, desarrollada con **React, TypeScript, Tailwind CSS, Recharts, Express, SQLite y Electron**. Soporta completamente **Windows** (`.exe`) y **macOS** (`.dmg`).

---

## ✨ Características Principales

- **Gestión Financiera Completa**:
  - Ingresos fijos y variables (Sueldo, Freelance, Rendimientos, etc.).
  - Gastos esenciales con sistema de confirmación de pago (check irreversible): Vivienda, Servicios, Alimentación, Transporte, Salud.
  - Gastos opcionales y suscripciones con subcategorías dinámicas (Spotify, gimnasio, cortes, etc.).
  - Inversiones con subcategorías especializadas (Finca raíz, Bolsa de valores, Cripto, CDT, Fondos indexados).
  - Deudas y metas de ahorro con cálculo de progreso.
- **Asistente de Configuración Inicial (Onboarding)**:
  - Formulario paso a paso al abrir la app por primera vez para registrar sueldo, gastos fijos y metas.
  - Una vez completado, se bloquea y desaparece para proteger la integridad de los datos financieros.
- **Formato Monetario en Pesos Colombianos (COP)**:
  - Formateo dinámico en tiempo real (`10.000`, `1,000,000`).
- **Navegación Flotante Fija**:
  - Menú inferior moderno y accesible.
- **Reportes Exportables**:
  - Descarga de informes en PDF estructurado y hojas de cálculo Excel (`.xlsx`).
- **Base de Datos Persistente**:
  - Motor SQLite embebido almacenado en la carpeta del usuario (`%APPDATA%` en Windows / `Application Support` en Mac) para no perder datos en futuras actualizaciones.
- **Sistema de Actualizaciones Automáticas**:
  - Integrado con GitHub Releases mediante `electron-updater`.

---

## 🚀 Requisitos de Desarrollo

- [Node.js](https://nodejs.org) v18 o v20+
- npm v9+

---

## 🛠️ Instalación y Desarrollo Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/alejocpl/mywallet.git
   cd mywallet
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo (Cliente + Servidor + Electron):**
   ```bash
   npm run dev
   ```

---

## 📦 Compilación de Instaladores

### Para Windows (`.exe`):
```bash
npm run dist:win
```
*Genera el instalador `MyWallet-Setup-1.0.0.exe` en la carpeta `release/`.*

### Para macOS (`.dmg` y `.zip`):
```bash
npm run dist:mac
```
*Genera los archivos `.dmg` (Apple Silicon y x64) en la carpeta `release/`.*

---

## 🤖 Integración Continua (CI/CD)

El repositorio incluye un flujo automatizado en `.github/workflows/build-and-release.yml` que compila automáticamente los instaladores de Windows y Mac cada vez que creas una etiqueta de versión (ejemplo: `v1.0.0`).
