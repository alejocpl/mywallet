# Recursos de empaquetado de MyWallet (`build/`)

Esta carpeta contiene los recursos que utiliza `electron-builder` para generar los instaladores de Windows (`.exe`) y macOS (`.dmg`).

## Cómo personalizar el ícono del escritorio e instalador

`electron-builder` detecta automáticamente los siguientes archivos dentro de `build/`:

- `icon.png` (recomendado `1024x1024` píxeles en PNG) — utilizado por la ventana y para generar formatos derivados.
- `icon.ico` (múltiples resoluciones: 16, 32, 48, 64, 128, 256 px) — ícono del instalador `.exe` y del acceso directo en el Escritorio de **Windows**.
- `icon.icns` — ícono de la aplicación `.app` y del `.dmg` en **macOS**.

Puedes convertir `build/icon.svg` (o tu propio logo) a `.ico` y `.icns` usando herramientas gratuitas como:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [CloudConvert (SVG a ICO / ICNS)](https://cloudconvert.com/)

Si aún no colocas `icon.ico` o `icon.icns`, el instalador se genera sin errores usando el ícono por defecto.
