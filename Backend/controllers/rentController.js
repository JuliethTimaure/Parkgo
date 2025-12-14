const db = require('../db');

// 1. CREAR ARRIENDO
exports.createRent = async (req, res) => {
    const client = await db.pool.connect();
    const id_usuario = req.user.id;
    
    try {
        const { id_publicacion, id_vehiculo, meses, metodo_pago } = req.body;

        await client.query('BEGIN');

        // Validar publicación
        const pubRes = await client.query('SELECT precio, id_estacionamiento FROM publicacion WHERE id_publicacion = $1', [id_publicacion]);
        if(pubRes.rows.length === 0) throw new Error('Publicación no encontrada');
        
        const precioMensual = parseFloat(pubRes.rows[0].precio);
        const montoTotal = precioMensual * parseInt(meses); 
        
        const fechaInicio = new Date();
        const fechaTermino = new Date();
        fechaTermino.setMonth(fechaTermino.getMonth() + parseInt(meses));

        const contratoRes = await client.query(
            `INSERT INTO contrato (id_publicacion, id_usuario_arrendatario, id_vehiculo, fecha_inicio, fecha_termino, monto_total_contrato, estado_contrato)
             VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVO') RETURNING id_contrato`,
            [id_publicacion, id_usuario, id_vehiculo, fechaInicio, fechaTermino, montoTotal]
        );
        const idContrato = contratoRes.rows[0].id_contrato;

        await client.query(
            `INSERT INTO pago (id_contrato, monto_pagado, estado, metodo_pago, id_transaccion_externa)
             VALUES ($1, $2, 'APROBADO', $3, $4)`,
            [idContrato, montoTotal, 'Tarjeta Crédito', `TX-${Date.now()}`]
        );

        await client.query('UPDATE publicacion SET estado = $1 WHERE id_publicacion = $2', ['Inactiva', id_publicacion]);

        await client.query('COMMIT');
        res.status(201).json({ message: 'Arriendo exitoso', id_contrato: idContrato });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error createRent:", err);
        res.status(500).json({ error: 'Error al procesar el arriendo' });
    } finally {
        client.release();
    }
};

// 2. OBTENER MIS INQUILINOS (Para el Dueño)
exports.getOwnerRents = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(`
            SELECT c.id_contrato, c.fecha_inicio, c.fecha_termino, c.monto_total_contrato,
                   p.titulo, e.calle, e.n_estacionamiento,
                   u.nombre AS nombre_arrendatario, u.apellido AS apellido_arrendatario, u.url_foto_perfil, u.telefono,
                   v.patente, v.color, m.nombre_modelo, mar.nombre_marca,
                   com.nombre_comuna, reg.nombre_region
            FROM contrato c
            JOIN publicacion p ON c.id_publicacion = p.id_publicacion
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN comuna com ON e.id_comuna = com.id_comuna
            JOIN region reg ON com.id_region = reg.id_region
            JOIN usuario u ON c.id_usuario_arrendatario = u.id_usuario
            JOIN vehiculo v ON c.id_vehiculo = v.id_vehiculo
            JOIN modelo_vehiculo m ON v.id_modelo = m.id_modelo
            JOIN marca_vehiculo mar ON m.id_marca = mar.id_marca
            WHERE e.id_usuario_propietario = $1 AND c.estado_contrato = 'ACTIVO'
            ORDER BY c.fecha_inicio DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener arriendos' });
    }
};

// 3. OBTENER MIS ARRIENDOS (Para el Conductor)
// **MODIFICADO**: Ahora incluye JOIN con region para obtener nombre_region
exports.getMyRentals = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(`
            SELECT c.id_contrato, c.fecha_inicio, c.fecha_termino, c.monto_total_contrato, c.estado_contrato,
                   p.titulo, p.hora_apertura, p.hora_cierre, p.es_24_horas,
                   e.calle, e.numero_calle, e.n_estacionamiento, e.latitud, e.longitud,
                   u.nombre AS nombre_dueno, u.apellido AS apellido_dueno, u.telefono AS telefono_dueno, u.url_foto_perfil,
                   com.nombre_comuna, reg.nombre_region,
                   v.patente, m.nombre_modelo, mar.nombre_marca
            FROM contrato c
            JOIN publicacion p ON c.id_publicacion = p.id_publicacion
            JOIN estacionamiento e ON p.id_estacionamiento = e.id_estacionamiento
            JOIN comuna com ON e.id_comuna = com.id_comuna
            JOIN region reg ON com.id_region = reg.id_region
            JOIN usuario u ON e.id_usuario_propietario = u.id_usuario
            JOIN vehiculo v ON c.id_vehiculo = v.id_vehiculo
            JOIN modelo_vehiculo m ON v.id_modelo = m.id_modelo
            JOIN marca_vehiculo mar ON m.id_marca = mar.id_marca
            WHERE c.id_usuario_arrendatario = $1
            ORDER BY c.fecha_inicio DESC
        `, [userId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener tus arriendos' });
    }
};

// 4. TERMINAR CONTRATO
exports.terminateRent = async (req, res) => {
    const client = await db.pool.connect();
    const { id_contrato, motivo } = req.body;
    const userId = req.user.id;

    try {
        await client.query('BEGIN');

        const contratoRes = await client.query(`
            SELECT c.id_contrato, c.id_publicacion, c.fecha_inicio, c.fecha_termino, c.monto_total_contrato
            FROM contrato c
            JOIN estacionamiento e ON (SELECT id_estacionamiento FROM publicacion WHERE id_publicacion = c.id_publicacion) = e.id_estacionamiento
            WHERE c.id_contrato = $1 
              AND c.estado_contrato = 'ACTIVO'
              AND (c.id_usuario_arrendatario = $2 OR e.id_usuario_propietario = $2)
        `, [id_contrato, userId]);

        if (contratoRes.rows.length === 0) {
            throw new Error('Contrato no encontrado, no autorizado o ya finalizado.');
        }

        const contrato = contratoRes.rows[0];
        
        const totalPagado = parseFloat(contrato.monto_total_contrato);
        let montoReembolso = 0;
        const fechaInicio = new Date(contrato.fecha_inicio);
        const fechaFin = new Date(contrato.fecha_termino);
        const fechaHoy = new Date();

        if (fechaHoy < fechaFin) {
            const duracionTotal = fechaFin.getTime() - fechaInicio.getTime();
            const tiempoUsado = fechaHoy > fechaInicio ? (fechaHoy.getTime() - fechaInicio.getTime()) : 0;
            const tiempoRestante = duracionTotal - tiempoUsado;

            if (duracionTotal > 0 && tiempoRestante > 0) {
                const proporcion = tiempoRestante / duracionTotal;
                montoReembolso = Math.floor(totalPagado * proporcion);
            }
        }
        if (montoReembolso > totalPagado) montoReembolso = totalPagado;
        if (montoReembolso < 0) montoReembolso = 0;

        await client.query(
            `UPDATE contrato SET estado_contrato = 'TERMINADO', fecha_termino = NOW() WHERE id_contrato = $1`,
            [id_contrato]
        );

        await client.query(
            `UPDATE publicacion SET estado = 'Disponible' WHERE id_publicacion = $1`,
            [contrato.id_publicacion]
        );

        await client.query('COMMIT');

        res.json({ 
            message: 'Contrato terminado exitosamente', 
            monto_reembolso: montoReembolso.toLocaleString('es-CL')
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error terminando contrato:", err.message);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
};