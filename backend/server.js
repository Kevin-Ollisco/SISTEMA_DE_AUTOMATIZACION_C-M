// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('../database/database.js');
const categoriasRoutes = require('./routes/categorias.routes.js');
const productosRoutes = require('./routes/productos.routes.js');
const ventasRoutes = require('./routes/ventas.routes.js');
const comprasRoutes = require('./routes/compras.routes.js');
const reportesRoutes = require('./routes/reportes.routes.js');
const gastosRoutes = require('./routes/gastos.routes.js');
const usuariosRoutes = require('./routes/usuarios.routes.js');
const backupsRoutes = require('./routes/backups.routes.js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.static(path.join(__dirname, '..', 'frontend', 'views')));

app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/backups', backupsRoutes);

app.get('/api/status', (req, res) => {
  res.json({ ok: true, mensaje: 'Servidor Express funcionando correctamente' });
});

app.get('/api/db-status', (req, res) => {
  try {
    const tablas = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map(fila => fila.name);

    res.json({ ok: true, mensaje: 'Base de datos conectada correctamente', tablas });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: 'Error al conectar con la base de datos', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
