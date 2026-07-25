# AnimeTracker - Despliegue en Vercel (sin tarjeta)

## Estructura del proyecto
```
vercel-project/
├── api/
│   ├── index.js      ← toda la API (equivalente a server.js)
│   └── db.js          ← conexión a PostgreSQL
├── public/
│   ├── index.html
│   ├── indexc.css
│   └── indexj.js
├── sql/
│   ├── 01_create_tables.sql
│   └── 02_functions.sql
├── package.json
└── vercel.json
```
Esta carpeta completa (`vercel-project/`) es la que vas a subir a un repositorio de GitHub.

## Paso 1: Sube este proyecto a un repositorio de GitHub
1. Crea un repositorio nuevo en GitHub (puede ser el mismo que ya tenías, o uno nuevo)
2. Sube TODO el contenido de esta carpeta `vercel-project/` (no la carpeta en sí, sino lo que hay adentro) a la raíz del repo

## Paso 2: Crea tu cuenta en Vercel
1. Ve a https://vercel.com
2. Dale a "Sign Up" y elige **"Continue with GitHub"**
3. No te va a pedir tarjeta para el plan gratuito ("Hobby")

## Paso 3: Crea la base de datos PostgreSQL
1. Dentro del dashboard de Vercel, ve a la pestaña **"Storage"**
2. Dale **"Create Database"**
3. Elige **"Postgres"** (funciona con Neon por debajo)
4. Dale un nombre, por ejemplo `animetracker-db`
5. Selecciona la región más cercana
6. Créala

## Paso 4: Corre los scripts SQL en tu base de datos
1. Dentro de la base de datos que creaste, busca la pestaña **"Query"** (o "SQL Editor")
2. Copia y pega el contenido de `sql/01_create_tables.sql`, ejecútalo
3. Copia y pega el contenido de `sql/02_functions.sql`, ejecútalo

## Paso 5: Importa tu proyecto de GitHub a Vercel
1. En el dashboard de Vercel, dale **"Add New..." → "Project"**
2. Selecciona el repositorio de GitHub donde subiste `vercel-project/`
3. Dale **"Import"** y luego **"Deploy"** (déjalo con la configuración por defecto)

## Paso 6: Conecta la base de datos a tu proyecto
1. Ve a tu proyecto ya desplegado → pestaña **"Storage"**
2. Conecta la base de datos `animetracker-db` que creaste
3. Esto crea automáticamente la variable de entorno `DATABASE_URL` que usa `db.js`

## Paso 7: Vuelve a desplegar
Después de conectar la base de datos, ve a la pestaña **"Deployments"** → los tres puntos del último deploy → **"Redeploy"** (para que tome la variable de entorno nueva).

## Listo
Tu proyecto va a estar disponible en una URL como:
```
https://tu-proyecto.vercel.app
```
Esa misma URL sirve tanto el frontend como el backend — no necesitas GitHub Pages por separado.

## Probar en tu computadora antes de subir (opcional)
```
npm install -g vercel
cd vercel-project
vercel dev
```
Esto simula el entorno de Vercel localmente. Necesitarás poner tu `DATABASE_URL` en un archivo `.env.local` en la raíz del proyecto:
```
DATABASE_URL=postgres://usuario:contraseña@host/basededatos
```
(Vercel te da esta cadena de conexión exacta en la pestaña de tu base de datos, botón ".env.local")
