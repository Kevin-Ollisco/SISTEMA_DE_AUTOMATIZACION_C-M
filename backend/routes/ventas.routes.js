// backend/routes/ventas.routes.js
const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas.controller.js');

router.get('/', ventasController.listar);
router.get('/:id', ventasController.obtenerPorId);
router.post('/', ventasController.crear);

module.exports = router;
