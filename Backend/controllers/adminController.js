const db = require('../db');

// Obtener lista completa de usuarios
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

// Cambiar estado (Banear/Desbanear)
exports.toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { nuevo_estado } = req.body; // 'ACTIVO' o 'SUSPENDIDO'

    if (!['ACTIVO', 'SUSPENDIDO'].includes(nuevo_estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }

    // Evitar auto-ban
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'No puedes banearte a ti mismo.' });
    }

    try {
        const result = await db.query(
            'UPDATE usuario SET estado_cuenta = $1 WHERE id_usuario = $2 RETURNING id_usuario, estado_cuenta',
            [nuevo_estado, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: `Usuario ${nuevo_estado} correctamente`, user: result.rows[0] });
    } catch (err) {
        console.error("❌ Error admin toggleStatus:", err);
        res.status(500).json({ error: 'Error al cambiar estado' });
    }
};

// Estadísticas simples para el dashboard
exports.getStats = async (req, res) => {
    try {
        const users = await db.query('SELECT COUNT(*) FROM usuario');
        const parks = await db.query('SELECT COUNT(*) FROM estacionamiento');
        const rents = await db.query("SELECT COUNT(*) FROM contrato WHERE estado_contrato = 'ACTIVO'");
        
        res.json({
            usuarios: users.rows[0].count,
            estacionamientos: parks.rows[0].count,
            arriendos_activos: rents.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: 'Error stats' });
    }
};