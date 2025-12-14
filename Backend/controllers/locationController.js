const db = require('../db');

exports.getRegions = async (req, res) => {
    try {
        console.log("📍 [API] Solicitando Regiones..."); // Log para depurar
        const result = await db.query('SELECT * FROM region ORDER BY id_region');
        console.log(`✅ [API] Regiones encontradas: ${result.rows.length}`);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ [API ERROR] Error en getRegions:", err.message);
        res.status(500).json({ error: 'Error al obtener regiones' });
    }
};

exports.getComunasByRegion = async (req, res) => {
    const { regionId } = req.params;
    try {
        const result = await db.query('SELECT * FROM comuna WHERE id_region = $1 ORDER BY nombre_comuna', [regionId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comunas' });
    }
};