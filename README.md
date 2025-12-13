# 🚗 Park Go

**Park Go** es una plataforma web innovadora diseñada para conectar a dueños de estacionamientos con conductores que buscan un lugar seguro y confiable para aparcar. El proyecto facilita la gestión, publicación y búsqueda de estacionamientos en tiempo real, comenzando con un enfoque en la zona de Concepción, Chile.

![Estado del Proyecto](https://img.shields.io/badge/Estado-En%20Desarrollo-orange)
![Licencia](https://img.shields.io/badge/Licencia-MIT-blue)

## ✨ Características Principales

* **🔍 Buscador Inteligente:** Filtra estacionamientos por comuna, precio y ubicación.
* **🗺️ Mapas Interactivos:** Integración con **Leaflet** para visualizar la ubicación exacta de los espacios.
* **📝 Publicación Simplificada (Wizard):** Un paso a paso intuitivo para que los dueños suban sus estacionamientos con fotos, características y ubicación en el mapa.
* **🚗 Gestión de Vehículos:** Los usuarios pueden registrar y administrar su flota de vehículos.
* **👤 Perfiles de Usuario:** Gestión de datos personales, foto de perfil y seguridad.
* **🔐 Autenticación Segura:** Sistema de registro e inicio de sesión protegido con **JWT** y encriptación de contraseñas.

## 🛠️ Tecnologías Utilizadas

Este proyecto fue construido utilizando una arquitectura robusta y moderna:

### Frontend
* **HTML5 & CSS3:** Diseño responsivo y moderno (Grid/Flexbox).
* **JavaScript (Vanilla):** Lógica del cliente sin dependencias pesadas.
* **Leaflet.js:** Mapas interactivos OpenSource.
* **SweetAlert2:** Alertas y modales elegantes.

### Backend
* **Node.js & Express:** Servidor RESTful API rápido y escalable.
* **PostgreSQL:** Base de datos relacional (alojada en **Neon.tech**).
* **Cloudinary:** Almacenamiento y optimización de imágenes en la nube.
* **Multer:** Manejo de subida de archivos.
* **JWT & Bcrypt:** Seguridad y autenticación.

## 🚀 Instalación y Despliegue

Sigue estos pasos para correr el proyecto localmente:

1.  **Clonar el repositorio:**
    ```bash
    git clone [https://github.com/JuliethTimaure/Parkgo.git](https://github.com/JuliethTimaure/Parkgo.git)
    cd Parkgo
    ```

2.  **Instalar dependencias del Backend:**
    ```bash
    cd Backend
    npm install
    ```

3.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` en la carpeta `Backend/` con las siguientes claves:
    ```env
    PORT=3000
    DB_HOST=tu_host_de_neon
    DB_USER=tu_usuario
    DB_PASSWORD=tu_contraseña
    DB_NAME=neondb
    DB_SSL_MODE=require
    JWT_SECRET=tu_secreto_seguro
    CLOUDINARY_CLOUD_NAME=tu_cloud_name
    CLOUDINARY_API_KEY=tu_api_key
    CLOUDINARY_API_SECRET=tu_api_secret
    ```

4.  **Iniciar el Servidor:**
    ```bash
    npm run dev
    ```

5.  **Abrir el Frontend:**
    Abre el archivo `Frontend/index.html` en tu navegador o usa una extensión como *Live Server*.

## 📂 Estructura del Proyecto

```text
Parkgo/
├── Backend/          # Servidor Node.js y lógica de negocio
│   ├── controllers/  # Controladores de la API
│   ├── routes/       # Rutas de Express
│   └── db.js         # Conexión a PostgreSQL
└── Frontend/         # Interfaz de usuario
    ├── css/          # Estilos (Dashboard, Wizard, etc.)
    ├── js/           # Lógica (Mapas, Fetch API, Validaciones)
    └── *.html        # Vistas principales