// backend/routes/reportes.routes.js
const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportes.controller.js');

router.get('/resumen', reportesController.resumenVentas);
router.get('/stock-bajo', reportesController.productosStockBajo);

module.exports = router;
