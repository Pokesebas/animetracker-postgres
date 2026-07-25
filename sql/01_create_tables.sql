-- ============================================
-- AnimeTracker - Tablas (PostgreSQL / Neon / Vercel Postgres)
-- ============================================

DROP TABLE IF EXISTS animes;
DROP TABLE IF EXISTS listas;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(256) NOT NULL,   -- hasheada con bcrypt, nunca en texto plano
    fecha_registro  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE listas (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    UNIQUE (usuario_id, nombre)
);

CREATE TABLE animes (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    lista_id        INTEGER REFERENCES listas(id) ON DELETE SET NULL,
    titulo          VARCHAR(200) NOT NULL,
    imagen_url      VARCHAR(500),
    estado          VARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    episodios       INTEGER NOT NULL DEFAULT 0,
    categoria       VARCHAR(50),
    temporada       INTEGER NOT NULL DEFAULT 1 CHECK (temporada BETWEEN 1 AND 10),
    notas           TEXT,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW()
);
