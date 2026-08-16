// backend/controllers/productos.controller.js
const db = require('../../database/database.js');

function listar(req, res) {
  try {
    const { busqueda } = req.query;

    let productos;
    if (busqueda && busqueda.trim() !== '') {
      const termino = `%${busqueda.trim()}%`;
      productos = db
        .prepare(`
          SELECT p.*, c.nombre AS categoria_nombre
          FROM productos p
          LEFT JOIN categorias c ON p.categoria_id = c.id
          WHERE p.activo = 1 AND (p.nombre LIKE ? OR p.codigo LIKE ?)
          ORDER BY p.nombre ASC
        `)
        .all(termino, termino);
    } else {
      productos = db
        .prepare(`
          SELECT p.*, c.nombre AS categoria_nombre
          FROM productos p
          LEFT JOIN categorias c ON p.categoria_id = c.id
          WHERE p.activo = 1
          ORDER BY p.nombre ASC
        `)
        .all();
    }

    res.json({ ok: true, productos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function obtenerPorId(req, res) {
  try {
    const producto = db
      .prepare('SELECT * FROM productos WHERE id = ?')
      .get(req.params.id);

    if (!producto) {
      return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
    }

    res.json({ ok: true, producto });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function crear(req, res) {
  try {
    const {
      codigo,
      nombre,
      categoria_id,
      precio_costo,
      precio_venta,
      stock,
      stock_minimo,
      unidad_medida,
      nombre_empaque,
      unidades_por_empaque,
      es_retornable,
      precio_envase
    } = req.body;

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
    }

    if (precio_venta === undefined || precio_costo === undefined) {
      return res.status(400).json({ ok: false, mensaje: 'El precio de costo y de venta son obligatorios' });
    }

    const resultado = db
      .prepare(`
        INSERT INTO productos
          (codigo, nombre, categoria_id, precio_costo, precio_venta, stock, stock_minimo, unidad_medida, nombre_empaque, unidades_por_empaque, es_retornable, precio_envase)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        codigo ? codigo.trim() : null,
        nombre.trim(),
        categoria_id || null,
        Number(precio_costo),
        Number(precio_venta),
        stock ? Number(stock) : 0,
        stock_minimo ? Number(stock_minimo) : 0,
        unidad_medida ? unidad_medida.trim() : 'unidad',
        nombre_empaque ? nombre_empaque.trim() : 'paquete',
        unidades_por_empaque ? Number(unidades_por_empaque) : 1,
        es_retornable ? 1 : 0,
        precio_envase ? Number(precio_envase) : 0
      );

    const nuevoProducto = db
      .prepare('SELECT * FROM productos WHERE id = ?')
      .get(resultado.lastInsertRowid);

    res.status(201).json({ ok: true, producto: nuevoProducto });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un producto con ese código' });
    }
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function actualizar(req, res) {
  try {
    const { id } = req.params;
    const {
      codigo,
      nombre,
      categoria_id,
      precio_costo,
      precio_venta,
      stock,
      stock_minimo,
      unidad_medida,
      nombre_empaque,
      unidades_por_empaque,
      es_retornable,
      precio_envase,
      activo
    } = req.body;

    const productoExistente = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    if (!productoExistente) {
      return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
    }

    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({ ok: false, mensaje: 'El nombre es obligatorio' });
    }

    db.prepare(`
      UPDATE productos SET
        codigo = ?,
        nombre = ?,
        categoria_id = ?,
        precio_costo = ?,
        precio_venta = ?,
        stock = ?,
        stock_minimo = ?,
        unidad_medida = ?,
        nombre_empaque = ?,
        unidades_por_empaque = ?,
        es_retornable = ?,
        precio_envase = ?,
        activo = ?
      WHERE id = ?
    `).run(
      codigo ? codigo.trim() : null,
      nombre.trim(),
      categoria_id || null,
      Number(precio_costo),
      Number(precio_venta),
      stock !== undefined ? Number(stock) : productoExistente.stock,
      stock_minimo !== undefined ? Number(stock_minimo) : productoExistente.stock_minimo,
      unidad_medida ? unidad_medida.trim() : productoExistente.unidad_medida,
      nombre_empaque ? nombre_empaque.trim() : productoExistente.nombre_empaque,
      unidades_por_empaque !== undefined ? Number(unidades_por_empaque) : productoExistente.unidades_por_empaque,
      es_retornable !== undefined ? (es_retornable ? 1 : 0) : productoExistente.es_retornable,
      precio_envase !== undefined ? Number(precio_envase) : productoExistente.precio_envase,
      activo === undefined ? productoExistente.activo : (activo ? 1 : 0),
      id
    );

    const productoActualizado = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    res.json({ ok: true, producto: productoActualizado });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, mensaje: 'Ya existe un producto con ese código' });
    }
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function eliminar(req, res) {
  try {
    const { id } = req.params;

    const productoExistente = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    if (!productoExistente) {
      return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
    }

    db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(id);

    res.json({ ok: true, mensaje: 'Producto desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function devolverEnvase(req, res) {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;

    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    if (!producto) {
      return res.status(404).json({ ok: false, mensaje: 'Producto no encontrado' });
    }

    const cantidadDevuelta = cantidad ? Number(cantidad) : 1;

    if (cantidadDevuelta > producto.envases_prestados) {
      return res.status(400).json({ ok: false, mensaje: 'No puedes devolver más envases de los que están prestados' });
    }

    db.prepare('UPDATE productos SET envases_prestados = envases_prestados - ? WHERE id = ?')
      .run(cantidadDevuelta, id);

    const productoActualizado = db.prepare('SELECT * FROM productos WHERE id = ?').get(id);
    res.json({ ok: true, producto: productoActualizado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  devolverEnvase
};
