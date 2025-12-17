const db = require('../db');

// OBTENER TODOS LOS USUARIOS
exports.getAllUsers = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id_usuario, rut, nombre, apellido, correo, telefono, 
                   estado_cuenta, id_rol, fecha_registro, url_foto_perfil
            FROM usuario 
            ORDER BY id_usuario DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Error admin getAllUsers:", err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

// CAMBIAR ESTADO (BANEAR/ACTIVAR)
exports.toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { nuevo_estado } = req.body; 

    if (!['ACTIVO', 'SUSPENDIDO'].includes(nuevo_estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'No puedes banearte a ti mismo.' });
    }

    try {
        const result = await db.query(
            'UPDATE usuario SET estado_cuenta = $1 WHERE id_usuario = $2 RETURNING id_usuario, estado_cuenta',
            [nuevo_estado, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ message: `Usuario ${nuevo_estado} correctamente`, user: result.rows[0] });
    } catch (err) {
        console.error("❌ Error admin toggleStatus:", err);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

// ESTADÍSTICAS GERENCIALES
exports.getStats = async (req, res) => {
    try {
        // 1. USUARIOS
        const usersTotal = await db.query('SELECT COUNT(*) FROM usuario');
        // Lista para modal
        const usersList = await db.query(`
            SELECT nombre, apellido, correo, rut, estado_cuenta 
            FROM usuario ORDER BY nombre ASC
        `);

        // 2. PUBLICACIONES
        const pubsTotal = await db.query('SELECT COUNT(*) FROM publicacion');
        const pubsActive = await db.query("SELECT COUNT(*) FROM publicacion WHERE estado = 'Disponible'");
        const pubsRented = await db.query("SELECT COUNT(*) FROM contrato WHERE estado_contrato = 'ACTIVO'");
        
        // --- NUEVO: Detalle para el modal de Publicaciones ---
        const pubsDetail = await db.query(`
            SELECT p.titulo, p.estado, p.precio, u.nombre, u.apellido
            FROM publicacion p
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN usuario u ON e.id_usuario_propietario = u.id_usuario
            ORDER BY p.id_publicacion DESC LIMIT 50
        `);

        // 3. DINERO (FINANZAS)
        const moneyFinalized = await db.query(`
            SELECT COALESCE(SUM(monto_total_contrato), 0) as total 
            FROM contrato WHERE estado_contrato = 'FINALIZADO'
        `);
        
        const moneyActive = await db.query(`
            SELECT COALESCE(SUM(monto_total_contrato), 0) as total 
            FROM contrato WHERE estado_contrato = 'ACTIVO'
        `);

        // Detalle financiero (Solo para reporte impreso)
        const moneyDetail = await db.query(`
            SELECT c.fecha_inicio, c.monto_total_contrato, c.estado_contrato,
                   u.nombre || ' ' || u.apellido as cliente, u.rut
            FROM contrato c
            JOIN usuario u ON c.id_usuario_arrendatario = u.id_usuario
            WHERE c.estado_contrato IN ('ACTIVO', 'FINALIZADO')
            ORDER BY c.fecha_inicio DESC
        `);

        res.json({
            usuarios: {
                total: usersTotal.rows[0].count,
                lista: usersList.rows
            },
            publicaciones: {
                total: pubsTotal.rows[0].count,
                activas: pubsActive.rows[0].count,
                arrendadas: pubsRented.rows[0].count,
                detalle: pubsDetail.rows // Enviamos el detalle aquí
            },
            finanzas: {
                recaudado: moneyFinalized.rows[0].total,
                activo: moneyActive.rows[0].total,
                total_general: parseFloat(moneyFinalized.rows[0].total) + parseFloat(moneyActive.rows[0].total),
                detalle: moneyDetail.rows
            }
        });

    } catch (err) {
        console.error("❌ Error stats:", err);
        res.status(500).json({ error: 'Error stats' });
    }
};