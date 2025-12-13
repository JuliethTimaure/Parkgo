const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const parkingController = require('../controllers/parkingController');
const vehicleController = require('../controllers/vehicleController');
const verifyToken = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// === AUTH ===
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.getMe);
router.put('/auth/update', verifyToken, authController.updateProfile);
router.post('/auth/upload-avatar', verifyToken, upload.single('avatar'), authController.updateAvatar);

// === VEHÍCULOS ===
router.get('/vehicles/brands', vehicleController.getBrands);
router.get('/vehicles/models/:brandId', vehicleController.getModelsByBrand);
router.get('/vehicles', verifyToken, vehicleController.getMyVehicles);
router.post('/vehicles', verifyToken, vehicleController.createVehicle);
router.delete('/vehicles/:id', verifyToken, vehicleController.deleteVehicle);

// === PARKINGS ===
router.get('/parkings', parkingController.getAllParkings); // Público (Lista)
router.get('/parkings/mine', verifyToken, parkingController.getMyParkings); // Privado
router.get('/parkings/:id', parkingController.getParkingById); // [NUEVO] Público (Detalle)
router.post('/parkings/create', verifyToken, upload.single('imagen'), parkingController.createParking); // Privado
router.delete('/parkings/:id', verifyToken, parkingController.deleteParking); // Privado
router.get('/parkings/:id', parkingController.getParkingById);

module.exports = router;