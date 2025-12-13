-- QUERY TRUNCATED
/* =============================================
   1. TABLAS MAESTRAS (NORMALIZACIÓN GEOGRÁFICA Y DE VEHÍCULOS)
   ============================================= */

-- Normalización: Evita repetir nombres de roles
CREATE TABLE rol (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(20) NOT NULL UNIQUE
);

-- Normalización: Evita repetir nombres de regiones (Ej. Biobío, Metropolitana)
CREATE TABLE region (
    id_region SERIAL PRIMARY KEY,
    nombre_region VARCHAR(100) NOT NULL UNIQUE
);

-- Normalización: Comuna depende de Región (Ej. Concepción, Providencia)
CREATE TABLE comuna (
    id_comuna SERIAL PRIMARY KEY,
    id_region INTEGER NOT NULL,
    nombre_comuna VARCHAR(100) NOT NULL,
    CONSTRAINT fk_comuna_region FOREIGN KEY (id_region) REFERENCES region (id_region)
);

-- Normalización: Marcas de autos (Ej. Toyota, Chevrolet)
CREATE TABLE marca_vehiculo (
    id_marca SERIAL PRIMARY KEY,
    nombre_marca VARCHAR(50) NOT NULL UNIQUE
);

-- Normalización: Modelos dependen de Marca (Ej. Yaris depende de Toyota)
CREATE TABLE modelo_vehiculo (
    id_modelo SERIAL PRIMARY KEY,
    id_marca INTEGER NOT NULL,
    nombre_modelo VARCHAR(100) NOT NULL,
    CONSTRAINT fk_modelo_marca FOREIGN KEY (id_marca) REFERENCES marca_vehiculo (id_marca)
);

/* =============================================
   2. ENTIDADES PRINCIPALES
   ============================================= */

-- Tabla Usuario
-- Cambio: Se reemplaza 'ciudad' (texto) por 'id_comuna' (FK)
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INTEGER NOT NULL DEFAULT 1,
    id_comuna INTEGER NOT NULL, 
    rut VARCHAR(12) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    correo VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    calle VARCHAR(100) NOT NULL, -- Calle sí puede ser texto libre
    numero VARCHAR(10) NOT NULL,
    depto_casa VARCHAR(20),
    url_foto_perfil VARCHAR(1024),
    estado_cuenta VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol),
    CONSTRAINT fk_usuario_comuna FOREIGN KEY (id_comuna) REFERENCES comuna (id_comuna),
    CONSTRAINT ck_usuario_estado CHECK (estado_cuenta IN ('ELIMINADO', 'SUSPENDIDO', 'ACTIVO'))
);

