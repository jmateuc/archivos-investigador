# Archivos del Investigador

PWA narrativa para GitHub Pages. Funciona sin servidor propio y puede jugarse offline después de la primera carga.

## v0.2 incluida
- Creación rápida de investigador
- 5 profesiones, 8 talentos y motivación
- Tiradas basadas en las habilidades reales del personaje
- Expediente 01: **La señal de Kingsport**
- Decisiones con condiciones
- Inventario y pistas
- Cordura y salud
- Tiradas porcentuales
- Reloj de partida
- Varios finales
- Guardado automático con `localStorage`
- Service Worker para uso offline

## Publicar en GitHub Pages
1. Crea un repositorio.
2. Sube todo el contenido de esta carpeta a la raíz.
3. En GitHub: Settings → Pages.
4. En Source selecciona **Deploy from a branch**.
5. Rama `main`, carpeta `/ (root)`.
6. Abre la URL que te da GitHub Pages.

## Estructura
- `index.html`: interfaz.
- `style.css`: aspecto de expediente de los años 20.
- `app.js`: motor narrativo.
- `adventures/la-senal/story.json`: contenido de la aventura.
- `sw.js`: funcionamiento offline.
- `manifest.webmanifest`: instalación como PWA.

## Próximo paso natural
Separar el motor en módulos y añadir una segunda aventura para comprobar que el sistema es realmente reutilizable.
