const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const tokenHeader = req.headers['authorization'];

    if (!tokenHeader) {
        console.warn(`⚠️ [AUTH FAIL] Intento de acceso sin token desde IP: ${req.ip}`);
        return res.status(403).json({ error: 'Token requerido' });
    }

    // Formato esperado: "Bearer <token>"
    const token = tokenHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: 'Formato de token inválido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded; // Guardamos datos del usuario en la petición
        next();
    } catch (err) {
        console.error(`❌ [AUTH ERROR] Token inválido: ${err.message}`);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Middleware exclusivo para administradores
const verifyAdmin = (req, res, next) => {
    // Se asume que verifyToken ya se ejecutó antes
    // AHORA VALIDAMOS CONTRA EL ROL 3 (SEGÚN TU BASE DE DATOS)
    if (req.user && req.user.rol === 3) {
        next();
    } else {
        console.warn(`⛔ [ADMIN BLOCK] Usuario ${req.user ? req.user.id : 'anon'} (Rol ${req.user.rol}) intentó ruta admin.`);
        return res.status(403).json({ error: 'Acceso denegado. Requiere privilegios de administrador.' });
    }
};

module.exports = { verifyToken, verifyAdmin };