-- Tabla Estacionamiento
-- Cambio: Se reemplaza 'ciudad' por 'id_comuna'
CREATE TABLE estacionamiento (
    id_estacionamiento SERIAL PRIMARY KEY,
    id_usuario_propietario INTEGER NOT NULL,
    id_comuna INTEGER NOT NULL,
    calle VARCHAR(100) NOT NULL,
    n_estacionamiento VARCHAR(20),
    largo DECIMAL(5, 2),
    ancho DECIMAL(5, 2),
    altura_maxima DECIMAL(5, 2),
    seguridad VARCHAR(100), -- Podría normalizarse en una tabla 'Caracteristica', pero aceptable como texto
    tipo_cobertura VARCHAR(100),
    CONSTRAINT fk_est_usuario FOREIGN KEY (id_usuario_propietario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_est_comuna FOREIGN KEY (id_comuna) REFERENCES comuna (id_comuna)
);

-- Tabla Vehiculo
-- Cambio: Se usan FKs hacia modelo (que ya incluye marca)
CREATE TABLE vehiculo (
    id_vehiculo SERIAL PRIMARY KEY,
    id_usuario_propietario INTEGER NOT NULL,
    id_modelo INTEGER NOT NULL, -- Relaciona Marca y Modelo
    patente VARCHAR(10) NOT NULL UNIQUE,
    color VARCHAR(50),
    tipo_vehiculo VARCHAR(50), -- Ej: SUV, Sedan, Moto
    CONSTRAINT fk_veh_usuario FOREIGN KEY (id_usuario_propietario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_veh_modelo FOREIGN KEY (id_modelo) REFERENCES modelo_vehiculo (id_modelo)
);

-- Tabla Imagen_Estacionamiento (Sin cambios mayores)
CREATE TABLE imagen_estacionamiento (
    id_imagen SERIAL PRIMARY KEY,
    id_estacionamiento INTEGER NOT NULL,
    ruta_imagen TEXT,
    descripcion VARCHAR(255),
    imagen_bytes BYTEA,
    CONSTRAINT fk_img_est FOREIGN KEY (id_estacionamiento) REFERENCES estacionamiento (id_estacionamiento) ON DELETE CASCADE
);

/* =============================================
   3. PROCESO DE NEGOCIO (ALQUILER)
   ============================================= */

-- Tabla Publicacion
CREATE TABLE publicacion (
    id_publicacion SERIAL PRIMARY KEY,
    id_estacionamiento INTEGER NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    es_24_horas BOOLEAN NOT NULL DEFAULT FALSE,
    hora_apertura TIME(0),
    hora_cierre TIME(0),
    estado VARCHAR(20) NOT NULL DEFAULT 'Disponible',
    CONSTRAINT fk_pub_est FOREIGN KEY (id_estacionamiento) REFERENCES estacionamiento (id_estacionamiento) ON DELETE CASCADE,
    CONSTRAINT ck_pub_estado CHECK (estado IN ('Bloqueada', 'Inactiva', 'Disponible'))
);

-- Tabla Contrato
CREATE TABLE contrato (
    id_contrato SERIAL PRIMARY KEY,
    id_publicacion INTEGER NOT NULL,
    id_usuario_arrendatario INTEGER NOT NULL,
    id_vehiculo INTEGER NOT NULL,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_termino TIMESTAMP NOT NULL,
    monto_total_contrato DECIMAL(12, 2) NOT NULL, -- Dato histórico, no calculado, para auditoría
    estado_contrato VARCHAR(20) DEFAULT 'ACTIVO',
    CONSTRAINT fk_con_pub FOREIGN KEY (id_publicacion) REFERENCES publicacion (id_publicacion),
    CONSTRAINT fk_con_usu FOREIGN KEY (id_usuario_arrendatario) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_con_veh FOREIGN KEY (id_vehiculo) REFERENCES vehiculo (id_vehiculo)
);

-- Tabla Pago
CREATE TABLE pago (
    id_pago SERIAL PRIMARY KEY,
    id_contrato INTEGER NOT NULL,
    monto_pagado DECIMAL(12, 2) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_pago VARCHAR(100),
    id_transaccion_externa VARCHAR(100),
    CONSTRAINT fk_pago_con FOREIGN KEY (id_contrato) REFERENCES contrato (id_contrato)
);

-- Tabla Calificacion
-- Cambio: Se eliminan campos redundantes. Solo se necesita saber QUÉ contrato y QUIÉN califica.
-- El destinatario se deduce: Si autor es el dueño, destinatario es arrendatario, y viceversa.
CREATE TABLE calificacion (
    id_calificacion SERIAL PRIMARY KEY,
    id_contrato INTEGER NOT NULL,
    id_usuario_autor INTEGER NOT NULL, -- Quién escribe la reseña
    puntuacion INTEGER NOT NULL,
    comentario TEXT,
    fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cal_con FOREIGN KEY (id_contrato) REFERENCES contrato (id_contrato),
    CONSTRAINT fk_cal_autor FOREIGN KEY (id_usuario_autor) REFERENCES usuario (id_usuario),
    CONSTRAINT ck_cal_puntuacion CHECK (puntuacion >= 1 AND puntuacion <= 5)
);

/* =============================================
   4. SISTEMA DE COMUNICACIÓN Y SOPORTE
   ============================================= */

-- Tabla Conversacion
CREATE TABLE conversacion (
    id_conversacion SERIAL PRIMARY KEY,
    id_publicacion INTEGER NOT NULL,
    id_usuario_interesado INTEGER NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conv_pub FOREIGN KEY (id_publicacion) REFERENCES publicacion (id_publicacion),
    CONSTRAINT fk_conv_usu FOREIGN KEY (id_usuario_interesado) REFERENCES usuario (id_usuario)
);

-- Tabla Mensaje
CREATE TABLE mensaje (
    id_mensaje SERIAL PRIMARY KEY,
    id_conversacion INTEGER NOT NULL,
    id_usuario_emisor INTEGER NOT NULL,
    contenido_mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_msg_conv FOREIGN KEY (id_conversacion) REFERENCES conversacion (id_conversacion) ON DELETE CASCADE,
    CONSTRAINT fk_msg_usu FOREIGN KEY (id_usuario_emisor) REFERENCES usuario (id_usuario)
);

-- Tabla Reporte
CREATE TABLE reporte (
    id_reporte SERIAL PRIMARY KEY,
    id_usuario_reportante INTEGER NOT NULL,
    id_contrato INTEGER,
    tipo_problema VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    estado_reporte VARCHAR(20) DEFAULT 'ABIERTO',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respuesta_admin TEXT,
    CONSTRAINT fk_rep_usu FOREIGN KEY (id_usuario_reportante) REFERENCES usuario (id_usuario),
    CONSTRAINT fk_rep_con FOREIGN KEY (id_contrato) REFERENCES contrato (id_contrato)
);

/* =============================================
   5. FACTURACIÓN Y LEGAL
   ============================================= */

-- Tabla Datos_facturacion
CREATE TABLE datos_facturacion (
    id_datos SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL UNIQUE,
    rut VARCHAR(12) NOT NULL,
    razon_social VARCHAR(100) NOT NULL,
    giro VARCHAR(255),
    direccion VARCHAR(255) NOT NULL,
    correo VARCHAR(100) NOT NULL,
    CONSTRAINT fk_datos_usu FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
);

-- Tabla Documento_tributario
-- Nota: Aunque Id_pago podría ser transitivo a través del contrato, se mantiene directo
-- para vincular una factura específica a una transacción específica (Traza de auditoría).
CREATE TABLE documento_tributario (
    id_documento SERIAL PRIMARY KEY,
    id_pago INTEGER NOT NU
/* LIMPIEZA PARA CLOUDINARY 
   Eliminamos la columna de bytes porque ahora guardaremos solo la URL
*/

ALTER TABLE imagen_estacionamiento DROP COLUMN imagen_bytes;

/* OPCIONAL: Asegurar que los campos de URL sean lo suficientemente largos
   (VARCHAR(1024) o TEXT es ideal, Cloudinary a veces genera URLs largas si usas transformaciones)
*/
ALTER TABLE usuario ALTER COLUMN url_foto_perfil TYPE VARCHAR(1024);
ALTER TABLE imagen_estacionamiento ALTER COLUMN ruta_imagen TYPE VARCHAR(1024);
-- =============================================
-- POBLADO DE DATOS GEOGRÁFICOS DE CHILE
-- =============================================

-- 1. Insertar Regiones
INSERT INTO region (id_region, nombre_region) VALUES
(1, 'Arica y Parinacota'),
(2, 'Tarapacá'),
(3, 'Antofagasta'),
(4, 'Atacama'),
(5, 'Coquimbo'),
(6, 'Valparaíso'),
(7, 'Metropolitana de Santiago'),
(8, 'Libertador General Bernardo O''Higgins'),
(9, 'Maule'),
(10, 'Ñuble'),
(11, 'Biobío'),
(12, 'La Araucanía'),
(13, 'Los Ríos'),
(14, 'Los Lagos'),
(15, 'Aysén del General Carlos Ibáñez del Campo'),
(16, 'Magallanes y de la Antártica Chilena');

-- 2. Insertar Comunas (Selección de las principales para no extender demasiado el código, 
-- asegúrate de agregar todas si es producción real, aquí van las capitales y más comunes)

-- Arica y Parinacota (1)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (1, 'Arica'), (1, 'Camarones'), (1, 'Putre'), (1, 'General Lagos');

-- Tarapacá (2)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (2, 'Iquique'), (2, 'Alto Hospicio'), (2, 'Pozo Almonte');

-- Antofagasta (3)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (3, 'Antofagasta'), (3, 'Mejillones'), (3, 'Calama'), (3, 'San Pedro de Atacama');

-- Atacama (4)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (4, 'Copiapó'), (4, 'Caldera'), (4, 'Vallenar');

-- Coquimbo (5)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (5, 'La Serena'), (5, 'Coquimbo'), (5, 'Ovalle'), (5, 'Illapel');

-- Valparaíso (6)
INSERT INTO comuna (id_region, nombre_comuna) VALUES 
(6, 'Valparaíso'), (6, 'Viña del Mar'), (6, 'Concón'), (6, 'Quilpué'), (6, 'Villa Alemana'), (6, 'San Antonio'), (6, 'Los Andes');

-- Metropolitana (7)
INSERT INTO comuna (id_region, nombre_comuna) VALUES 
(7, 'Santiago'), (7, 'Providencia'), (7, 'Las Condes'), (7, 'Ñuñoa'), (7, 'La Florida'), (7, 'Maipú'), (7, 'Puente Alto'),
(7, 'Vitacura'), (7, 'Lo Barnechea'), (7, 'San Miguel'), (7, 'Estación Central'), (7, 'La Reina'), (7, 'Peñalolén');

-- O'Higgins (8)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (8, 'Rancagua'), (8, 'Machalí'), (8, 'San Fernando'), (8, 'Pichilemu');

-- Maule (9)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (9, 'Talca'), (9, 'Curicó'), (9, 'Linares'), (9, 'Constitución');

-- Ñuble (10)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (10, 'Chillán'), (10, 'Chillán Viejo'), (10, 'San Carlos'), (10, 'Quillón');

-- Biobío (11) - ¡Tu zona principal!
INSERT INTO comuna (id_region, nombre_comuna) VALUES 
(11, 'Concepción'), (11, 'Talcahuano'), (11, 'San Pedro de la Paz'), (11, 'Chiguayante'), (11, 'Hualpén'), 
(11, 'Penco'), (11, 'Tomé'), (11, 'Coronel'), (11, 'Lota'), (11, 'Los Ángeles'), (11, 'Arauco');

-- La Araucanía (12)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (12, 'Temuco'), (12, 'Padre Las Casas'), (12, 'Villarrica'), (12, 'Pucón');

-- Los Ríos (13)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (13, 'Valdivia'), (13, 'Corral'), (13, 'La Unión');

-- Los Lagos (14)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (14, 'Puerto Montt'), (14, 'Puerto Varas'), (14, 'Osorno'), (14, 'Castro');

-- Aysén (15)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (15, 'Coyhaique'), (15, 'Aysén');

-- Magallanes (16)
INSERT INTO comuna (id_region, nombre_comuna) VALUES (16, 'Punta Arenas'), (16, 'Puerto Natales'), (16, 'Torres del Paine');
-- Insertar Marcas
INSERT INTO marca_vehiculo (nombre_marca) VALUES 
('Toyota'), ('Chevrolet'), ('Nissan'), ('Hyundai'), ('Kia'), ('Suzuki'), ('Ford');

-- Insertar Modelos (Ejemplos básicos)
-- Asumiendo los IDs generados arriba son 1, 2, 3... 
-- (Si tus IDs son diferentes, ajusta el primer número)

-- Toyota (1)
INSERT INTO modelo_vehiculo (id_marca, nombre_modelo) VALUES 
(1, 'Yaris'), (1, 'Corolla'), (1, 'Hilux'), (1, 'RAV4');

-- Chevrolet (2)
INSERT INTO modelo_vehiculo (id_marca, nombre_modelo) VALUES 
(2, 'Sail'), (2, 'Spark'), (2, 'Onix'), (2, 'Silverado');

-- Nissan (3)
INSERT INTO modelo_vehiculo (id_marca, nombre_modelo) VALUES 
(3, 'Versa'), (3, 'Sentra'), (3, 'Qashqai'), (3, 'NP300');

-- Hyundai (4)
INSERT INTO modelo_vehiculo (id_marca, nombre_modelo) VALUES 
(4, 'Accent'), (4, 'Elantra'), (4, 'Tucson'), (4, 'Santa Fe');

-- Kia (5)
INSERT INTO modelo_vehiculo (id_marca, nombre_modelo) VALUES 
(5, 'Morning'), (5, 'Rio 5'), (5, 'Sportage'), (5, 'Sorento');
ALTER TABLE estacionamiento 
ADD COLUMN latitud DECIMAL(10, 8),
ADD COLUMN longitud DECIMAL(11, 8);