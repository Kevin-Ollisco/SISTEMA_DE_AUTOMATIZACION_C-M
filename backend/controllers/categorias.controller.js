// backend/controllers/categorias.controller.js
const db = require('../../database/database.js');

function listar(req, res) {
  try {
    const categorias = db
      .prepare('SELECT * FROM categorias ORDER BY nombre ASC')
      .all();
    res.json({ ok: true, categorias });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function obtenerPorId(req, res) {
  try {
    const categoria = db
      .prepare('SELECT * FROM categorias WHERE id = ?')
      .get(req.params.id);

    if (!categoria) {
      return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
    }

    res.json({ ok: true, categoria });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function crear(req, res) {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
    }

    const resultado = db
      .prepare('INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)')
      .run(nombre.trim(), descripcion ? descripcion.trim() : null);

    const nuevaCategoria = db
      .prepare('SELECT * FROM categorias WHERE id = ?')
      .get(resultado.lastInsertRowid);

    res.status(201).json({ ok: true, categoria: nuevaCategoria });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function actualizar(req, res) {
  try {
    const { nombre, descripcion, activo } = req.body;
    const { id } = req.params;

    const categoriaExistente = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
    if (!categoriaExistente) {
      return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
    }

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
    }

    db.prepare(
      'UPDATE categorias SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?'
    ).run(
      nombre.trim(),
      descripcion ? descripcion.trim() : null,
      activo === undefined ? categoriaExistente.activo : (activo ? 1 : 0),
      id
    );

    const categoriaActualizada = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
    res.json({ ok: true, categoria: categoriaActualizada });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe una categoría con ese nombre' });
    }
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function eliminar(req, res) {
  try {
    const { id } = req.params;

    const categoriaExistente = db.prepare('SELECT * FROM categorias WHERE id = ?').get(id);
    if (!categoriaExistente) {
      return res.status(404).json({ ok: false, mensaje: 'Categoría no encontrada' });
    }

    db.prepare('UPDATE categorias SET activo = 0 WHERE id = ?').run(id);

    res.json({ ok: true, mensaje: 'Categoría desactivada correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
