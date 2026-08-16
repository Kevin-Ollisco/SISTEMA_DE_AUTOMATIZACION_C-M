// backend/routes/gastos.routes.js
const express = require('express');
const router = express.Router();
const gastosController = require('../controllers/gastos.controller.js');

router.get('/', gastosController.listar);
router.post('/', gastosController.crear);
router.delete('/:id', gastosController.eliminar);

module.exports = router;
