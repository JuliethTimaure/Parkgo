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
        // console.log(`👤 [AUTH OK] Usuario ID: ${decoded.id}`);
        next();
    } catch (err) {
        console.error(`❌ [AUTH ERROR] Token inválido: ${err.message}`);
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

module.exports = verifyToken;