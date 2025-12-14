const db = require('../db');

// 1. CREAR UNA CALIFICACIÓN
exports.createRating = async (req, res) => {
    const { id_contrato, puntuacion, comentario } = req.body;
    const userId = req.user.id;

    try {
        // Validar que el usuario sea parte del contrato (Arrendatario o Dueño)
        const check = await db.query(
            `SELECT c.id_contrato, c.id_publicacion 
             FROM contrato c
             JOIN publicacion p ON c.id_publicacion = p.id_publicacion
             JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
             WHERE c.id_contrato = $1 
             AND (c.id_usuario_arrendatario = $2 OR e.id_usuario_propietario = $2)`,
            [id_contrato, userId]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para calificar este contrato.' });
        }

        // Evitar doble calificación del mismo usuario para el mismo contrato
        const exists = await db.query('SELECT id_calificacion FROM calificacion WHERE id_contrato = $1 AND id_usuario_autor = $2', [id_contrato, userId]);
        if (exists.rows.length > 0) return res.status(400).json({ error: 'Ya calificaste este arriendo.' });

        await db.query(
            `INSERT INTO calificacion (id_contrato, id_usuario_autor, puntuacion, comentario) VALUES ($1, $2, $3, $4)`,
            [id_contrato, userId, puntuacion, comentario]
        );

        res.status(201).json({ message: 'Calificación enviada con éxito' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al procesar la calificación' });
    }
};

// 2. OBTENER CALIFICACIONES DE UN ESTACIONAMIENTO (Para el detalle público)
exports.getParkingRatings = async (req, res) => {
    const { parkingId } = req.params;
    try {
        // Obtener comentarios
        const result = await db.query(`
            SELECT c.puntuacion, c.comentario, c.fecha_calificacion,
                   u.nombre, u.apellido, u.url_foto_perfil
            FROM calificacion c
            JOIN contrato con ON c.id_contrato = con.id_contrato
            JOIN usuario u ON c.id_usuario_autor = u.id_usuario
            WHERE con.id_publicacion = $1
            ORDER BY c.fecha_calificacion DESC
        `, [parkingId]);

        // Calcular promedio y total
        const avgRes = await db.query(`
            SELECT AVG(c.puntuacion)::NUMERIC(2,1) as promedio, COUNT(*) as total
            FROM calificacion c
            JOIN contrato con ON c.id_contrato = con.id_contrato
            WHERE con.id_publicacion = $1
        `, [parkingId]);

        res.json({
            reviews: result.rows,
            stats: avgRes.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obteniendo reseñas' });
    }
};