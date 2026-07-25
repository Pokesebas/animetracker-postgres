-- ============================================
-- AnimeTracker - Funciones (equivalente a procedimientos almacenados)
-- PostgreSQL usa "funciones" para esto; se llaman con SELECT en vez de EXECUTE
-- ============================================

-- ==================== USUARIOS ====================

CREATE OR REPLACE FUNCTION sp_registrar_usuario(
    p_nombre VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR
)
RETURNS TABLE(id INT, nombre VARCHAR, email VARCHAR) AS $$
DECLARE
    v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM usuarios u WHERE u.email = p_email) THEN
        RAISE EXCEPTION 'El correo ya está registrado';
    END IF;

    INSERT INTO usuarios (nombre, email, password_hash)
    VALUES (p_nombre, p_email, p_password_hash)
    RETURNING usuarios.id INTO v_id;

    INSERT INTO listas (usuario_id, nombre) VALUES (v_id, 'General');

    RETURN QUERY SELECT u.id, u.nombre, u.email FROM usuarios u WHERE u.id = v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_obtener_usuario_por_email(p_email VARCHAR)
RETURNS TABLE(id INT, nombre VARCHAR, email VARCHAR, password_hash VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.nombre, u.email, u.password_hash
    FROM usuarios u WHERE u.email = p_email;
END;
$$ LANGUAGE plpgsql;

-- ==================== LISTAS ====================

CREATE OR REPLACE FUNCTION sp_obtener_listas(p_usuario_id INT)
RETURNS TABLE(id INT, nombre VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.nombre FROM listas l
    WHERE l.usuario_id = p_usuario_id ORDER BY l.id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_crear_lista(p_usuario_id INT, p_nombre VARCHAR)
RETURNS TABLE(id INT) AS $$
DECLARE
    v_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM listas l WHERE l.usuario_id = p_usuario_id AND l.nombre = p_nombre) THEN
        RAISE EXCEPTION 'Ya existe una lista con ese nombre';
    END IF;

    INSERT INTO listas (usuario_id, nombre) VALUES (p_usuario_id, p_nombre)
    RETURNING listas.id INTO v_id;

    RETURN QUERY SELECT v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_eliminar_lista(p_usuario_id INT, p_lista_id INT)
RETURNS VOID AS $$
DECLARE
    v_general_id INT;
BEGIN
    SELECT l.id INTO v_general_id FROM listas l
    WHERE l.usuario_id = p_usuario_id AND l.nombre = 'General';

    UPDATE animes SET lista_id = v_general_id
    WHERE usuario_id = p_usuario_id AND lista_id = p_lista_id;

    DELETE FROM listas
    WHERE id = p_lista_id AND usuario_id = p_usuario_id AND nombre <> 'General';
END;
$$ LANGUAGE plpgsql;

-- ==================== ANIMES ====================

CREATE OR REPLACE FUNCTION sp_obtener_animes(p_usuario_id INT)
RETURNS TABLE(
    id INT, titulo VARCHAR, imagen_url VARCHAR, estado VARCHAR,
    episodios INT, categoria VARCHAR, temporada INT, notas TEXT,
    lista_id INT, lista_nombre VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, a.titulo, a.imagen_url, a.estado, a.episodios,
           a.categoria, a.temporada, a.notas, a.lista_id, l.nombre
    FROM animes a
    LEFT JOIN listas l ON a.lista_id = l.id
    WHERE a.usuario_id = p_usuario_id
    ORDER BY a.id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_insertar_anime(
    p_usuario_id INT, p_lista_id INT, p_titulo VARCHAR, p_imagen_url VARCHAR,
    p_estado VARCHAR, p_episodios INT, p_categoria VARCHAR, p_temporada INT, p_notas TEXT
)
RETURNS TABLE(id INT) AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO animes (usuario_id, lista_id, titulo, imagen_url, estado, episodios, categoria, temporada, notas)
    VALUES (p_usuario_id, p_lista_id, p_titulo, p_imagen_url, p_estado, p_episodios, p_categoria, p_temporada, p_notas)
    RETURNING animes.id INTO v_id;

    RETURN QUERY SELECT v_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_actualizar_anime(
    p_id INT, p_usuario_id INT, p_lista_id INT, p_titulo VARCHAR, p_imagen_url VARCHAR,
    p_estado VARCHAR, p_episodios INT, p_categoria VARCHAR, p_temporada INT, p_notas TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE animes
    SET lista_id = p_lista_id, titulo = p_titulo, imagen_url = p_imagen_url,
        estado = p_estado, episodios = p_episodios, categoria = p_categoria,
        temporada = p_temporada, notas = p_notas
    WHERE id = p_id AND usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_eliminar_anime(p_id INT, p_usuario_id INT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM animes WHERE id = p_id AND usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sp_eliminar_todos_animes(p_usuario_id INT)
RETURNS VOID AS $$
BEGIN
    DELETE FROM animes WHERE usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;
