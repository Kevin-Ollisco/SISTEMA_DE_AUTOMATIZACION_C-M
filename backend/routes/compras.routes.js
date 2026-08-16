// backend/routes/compras.routes.js
const express = require('express');
const router = express.Router();
const comprasController = require('../controllers/compras.controller.js');

router.get('/', comprasController.listar);
router.get('/:id', comprasController.obtenerPorId);
router.post('/', comprasController.crear);

module.exports = router;
