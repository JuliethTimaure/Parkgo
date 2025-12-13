const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS para permitir peticiones desde Live Server (Puerto 5500 u otros)
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================================
// 📂 SERVIR ARCHIVOS ESTÁTICOS (FRONTEND)
// Se ajusta el nombre de la carpeta a 'Frontend' (con mayúscula) para evitar errores en Linux/Mac
// ========================================================
app.use(express.static(path.join(__dirname, '../Frontend')));

// Logs
app.use((req, res, next) => {
    console.log(`📨 [${req.method}] ${req.url}`);
    next();
});

// Rutas API
app.use('/api', apiRoutes);

// Manejador global de errores
app.use((err, req, res, next) => {
    console.error(`🔥 [ERROR] ${err.stack}`);
    res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
    console.log(`🚀 Park Go Server corriendo en http://localhost:${PORT}`);
});