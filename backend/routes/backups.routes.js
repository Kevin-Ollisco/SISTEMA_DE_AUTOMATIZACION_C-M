// backend/routes/backups.routes.js
const express = require('express');
const router = express.Router();
const backupsController = require('../controllers/backups.controller.js');

router.get('/', backupsController.listar);
router.post('/', backupsController.crear);
router.get('/:nombre/descargar', backupsController.descargar);
router.post('/:nombre/restaurar', backupsController.restaurar);

module.exports = router;
