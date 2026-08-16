// backend/controllers/backups.controller.js
const path = require('path');
const fs = require('fs');
const db = require('../../database/database.js');

const RUTA_DB = db.RUTA_DB;
const CARPETA_BACKUPS = db.empaquetado
  ? path.join(path.dirname(RUTA_DB), 'backups')
  : path.join(__dirname, '..', '..', 'database', 'backups');

if (!fs.existsSync(CARPETA_BACKUPS)) {
  fs.mkdirSync(CARPETA_BACKUPS, { recursive: true });
}

function formatearFecha(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function validarNombreArchivo(nombre) {
  // Solo letras, números, guiones y guion bajo, terminado en .db (evita path traversal)
  return /^[a-zA-Z0-9_-]+\.db$/.test(nombre);
}

async function crear(req, res) {
  try {
    const nombreArchivo = `backup-${formatearFecha(new Date())}.db`;
    const rutaDestino = path.join(CARPETA_BACKUPS, nombreArchivo);

    // db.backup() es el método seguro de better-sqlite3: copia la DB
    // aunque haya escrituras en curso, sin corromper el archivo.
    await db.backup(rutaDestino);

    const stats = fs.statSync(rutaDestino);

    res.status(201).json({
      ok: true,
      mensaje: 'Copia de seguridad creada correctamente',
      backup: {
        nombre: nombreArchivo,
        tamano: stats.size,
        fecha: stats.mtime
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function listar(req, res) {
  try {
    const archivos = fs.readdirSync(CARPETA_BACKUPS)
      .filter((nombre) => nombre.endsWith('.db'))
      .map((nombre) => {
        const stats = fs.statSync(path.join(CARPETA_BACKUPS, nombre));
        return {
          nombre,
          tamano: stats.size,
          fecha: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ ok: true, backups: archivos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function descargar(req, res) {
  try {
    const { nombre } = req.params;

    if (!validarNombreArchivo(nombre)) {
      return res.status(400).json({ ok: false, mensaje: 'Nombre de archivo inválido' });
    }

    const ruta = path.join(CARPETA_BACKUPS, nombre);

    if (!fs.existsSync(ruta)) {
      return res.status(404).json({ ok: false, mensaje: 'Copia de seguridad no encontrada' });
    }

    res.download(ruta, nombre);
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

function restaurar(req, res) {
  try {
    const { nombre } = req.params;

    if (!validarNombreArchivo(nombre)) {
      return res.status(400).json({ ok: false, mensaje: 'Nombre de archivo inválido' });
    }

    const rutaBackup = path.join(CARPETA_BACKUPS, nombre);

    if (!fs.existsSync(rutaBackup)) {
      return res.status(404).json({ ok: false, mensaje: 'Copia de seguridad no encontrada' });
    }

    // Por seguridad, antes de sobreescribir guardamos un respaldo de la DB actual
    const nombreRespaldoPrevio = `backup-antes-de-restaurar-${formatearFecha(new Date())}.db`;
    fs.copyFileSync(RUTA_DB, path.join(CARPETA_BACKUPS, nombreRespaldoPrevio));

    db.close();
    fs.copyFileSync(rutaBackup, RUTA_DB);

    res.json({
      ok: true,
      mensaje: 'Copia restaurada correctamente. El sistema se reiniciará en unos segundos...'
    });

    // Reiniciamos la app: si corre empaquetada usamos Electron (app.relaunch),
    // si corre en desarrollo (npm start / nodemon) simplemente cerramos el proceso.
    setTimeout(() => {
      try {
        const { app } = require('electron');
        if (app && app.isPackaged) {
          app.relaunch();
          app.exit(0);
          return;
        }
      } catch (error) {
        // no estamos dentro de Electron, seguimos al fallback
      }
      process.exit(1);
    }, 500);
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
}

module.exports = {
  crear,
  listar,
  descargar,
  restaurar
};
