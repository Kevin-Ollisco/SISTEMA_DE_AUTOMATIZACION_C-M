// backend/controllers/compras.controller.js
const db = require('../../database/database.js');

const registrarCompraTransaccion = db.transaction((proveedor, items) => {
  let total = 0;
  const detalles = [];

  for (const item of items) {
    const producto = db.prepare('SELECT * FROM productos WHERE id = ?').get(item.producto_id);

    if (!producto) {
      throw new Error(`Producto con id ${item.producto_id} no encontrado`);
    }

    const unidadesPorPaquete = item.unidades_por_paquete || producto.unidades_por_empaque || 1;
    const cantidadPaquetes = Number(item.cantidad_paquetes);
    const costoTotalPaquete = Number(item.costo_total_paquete);

    if (!cantidadPaquetes || cantidadPaquetes <= 0) {
      throw new Error(`Cantidad inválida para "${producto.nombre}"`);
    }

    if (costoTotalPaquete === undefined || costoTotalPaquete < 0) {
      throw new Error(`Costo inválido para "${producto.nombre}"`);
    }

    const cantidadUnidades = cantidadPaquetes * unidadesPorPaquete;
    const costoUnitario = costoTotalPaquete / unidadesPorPaquete;
    const subtotal = costoTotalPaquete * cantidadPaquetes;

    total += subtotal;

    detalles.push({
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad_paquetes: cantidadPaquetes,
      unidades_por_paquete: unidadesPorPaquete,
      cantidad_unidades: cantidadUnidades,
      costo_unitario: costoUnitario,
      subtotal
    });
  }

  const resultadoCompra = db
    .prepare('INSERT INTO compras (proveedor, total) VALUES (?, ?)')
    .run(proveedor || null, total);

  const compra_id = resultadoCompra.lastInsertRowid;

  const insertarDetalle = db.prepare(`
    INSERT INTO detalle_compras
      (compra_id, producto_id, cantidad_paquetes, unidades_por_paquete, cantidad_unidades, costo_unitario, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const actualizarProducto = db.prepare(`
    UPDATE productos SET stock = stock + ?, precio_costo = ? WHERE id = ?
  `);

  const insertarMovimiento = db.prepare(`
    INSERT INTO movimientos_inventario (producto_id, tipo, cantidad, motivo)
    VALUES (?, 'entrada', ?, ?)
  `);

  for (const detalle of detalles) {
    insertarDetalle.run(
      compra_id,
      detalle.producto_id,
      detalle.cantidad_paquetes,
      detalle.unidades_por_paquete,
      detalle.cantidad_unidades,
      detalle.costo_unitario,
      detalle.subtotal
    );

    actualizarProducto.run(
      detalle.cantidad_unidades,
      detalle.costo_unitario,
      detalle.producto_id
    );

    insertarMovimiento.run(
      detalle.producto_id,
      detalle.cantidad_unidades,
      `Compra #${compra_id}`
    );
  }

  return {
    id: compra_id,
    proveedor: proveedor || null,
    total,
    detalles
  };
});

function crear(req, res) {
  try {
    const { proveedor, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, mensaje: 'Debes agregar al menos un producto a la compra' });
    }

    const compra = registrarCompraTransaccion(proveedor, items);

    res.status(201).json({ ok: true, compra });
  } catch (error) {
    res.status(400).json({ ok: false, mensaje: error.message });
  }
}

function listar(req, res) {
  try {
    const compras = db.prepare('SELECT * FROM compras ORDER BY fecha DESC').all();
    res.json({ ok: true, compras });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function obtenerPorId(req, res) {
  try {
    const compra = db.prepare('SELECT * FROM compras WHERE id = ?').get(req.params.id);

    if (!compra) {
      return res.status(404).json({ ok: false, mensaje: 'Compra no encontrada' });
    }

    const detalles = db
      .prepare(`
        SELECT dc.*, p.nombre AS producto_nombre
        FROM detalle_compras dc
        JOIN productos p ON dc.producto_id = p.id
        WHERE dc.compra_id = ?
      `)
      .all(req.params.id);

    res.json({ ok: true, compra: { ...compra, detalles } });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  crear,
  listar,
  obtenerPorId
};
