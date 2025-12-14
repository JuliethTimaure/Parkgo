const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const parkingController = require('../controllers/parkingController');
const vehicleController = require('../controllers/vehicleController');
const rentController = require('../controllers/rentController'); 
const locationController = require('../controllers/locationController'); 
const adminController = require('../controllers/adminController'); // NUEVO
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware'); // ACTUALIZADO
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
router.get('/parkings', parkingController.getAllParkings); 
router.get('/parkings/mine', verifyToken, parkingController.getMyParkings); 
router.get('/parkings/:id', parkingController.getParkingById); 
router.post('/parkings/create', verifyToken, upload.array('fotos', 5), parkingController.createParking); 
router.delete('/parkings/:id', verifyToken, parkingController.deleteParking); 

// === ARRIENDOS (RENT) ===
router.post('/rent/create', verifyToken, rentController.createRent);
router.get('/rent/owner', verifyToken, rentController.getOwnerRents); 
router.get('/rent/mine', verifyToken, rentController.getMyRentals);   
router.post('/rent/terminate', verifyToken, rentController.terminateRent);

// === UBICACIÓN ===
router.get('/locations/regions', locationController.getRegions);
router.get('/locations/comunas/:regionId', locationController.getComunasByRegion);

// === ADMIN (NUEVAS RUTAS) ===
router.get('/admin/users', verifyToken, verifyAdmin, adminController.getAllUsers);
router.put('/admin/users/:id/status', verifyToken, verifyAdmin, adminController.toggleUserStatus);
router.get('/admin/stats', verifyToken, verifyAdmin, adminController.getStats);

module.exports = router;