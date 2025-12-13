const db = require('../db');
const cloudinary = require('../cloudinary');

// CREAR PUBLICACIÓN + ESTACIONAMIENTO
exports.createParking = async (req, res) => {
    const client = await db.pool.connect();
    const userId = req.user.id;

    console.log(`🅿️ [PARKING CREATE] Usuario ${userId} iniciando publicación.`);

    try {
        await client.query('BEGIN');

        // Extraer todos los campos del formulario
        const { 
            titulo, descripcion, precio, // Publicación
            id_comuna, calle, numero,    // Ubicación
            latitud, longitud,           // COORDENADAS
            largo, ancho, altura,        // Dimensiones
            seguridad, cobertura,        // Características
            es_24_horas                  // Horario
        } = req.body;

        // 1. Insertar Estacionamiento Físico con Coordenadas
        const estRes = await client.query(
            `INSERT INTO estacionamiento (
                id_usuario_propietario, id_comuna, calle, n_estacionamiento, 
                largo, ancho, altura_maxima, seguridad, tipo_cobertura,
                latitud, longitud
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING id_estacionamiento`,
            [
                userId, id_comuna, calle, numero, 
                largo, ancho, altura, seguridad, cobertura,
                latitud || null, longitud || null
            ]
        );
        const estId = estRes.rows[0].id_estacionamiento;

        // 2. Insertar la Publicación (Oferta)
        await client.query(
            `INSERT INTO publicacion (id_estacionamiento, titulo, descripcion, precio, es_24_horas, estado)
             VALUES ($1, $2, $3, $4, $5, 'Disponible')`,
            [estId, titulo, descripcion, precio, es_24_horas === 'true']
        );

        // 3. Subir Imagen (Si existe)
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            
            const uploadRes = await cloudinary.uploader.upload(dataURI, {
                folder: 'aparca_conce_estacionamientos',
                transformation: [{ width: 800, height: 600, crop: "limit" }]
            });

            await client.query(
                `INSERT INTO imagen_estacionamiento (id_estacionamiento, ruta_imagen) VALUES ($1, $2)`,
                [estId, uploadRes.secure_url]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Publicación creada exitosamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ [PARKING ERROR]`, err.message);
        res.status(500).json({ error: 'Error al crear la publicación' });
    } finally {
        client.release();
    }
};

// OBTENER TODOS (Para el Home - Público)
exports.getAllParkings = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.id_publicacion, p.titulo, p.precio, p.estado, 
                   e.calle, c.nombre_comuna, i.ruta_imagen,
                   e.largo, e.ancho, e.tipo_cobertura, e.seguridad,
                   e.latitud, e.longitud
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN comuna c ON e.id_comuna = c.id_comuna
            LEFT JOIN imagen_estacionamiento i ON e.id_estacionamiento = i.id_estacionamiento
            WHERE p.estado = 'Disponible'
            ORDER BY p.id_publicacion DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener estacionamientos' });
    }
};

// OBTENER MIS ESTACIONAMIENTOS (Privado)
exports.getMyParkings = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(`
            SELECT p.id_publicacion, p.titulo, p.precio, p.estado, p.descripcion,
                   e.calle, e.n_estacionamiento, c.nombre_comuna, i.ruta_imagen
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN comuna c ON e.id_comuna = c.id_comuna
            LEFT JOIN imagen_estacionamiento i ON e.id_estacionamiento = i.id_estacionamiento
            WHERE e.id_usuario_propietario = $1
            ORDER BY p.id_publicacion DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener tus estacionamientos' });
    }
};

// ELIMINAR
exports.deleteParking = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    try {
        const checkOwner = await db.query(`
            SELECT p.id_publicacion 
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            WHERE p.id_publicacion = $1 AND e.id_usuario_propietario = $2
        `, [id, userId]);

        if (checkOwner.rows.length === 0) return res.status(403).json({ error: 'No autorizado o no existe' });

        await db.query('DELETE FROM publicacion WHERE id_publicacion = $1', [id]);
        res.json({ message: 'Publicación eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar' });
    }
};

// [NUEVO] OBTENER DETALLE DE UN ESTACIONAMIENTO (Público)
// OBTENER DETALLE DE UN ESTACIONAMIENTO (Versión Robusta)
exports.getParkingById = async (req, res) => {
    const { id } = req.params;
    
    // Validación básica de ID
    if (!id || isNaN(id)) {
        return res.status(400).json({ error: 'ID inválido' });
    }

    try {
        // Usamos LEFT JOIN para comuna, region e imagen para que no falle si faltan esos datos
        const result = await db.query(`
            SELECT p.id_publicacion, p.titulo, p.descripcion, p.precio, p.es_24_horas, p.estado,
                   e.calle, e.n_estacionamiento, e.largo, e.ancho, e.altura_maxima, 
                   e.seguridad, e.tipo_cobertura, e.latitud, e.longitud,
                   COALESCE(c.nombre_comuna, 'Comuna no especificada') as nombre_comuna, 
                   COALESCE(r.nombre_region, 'Región no especificada') as nombre_region,
                   u.nombre AS nombre_dueno, u.apellido AS apellido_dueno, u.telefono AS telefono_dueno, u.url_foto_perfil,
                   i.ruta_imagen
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN usuario u ON e.id_usuario_propietario = u.id_usuario
            LEFT JOIN comuna c ON e.id_comuna = c.id_comuna
            LEFT JOIN region r ON c.id_region = r.id_region
            LEFT JOIN imagen_estacionamiento i ON e.id_estacionamiento = i.id_estacionamiento
            WHERE p.id_publicacion = $1
        `, [id]);

        if (result.rows.length === 0) {
            console.log(`⚠️ Publicación ID ${id} no encontrada.`);
            return res.status(404).json({ error: 'Estacionamiento no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(`❌ Error buscando ID ${id}:`, err.message);
        res.status(500).json({ error: 'Error al obtener detalle' });
    }
};