// backend/controllers/gastos.controller.js
const db = require('../../database/database.js');

function listar(req, res) {
  try {
    const gastos = db.prepare('SELECT * FROM gastos ORDER BY fecha DESC').all();
    res.json({ ok: true, gastos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function crear(req, res) {
  try {
    const { concepto, monto } = req.body;

    if (!concepto || concepto.trim() === '') {
      return res.status(400).json({ ok: false, mensaje: 'El concepto es obligatorio' });
    }

    if (monto === undefined || isNaN(Number(monto)) || Number(monto) <= 0) {
      return res.status(400).json({ ok: false, mensaje: 'El monto debe ser un número mayor a cero' });
    }

    const resultado = db
      .prepare('INSERT INTO gastos (concepto, monto) VALUES (?, ?)')
      .run(concepto.trim(), Number(monto));

    const nuevoGasto = db.prepare('SELECT * FROM gastos WHERE id = ?').get(resultado.lastInsertRowid);

    res.status(201).json({ ok: true, gasto: nuevoGasto });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function eliminar(req, res) {
  try {
    const { id } = req.params;

    const gastoExistente = db.prepare('SELECT * FROM gastos WHERE id = ?').get(id);
    if (!gastoExistente) {
      return res.status(404).json({ ok: false, mensaje: 'Gasto no encontrado' });
    }

    db.prepare('DELETE FROM gastos WHERE id = ?').run(id);

    res.json({ ok: true, mensaje: 'Gasto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  listar,
  crear,
  eliminar
};
