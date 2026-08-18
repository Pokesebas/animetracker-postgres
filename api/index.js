// api/index.js - API de AnimeTracker (Express + PostgreSQL, para Vercel)
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // bcryptjs en vez de bcrypt: no necesita compilar nada nativo, ideal para serverless
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getPool } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const SALT_ROUNDS = 10;

// ==================== CORREO (recuperación de contraseña) ====================
// Usa tu cuenta de Gmail + una "Contraseña de aplicación" (no tu contraseña normal)
let transporter;
function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,       // tu correo de Gmail
                pass: process.env.GMAIL_APP_PASSWORD // la contraseña de aplicación de 16 caracteres
            }
        });
    }
    return transporter;
}

// ==================== AUTH ====================

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        const pool = getPool();
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await pool.query(
            'SELECT * FROM sp_registrar_usuario($1, $2, $3)',
            [name, email, passwordHash]
        );

        res.json({ user: result.rows[0] });
    } catch (err) {
        if (err.message.includes('ya está registrado')) {
            return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    try {
        const pool = getPool();
        const result = await pool.query(
            'SELECT * FROM sp_obtener_usuario_por_email($1)',
            [email]
        );

        const usuario = result.rows[0];
        if (!usuario) {
            return res.status(404).json({ error: 'No existe una cuenta con ese correo' });
        }

        const passwordOk = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordOk) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        res.json({ user: { Id: usuario.id, Nombre: usuario.nombre, Email: usuario.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// ==================== RECUPERACIÓN DE CONTRASEÑA (nuevo) ====================

// Paso 1: el usuario pide recuperar su contraseña con su correo
app.post('/api/solicitar-recuperacion', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    try {
        const pool = getPool();

        // Genera un token aleatorio y seguro, válido por 30 minutos
        const token = crypto.randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

        const result = await pool.query(
            'SELECT * FROM sp_guardar_token_recuperacion($1, $2, $3)',
            [email, token, expira]
        );

        // Por seguridad, respondemos "éxito" igual exista o no el correo
        // (así nadie puede usar este endpoint para adivinar qué correos están registrados)
        if (result.rows.length === 0) {
            return res.json({ success: true });
        }

        const nombre = result.rows[0].nombre;
        const resetUrl = `${req.headers.origin || 'https://' + req.headers.host}/reset.html?token=${token}`;

        await getTransporter().sendMail({
            from: `"AnimeTracker" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Recupera tu contraseña - AnimeTracker',
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color:#7a1fa2;">AnimeTracker</h2>
                    <p>Hola ${nombre},</p>
                    <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva:</p>
                    <p style="text-align:center; margin: 25px 0;">
                        <a href="${resetUrl}" style="background:#ff66cc; color:white; padding:14px 24px; border-radius:10px; text-decoration:none; font-weight:bold;">
                            Restablecer contraseña
                        </a>
                    </p>
                    <p>Este enlace expira en 30 minutos. Si tú no solicitaste esto, puedes ignorar este correo.</p>
                </div>
            `
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'No se pudo procesar la solicitud' });
    }
});

// Paso 2: el usuario entra al link, escribe su contraseña nueva
app.post('/api/restablecer-contrasena', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    try {
        const pool = getPool();

        // Verifica que el token sea válido y no haya expirado
        const check = await pool.query(
            'SELECT * FROM sp_obtener_usuario_por_token($1)',
            [token]
        );

        if (check.rows.length === 0) {
            return res.status(400).json({ error: 'El enlace no es válido o ya expiró. Solicita uno nuevo.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        await pool.query(
            'SELECT sp_restablecer_contrasena($1, $2)',
            [token, passwordHash]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
    }
});

// ==================== LISTAS ====================

app.get('/api/listas/:usuarioId', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(
            'SELECT * FROM sp_obtener_listas($1)',
            [req.params.usuarioId]
        );
        res.json(result.rows.map(r => ({ Id: r.id, Nombre: r.nombre })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener listas' });
    }
});

app.post('/api/listas', async (req, res) => {
    const { usuarioId, nombre } = req.body;
    try {
        const pool = getPool();
        const result = await pool.query(
            'SELECT * FROM sp_crear_lista($1, $2)',
            [usuarioId, nombre]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        if (err.message.includes('Ya existe')) {
            return res.status(409).json({ error: 'Ya existe una lista con ese nombre' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al crear lista' });
    }
});

app.delete('/api/listas/:id', async (req, res) => {
    const { usuarioId } = req.body;
    try {
        const pool = getPool();
        await pool.query(
            'SELECT sp_eliminar_lista($1, $2)',
            [usuarioId, req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar lista' });
    }
});

// ==================== ANIMES ====================

app.get('/api/animes/:usuarioId', async (req, res) => {
    try {
        const pool = getPool();
        const result = await pool.query(
            'SELECT * FROM sp_obtener_animes($1)',
            [req.params.usuarioId]
        );
        res.json(result.rows.map(r => ({
            Id: r.id,
            Titulo: r.titulo,
            ImagenUrl: r.imagen_url,
            Estado: r.estado,
            Episodios: r.episodios,
            Categoria: r.categoria,
            Temporada: r.temporada,
            Notas: r.notas,
            ListaId: r.lista_id,
            ListaNombre: r.lista_nombre
        })));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener animes' });
    }
});

app.post('/api/animes', async (req, res) => {
    const { usuarioId, listaId, titulo, imagenUrl, estado, episodios, categoria, temporada, notas } = req.body;
    try {
        const pool = getPool();
        const result = await pool.query(
            'SELECT * FROM sp_insertar_anime($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [usuarioId, listaId, titulo, imagenUrl, estado, episodios, categoria, temporada, notas]
        );
        res.json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar anime' });
    }
});

app.put('/api/animes/:id', async (req, res) => {
    const { usuarioId, listaId, titulo, imagenUrl, estado, episodios, categoria, temporada, notas } = req.body;
    try {
        const pool = getPool();
        await pool.query(
            'SELECT sp_actualizar_anime($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
            [req.params.id, usuarioId, listaId, titulo, imagenUrl, estado, episodios, categoria, temporada, notas]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar anime' });
    }
});

app.delete('/api/animes/todos/:usuarioId', async (req, res) => {
    try {
        const pool = getPool();
        await pool.query(
            'SELECT sp_eliminar_todos_animes($1)',
            [req.params.usuarioId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al borrar animes' });
    }
});

// OJO: esta ruta va DESPUÉS de /todos/:usuarioId para que Express no la confunda
app.delete('/api/animes/:id', async (req, res) => {
    const { usuarioId } = req.body;
    try {
        const pool = getPool();
        await pool.query(
            'SELECT sp_eliminar_anime($1, $2)',
            [req.params.id, usuarioId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar anime' });
    }
});

// Vercel llama esta función exportada directamente; no usamos app.listen() aquí
module.exports = app;