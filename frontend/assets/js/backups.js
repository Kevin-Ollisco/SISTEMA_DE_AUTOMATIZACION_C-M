// frontend/assets/js/backups.js

const btnCrearBackup = document.getElementById('btnCrearBackup');
const tablaBackups = document.getElementById('tablaBackups');
const mensajeVacio = document.getElementById('mensajeVacio');
const mensajeEstado = document.getElementById('mensajeEstado');

function mostrarMensaje(texto, tipo) {
  mensajeEstado.textContent = texto;
  mensajeEstado.className = tipo;
  mensajeEstado.style.display = 'block';
  setTimeout(() => {
    mensajeEstado.style.display = 'none';
  }, 4000);
}

function formatearTamano(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function cargarBackups() {
  try {
    const respuesta = await fetch('/api/backups');
    const datos = await respuesta.json();

    if (!datos.ok) {
      mostrarMensaje(datos.mensaje || 'Error al cargar copias', 'error');
      return;
    }

    tablaBackups.innerHTML = '';

    if (datos.backups.length === 0) {
      mensajeVacio.style.display = 'block';
      return;
    }

    mensajeVacio.style.display = 'none';

    datos.backups.forEach((backup) => {
      const fila = document.createElement('tr');
      fila.innerHTML = `
        <td>${backup.nombre}</td>
        <td>${formatearFecha(backup.fecha)}</td>
        <td>${formatearTamano(backup.tamano)}</td>
        <td class="acciones">
          <button class="btn-descargar" data-nombre="${backup.nombre}">Descargar</button>
          <button class="btn-restaurar" data-nombre="${backup.nombre}">Restaurar</button>
        </td>
      `;
      tablaBackups.appendChild(fila);
    });

    document.querySelectorAll('.btn-descargar').forEach((btn) => {
      btn.addEventListener('click', () => descargarBackup(btn.dataset.nombre));
    });

    document.querySelectorAll('.btn-restaurar').forEach((btn) => {
      btn.addEventListener('click', () => restaurarBackup(btn.dataset.nombre));
    });
  } catch (error) {
    mostrarMensaje('No se pudo conectar con el servidor', 'error');
  }
}

async function crearBackup() {
  btnCrearBackup.disabled = true;
  btnCrearBackup.textContent = 'Creando copia...';

  try {
    const respuesta = await fetch('/api/backups', { method: 'POST' });
    const datos = await respuesta.json();

    if (datos.ok) {
      mostrarMensaje('Copia de seguridad creada correctamente', 'ok');
      cargarBackups();
    } else {
      mostrarMensaje(datos.mensaje || 'Error al crear la copia', 'error');
    }
  } catch (error) {
    mostrarMensaje('No se pudo conectar con el servidor', 'error');
  } finally {
    btnCrearBackup.disabled = false;
    btnCrearBackup.textContent = 'Crear copia de seguridad ahora';
  }
}

function descargarBackup(nombre) {
  window.location.href = `/api/backups/${nombre}/descargar`;
}

async function restaurarBackup(nombre) {
  const confirmar = confirm(
    `¿Seguro que querés restaurar "${nombre}"?\n\nEsto reemplazará la base de datos actual y el sistema se reiniciará.`
  );

  if (!confirmar) return;

  try {
    const respuesta = await fetch(`/api/backups/${nombre}/restaurar`, { method: 'POST' });
    const datos = await respuesta.json();

    if (datos.ok) {
      alert('Copia restaurada. El sistema se está reiniciando, esta página se recargará en unos segundos...');
      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } else {
      mostrarMensaje(datos.mensaje || 'Error al restaurar', 'error');
    }
  } catch (error) {
    // El servidor se cierra al reiniciar, así que un error de red acá es esperado
    alert('El sistema se está reiniciando. Esta página se recargará en unos segundos...');
    setTimeout(() => {
      window.location.reload();
    }, 4000);
  }
}

btnCrearBackup.addEventListener('click', crearBackup);
cargarBackups();
