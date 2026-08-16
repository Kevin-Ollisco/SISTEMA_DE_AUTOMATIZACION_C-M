// backend/routes/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller.js');

router.get('/existe-alguno', usuariosController.existeAlguno);
router.get('/actividad', usuariosController.listarActividad);
router.get('/', usuariosController.listar);
router.post('/login', usuariosController.login);
router.post('/', usuariosController.crear);
router.delete('/:id', usuariosController.desactivar);

module.exports = router;
