const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('../cloudinary');

// 1. REGISTRO
const register = async (req, res) => {
    let { rut, nombre, apellido, correo, contrasena, id_comuna, calle, numero, depto_casa, telefono } = req.body;
    correo = correo ? correo.toLowerCase().trim() : '';
    console.log(`📝 [REGISTER] Intento: ${correo}`);

    try {
        const checkUser = await db.query('SELECT id_usuario FROM usuario WHERE correo = $1', [correo]);
        if (checkUser.rows.length > 0) return res.status(409).json({ error: 'Correo ya registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(contrasena, salt);

        // Por defecto rol 1 (Usuario)
        const result = await db.query(
            `INSERT INTO usuario (rut, nombre, apellido, correo, contrasena, id_comuna, calle, numero, telefono, depto_casa, id_rol) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1) RETURNING id_usuario, nombre`,
            [rut, nombre, apellido, correo, hashPassword, id_comuna, calle, numero, telefono, depto_casa]
        );
        res.status(201).json({ message: 'Usuario registrado', user: result.rows[0] });
    } catch (err) {
        console.error(`❌ [ERROR]`, err.message);
        if (err.code === '23505') return res.status(409).json({ error: 'El RUT o Correo ya existen.' });
        if (err.code === '23503') return res.status(400).json({ error: 'Comuna inválida.' });
        res.status(500).json({ error: 'Error interno.' });
    }
};

// 2. LOGIN
const login = async (req, res) => {
    let { correo, contrasena } = req.body;
    correo = correo ? correo.toLowerCase().trim() : '';

    try {
        const result = await db.query('SELECT * FROM usuario WHERE correo = $1', [correo]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario no existe.' });

        const user = result.rows[0];

        // Verificar si está baneado
        if (user.estado_cuenta === 'SUSPENDIDO') {
            return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta a soporte.' });
        }

        const validPassword = await bcrypt.compare(contrasena, user.contrasena);
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta.' });

        // INCLUIMOS EL ROL EN EL TOKEN
        const token = jwt.sign(
            { id: user.id_usuario, nombre: user.nombre, rol: user.id_rol }, 
            process.env.JWT_SECRET || 'secret', 
            { expiresIn: '24h' }
        );
        
        res.json({ message: 'Login exitoso', token, usuario: user.nombre, rol: user.id_rol });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno.' });
    }
};

// 3. GET ME (Perfil)
const getMe = async (req, res) => {
    try {
        // Agregamos id_rol al select
        const result = await db.query(
            `SELECT id_usuario, rut, nombre, apellido, correo, telefono, 
                    id_comuna, calle, numero, depto_casa, url_foto_perfil, id_rol 
             FROM usuario WHERE id_usuario = $1`, [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

        const user = result.rows[0];
        let id_region = null;
        
        if(user.id_comuna) {
            const regionRes = await db.query('SELECT id_region FROM comuna WHERE id_comuna = $1', [user.id_comuna]);
            if(regionRes.rows.length > 0) id_region = regionRes.rows[0].id_region;
        }
        res.json({ ...user, id_region });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
};

// 4. UPDATE PROFILE
const updateProfile = async (req, res) => {
    const { nombre, apellido, telefono, id_comuna, calle, numero, depto_casa, password } = req.body;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `UPDATE usuario SET nombre = $1, apellido = $2, telefono = $3, id_comuna = $4, calle = $5, numero = $6, depto_casa = $7 WHERE id_usuario = $8`,
            [nombre, apellido, telefono, id_comuna, calle, numero, depto_casa, req.user.id]
        );
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            await client.query('UPDATE usuario SET contrasena = $1 WHERE id_usuario = $2', [hash, req.user.id]);
        }
        await client.query('COMMIT');
        res.json({ message: 'Perfil actualizado' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    } finally {
        client.release();
    }
};

// 5. UPDATE AVATAR
const updateAvatar = async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
    try {
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        
        const uploadRes = await cloudinary.uploader.upload(dataURI, {
            folder: 'parkgo_avatars',
            transformation: [{ width: 500, height: 500, crop: "fill" }]
        });
        
        await db.query('UPDATE usuario SET url_foto_perfil = $1 WHERE id_usuario = $2', [uploadRes.secure_url, req.user.id]);
        res.json({ message: 'Foto actualizada', url: uploadRes.secure_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al subir imagen a Cloudinary' });
    }
};

module.exports = { register, login, getMe, updateProfile, updateAvatar };