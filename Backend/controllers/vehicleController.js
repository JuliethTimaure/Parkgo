const db = require('../db');

// Obtener todas las Marcas
const getBrands = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM marca_vehiculo ORDER BY nombre_marca');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener marcas' });
    }
};

// Obtener Modelos por Marca
const getModelsByBrand = async (req, res) => {
    const { brandId } = req.params;
    try {
        const result = await db.query('SELECT * FROM modelo_vehiculo WHERE id_marca = $1 ORDER BY nombre_modelo', [brandId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener modelos' });
    }
};

// Obtener Vehículos del Usuario Logueado
const getMyVehicles = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(`
            SELECT v.id_vehiculo, v.patente, v.color, v.tipo_vehiculo, 
                   m.nombre_modelo, mar.nombre_marca
            FROM vehiculo v
            JOIN modelo_vehiculo m ON v.id_modelo = m.id_modelo
            JOIN marca_vehiculo mar ON m.id_marca = mar.id_marca
            WHERE v.id_usuario_propietario = $1
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener tus vehículos' });
    }
};

// Registrar Vehículo
const createVehicle = async (req, res) => {
    const userId = req.user.id;
    const { id_modelo, patente, color, tipo_vehiculo } = req.body;

    // Normalizar patente
    const patenteClean = patente.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    try {
        // Verificar duplicado
        const check = await db.query('SELECT id_vehiculo FROM vehiculo WHERE patente = $1', [patenteClean]);
        if (check.rows.length > 0) return res.status(409).json({ error: 'Esa patente ya está registrada en el sistema.' });

        const result = await db.query(`
            INSERT INTO vehiculo (id_usuario_propietario, id_modelo, patente, color, tipo_vehiculo)
            VALUES ($1, $2, $3, $4, $5) RETURNING id_vehiculo
        `, [userId, id_modelo, patenteClean, color, tipo_vehiculo]);

        res.status(201).json({ message: 'Vehículo registrado', vehicle: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar vehículo' });
    }
};

// Eliminar Vehículo
const deleteVehicle = async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM vehiculo WHERE id_vehiculo = $1 AND id_usuario_propietario = $2 RETURNING id_vehiculo', [id, userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado o no te pertenece' });
        
        res.json({ message: 'Vehículo eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar vehículo' });
    }
};

module.exports = { getBrands, getModelsByBrand, getMyVehicles, createVehicle, deleteVehicle };