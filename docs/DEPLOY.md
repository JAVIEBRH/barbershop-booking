# Deploy en VPS

1. Clonar el repo en el VPS e instalar Node.js 20+.
2. `npm ci` (correr **en la VPS**, no copiar `node_modules` desde otra
   máquina — `better-sqlite3` compila un binario nativo específico del SO).
3. Copiar `.env.example` a `.env` y completar:
   - `DATABASE_URL`: usar una **ruta absoluta**, ej.
     `DATABASE_URL="file:/home/tu-usuario/barbershop-booking/prod.db"`. El
     `server.js` que genera `output: 'standalone'` de Next.js hace
     `process.chdir(__dirname)` al arrancar — se muda solo a
     `.next/standalone/` sin importar el `cwd` que le configures en PM2.
     Una ruta relativa (`file:./dev.db`) termina abriendo/creando una base
     de datos vacía y distinta ahí adentro en vez de la que recibió las
     migraciones en el build. `env.ts` valida esto en el arranque
     (`assertAbsoluteFileUrlInProduction`) y **falla ruidosamente** si
     detecta una ruta relativa con `NODE_ENV=production`, así que si la
     VPS no levanta, revisá esto primero. Es un solo archivo — el backup
     completo de la app es copiar ese archivo.
   - `ADMIN_PASSWORD_HASH`: generar con
     ```bash
     node -e "console.log(require('bcryptjs').hashSync('tu-clave-real', 10))"
     ```
     **Importante:** el hash de bcrypt empieza con `$2b$10$...`. Next.js
     expande variables `$VAR` en archivos `.env` y corrompe el hash en
     silencio si no se escapa. Antes de pegarlo en `.env`, reemplaza cada
     `$` por `\$` (por ejemplo `$2b$10$abc...` → `\$2b\$10\$abc...`).
     Verifica que sobrevive correctamente:
     ```bash
     node -e "const {loadEnvConfig}=require('@next/env'); loadEnvConfig(process.cwd()); console.log(require('bcryptjs').compareSync('tu-clave-real', process.env.ADMIN_PASSWORD_HASH))"
     ```
     Debe imprimir `true`. Si imprime `false`, el hash quedó mal escapado.
   - `SESSION_SECRET`: generar con
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
     (un hex string no tiene `$`, no necesita escape).
   - `RESEND_API_KEY`: tu API key real de Resend (verificá que sea válida —
     una key inválida/revocada no rompe el build ni la reserva, pero
     silencia los dos emails; se ve en los logs como `[Resend API Error]
     API key is invalid`).
   - `BUSINESS_TIMEZONE="America/Santiago"` (o la que corresponda).
   - `BARBER_EMAIL`: correo real del barbero — ahí llega la notificación
     de cada reserva nueva.
   - `APP_BASE_URL`: origen absoluto sin `/` final (ej.
     `https://barberstudio.example.com`) — se usa para armar el link de
     autocancelación que va en el correo de confirmación.
4. `npm run build` — corre `prisma generate`, aplica las migraciones
   (`prisma migrate deploy`), genera el build standalone de Next.js y por
   último copia `.next/static/` y `public/` dentro de
   `.next/standalone/` automáticamente (hook `postbuild` →
   `scripts/copy-standalone-assets.mjs`). Sin ese paso, el modo
   `output: 'standalone'` no incluye esos assets y todo el CSS/JS/imágenes
   da 404 en producción — ya no hace falta copiarlos a mano.
5. `npm install -g pm2` (una sola vez en el VPS).
6. `pm2 start ecosystem.config.cjs`
7. `pm2 save && pm2 startup` (para que sobreviva a reinicios del VPS).
8. Backup de datos: el archivo SQLite completo (`DATABASE_URL`) es el
   backup completo de la app — copiarlo periódicamente (ej. cron diario).
9. Sin dominio propio todavía: accesible por `IP:3000` o un subdominio
   temporal gratuito (ej. DuckDNS) + Nginx/Let's Encrypt delante para
   HTTPS real — necesario antes de recibir datos reales de clientes
   (nombre/teléfono/email viajan sin cifrar por HTTP puro).
10. Cuando se compre el dominio: apuntarlo al VPS, actualizar el reverse
    proxy y renovar el certificado TLS para el dominio definitivo.

## Actualizar a una nueva versión

```bash
git pull
npm ci
npm run build
pm2 restart barbershop-booking
```
