// backend/routes/categorias.routes.js
const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categorias.controller.js');

router.get('/', categoriasController.listar);
router.get('/:id', categoriasController.obtenerPorId);
router.post('/', categoriasController.crear);
router.put('/:id', categoriasController.actualizar);
router.delete('/:id', categoriasController.eliminar);

module.exports = router;
