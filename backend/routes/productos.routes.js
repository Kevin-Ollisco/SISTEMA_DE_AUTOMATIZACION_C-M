// backend/routes/productos.routes.js
const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos.controller.js');

router.get('/', productosController.listar);
router.get('/:id', productosController.obtenerPorId);
router.post('/', productosController.crear);
router.put('/:id', productosController.actualizar);
router.delete('/:id', productosController.eliminar);
router.post('/:id/devolver-envase', productosController.devolverEnvase);

module.exports = router;
