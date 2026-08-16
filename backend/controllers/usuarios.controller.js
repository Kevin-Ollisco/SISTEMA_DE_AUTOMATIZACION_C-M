// backend/controllers/usuarios.controller.js
const bcrypt = require('bcryptjs');
const db = require('../../database/database.js');

function existeAlguno(req, res) {
  try {
    const resultado = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get();
    res.json({ ok: true, existe: resultado.total > 0 });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function registrarAcceso(usuarioId) {
  const fecha = new Date().toISOString();
  db.prepare('UPDATE usuarios SET ultimo_login = ? WHERE id = ?').run(fecha, usuarioId);
  db.prepare('INSERT INTO accesos_usuarios (usuario_id, fecha_ingreso) VALUES (?, ?)').run(usuarioId, fecha);
}

function crear(req, res) {
  try {
    const { nombre, usuario, password, rol } = req.body;

    if (!nombre || !usuario || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Nombre, usuario y contraseña son obligatorios' });
    }

    if (password.length < 4) {
      return res.status(400).json({ ok: false, mensaje: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const totalUsuarios = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
    const rolFinal = totalUsuarios === 0 ? 'admin' : (rol || 'vendedor');

    const passwordHasheado = bcrypt.hashSync(password, 10);

    const resultado = db
      .prepare('INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)')
      .run(nombre.trim(), usuario.trim().toLowerCase(), passwordHasheado, rolFinal);

    const nuevoUsuario = db
      .prepare('SELECT id, nombre, usuario, rol, activo, fecha_creacion, ultimo_login FROM usuarios WHERE id = ?')
      .get(resultado.lastInsertRowid);

    res.status(201).json({ ok: true, usuario: nuevoUsuario });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, mensaje: 'Ese nombre de usuario ya existe' });
    }
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function login(req, res) {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ ok: false, mensaje: 'Usuario y contraseña son obligatorios' });
    }

    const usuarioEncontrado = db
      .prepare('SELECT * FROM usuarios WHERE usuario = ? AND activo = 1')
      .get(usuario.trim().toLowerCase());

    if (!usuarioEncontrado) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos' });
    }

    const passwordValido = bcrypt.compareSync(password, usuarioEncontrado.password);

    if (!passwordValido) {
      return res.status(401).json({ ok: false, mensaje: 'Usuario o contraseña incorrectos' });
    }

    registrarAcceso(usuarioEncontrado.id);

    res.json({
      ok: true,
      usuario: {
        id: usuarioEncontrado.id,
        nombre: usuarioEncontrado.nombre,
        usuario: usuarioEncontrado.usuario,
        rol: usuarioEncontrado.rol
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function listar(req, res) {
  try {
    const usuarios = db
      .prepare('SELECT id, nombre, usuario, rol, activo, fecha_creacion, ultimo_login FROM usuarios ORDER BY nombre ASC')
      .all();
    res.json({ ok: true, usuarios });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function listarActividad(req, res) {
  try {
    const accesos = db
      .prepare(`
        SELECT a.id, a.usuario_id, u.nombre, u.usuario, a.fecha_ingreso
        FROM accesos_usuarios a
        JOIN usuarios u ON u.id = a.usuario_id
        ORDER BY a.fecha_ingreso DESC
        LIMIT 50
      `)
      .all();

    res.json({ ok: true, accesos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function desactivar(req, res) {
  try {
    const { id } = req.params;

    const usuarioExistente = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
    if (!usuarioExistente) {
      return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
    }

    db.prepare('UPDATE usuarios SET activo = 0 WHERE id = ?').run(id);
    res.json({ ok: true, mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  existeAlguno,
  crear,
  login,
  listar,
  listarActividad,
  desactivar
};
