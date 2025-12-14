const db = require('../db');
const cloudinary = require('../cloudinary');

// 1. CREAR PUBLICACIÓN + ESTACIONAMIENTO
const createParking = async (req, res) => {
    const client = await db.pool.connect();
    const userId = req.user.id;

    console.log(`🅿️ [PARKING CREATE] Usuario ${userId} iniciando publicación.`);

    try {
        await client.query('BEGIN');

        // Extraer campos
        const { 
            titulo, descripcion, precio, 
            id_comuna, 
            calle, numero_calle, n_estacionamiento,
            latitud, longitud,           
            largo, ancho, altura,        
            seguridad, cobertura, 
            es_24_horas, hora_apertura, hora_cierre
        } = req.body;

        // 1. Insertar Estacionamiento Físico
        const estRes = await client.query(
            `INSERT INTO estacionamiento (
                id_usuario_propietario, id_comuna, 
                calle, numero_calle, n_estacionamiento, 
                largo, ancho, altura_maxima, seguridad, tipo_cobertura,
                latitud, longitud
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING id_estacionamiento`,
            [
                userId, id_comuna, 
                calle, numero_calle, n_estacionamiento,
                largo, ancho, altura, seguridad, cobertura,
                latitud || null, longitud || null
            ]
        );
        const estId = estRes.rows[0].id_estacionamiento;

        // 2. Insertar la Publicación con Horarios
        const hStart = (es_24_horas === 'true' || !hora_apertura) ? null : hora_apertura;
        const hEnd = (es_24_horas === 'true' || !hora_cierre) ? null : hora_cierre;

        await client.query(
            `INSERT INTO publicacion (id_estacionamiento, titulo, descripcion, precio, es_24_horas, hora_apertura, hora_cierre, estado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Disponible')`,
            [estId, titulo, descripcion, precio, es_24_horas === 'true', hStart, hEnd]
        );

        // 3. Subir Múltiples Imágenes
        if (req.files && req.files.length > 0) {
            console.log(`📸 Subiendo ${req.files.length} imágenes...`);
            
            for (const file of req.files) {
                const b64 = Buffer.from(file.buffer).toString('base64');
                const dataURI = "data:" + file.mimetype + ";base64," + b64;
                
                const uploadRes = await cloudinary.uploader.upload(dataURI, {
                    folder: 'aparca_conce_estacionamientos',
                    transformation: [{ width: 1000, height: 750, crop: "limit" }]
                });

                await client.query(
                    `INSERT INTO imagen_estacionamiento (id_estacionamiento, ruta_imagen) VALUES ($1, $2)`,
                    [estId, uploadRes.secure_url]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Publicación creada exitosamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ [PARKING ERROR]`, err.message);
        res.status(500).json({ error: 'Error al crear la publicación: ' + err.message });
    } finally {
        client.release();
    }
};

// 2. OBTENER TODOS (Público)
const getAllParkings = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.id_publicacion, p.titulo, p.precio, p.estado, 
                   e.calle, e.numero_calle, c.nombre_comuna, 
                   (SELECT ruta_imagen FROM imagen_estacionamiento WHERE id_estacionamiento = e.id_estacionamiento LIMIT 1) as ruta_imagen,
                   e.tipo_cobertura, e.seguridad
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN comuna c ON e.id_comuna = c.id_comuna
            WHERE p.estado = 'Disponible'
            ORDER BY p.id_publicacion DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener estacionamientos' });
    }
};

// 3. OBTENER MIS ESTACIONAMIENTOS (Privado)
const getMyParkings = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(`
            SELECT p.id_publicacion, p.titulo, p.precio, p.estado, p.descripcion,
                   e.calle, e.numero_calle, e.n_estacionamiento, c.nombre_comuna,
                   (SELECT ruta_imagen FROM imagen_estacionamiento WHERE id_estacionamiento = e.id_estacionamiento LIMIT 1) as ruta_imagen
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN comuna c ON e.id_comuna = c.id_comuna
            WHERE e.id_usuario_propietario = $1
            ORDER BY p.id_publicacion DESC
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener tus estacionamientos' });
    }
};

// 4. ELIMINAR
const deleteParking = async (req, res) => {
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

// 5. OBTENER DETALLE
const getParkingById = async (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    try {
        const result = await db.query(`
            SELECT p.id_publicacion, p.titulo, p.descripcion, p.precio, p.es_24_horas, p.estado,
                   p.hora_apertura, p.hora_cierre,
                   e.calle, e.numero_calle, e.n_estacionamiento, e.largo, e.ancho, e.altura_maxima, 
                   e.seguridad, e.tipo_cobertura, e.latitud, e.longitud, e.id_usuario_propietario,
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

        if (result.rows.length === 0) return res.status(404).json({ error: 'Estacionamiento no encontrado' });

        const parkingData = result.rows[0];
        const imagenes = result.rows.map(row => row.ruta_imagen).filter(img => img !== null);
        parkingData.imagenes = imagenes;
        delete parkingData.ruta_imagen;

        res.json(parkingData);
    } catch (err) {
        console.error(`❌ Error ID ${id}:`, err.message);
        res.status(500).json({ error: 'Error al obtener detalle' });
    }
};

// 6. ACTUALIZAR PUBLICACIÓN (NUEVA FUNCIÓN)
const updateParking = async (req, res) => {
    const client = await db.pool.connect();
    const { id } = req.params;
    const userId = req.user.id;

    try {
        await client.query('BEGIN');

        // 1. Verificar propiedad
        const check = await client.query(`
            SELECT p.id_publicacion, p.id_estacionamiento 
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            WHERE p.id_publicacion = $1 AND e.id_usuario_propietario = $2
        `, [id, userId]);

        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'No autorizado o no existe' });
        }

        const idEstacionamiento = check.rows[0].id_estacionamiento;
        const { 
            titulo, descripcion, precio, es_24_horas, 
            hora_apertura, hora_cierre, id_comuna, calle, numero_calle, n_estacionamiento,
            largo, ancho, altura, seguridad, cobertura, latitud, longitud 
        } = req.body;

        // 2. Actualizar Estacionamiento
        await client.query(`
            UPDATE estacionamiento SET 
                id_comuna = $1, calle = $2, numero_calle = $3, n_estacionamiento = $4,
                largo = $5, ancho = $6, altura_maxima = $7, seguridad = $8, tipo_cobertura = $9,
                latitud = $10, longitud = $11
            WHERE id_estacionamiento = $12
        `, [id_comuna, calle, numero_calle, n_estacionamiento, largo, ancho, altura, seguridad, cobertura, latitud, longitud, idEstacionamiento]);

        // 3. Actualizar Publicación
        const hStart = (es_24_horas === 'true' || !hora_apertura) ? null : hora_apertura;
        const hEnd = (es_24_horas === 'true' || !hora_cierre) ? null : hora_cierre;

        await client.query(`
            UPDATE publicacion SET 
                titulo = $1, descripcion = $2, precio = $3, 
                es_24_horas = $4, hora_apertura = $5, hora_cierre = $6
            WHERE id_publicacion = $7
        `, [titulo, descripcion, precio, es_24_horas === 'true', hStart, hEnd, id]);

        // (Opcional) Si suben fotos nuevas, se agregan a las existentes
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const b64 = Buffer.from(file.buffer).toString('base64');
                const dataURI = "data:" + file.mimetype + ";base64," + b64;
                const uploadRes = await cloudinary.uploader.upload(dataURI, {
                    folder: 'aparca_conce_estacionamientos',
                    transformation: [{ width: 1000, height: 750, crop: "limit" }]
                });
                await client.query(
                    `INSERT INTO imagen_estacionamiento (id_estacionamiento, ruta_imagen) VALUES ($1, $2)`,
                    [idEstacionamiento, uploadRes.secure_url]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Publicación actualizada correctamente' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar' });
    } finally {
        client.release();
    }
};

module.exports = { 
    createParking, 
    getAllParkings, 
    getMyParkings, 
    deleteParking, 
    getParkingById, 
    updateParking 
};