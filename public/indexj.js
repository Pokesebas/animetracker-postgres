// indexj.js - Versión conectada al backend (Express + SQL Server)
// OJO: ya no se usa localStorage para guardar usuarios/animes/listas.
// Solo se guarda en localStorage la sesión mínima del usuario (Id, Nombre, Email)
// para no tener que iniciar sesión otra vez al recargar la página.

const API_BASE = '/api'; // Ruta relativa: funciona automáticamente con tu dominio de Vercel, sin importar cuál sea

let currentUser = null; // { Id, Nombre, Email }
let animes = [];        // se trae del backend
let listas = [];        // [{ Id, Nombre }] - se trae del backend
let editMode = false;
let activeListFilter = null; // Id de la lista activa, o null
let activeStatusFilter = null; // 'Visto' | 'En progreso' | 'Pendiente' | 'Abandonado' | null

const ESTADOS_DISPONIBLES = ['Visto', 'En progreso', 'Pendiente', 'Abandonado'];

// ==================== INICIALIZACIÓN ====================
function loadData() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }
}

// ==================== CAMBIO DE PANTALLAS ====================
function showLogin() {
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('register-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.remove('active');
}

function showRegister() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('register-screen').classList.add('active');
    document.getElementById('dashboard-screen').classList.remove('active');
}

async function showDashboard() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('register-screen').classList.remove('active');
    document.getElementById('dashboard-screen').classList.add('active');

    activeListFilter = null;
    activeStatusFilter = null;
    editMode = false;
    updateEditButtonUI();

    await loadListas();
    await loadAnimes();
    renderAnimes();
}

// ==================== LOGIN Y REGISTRO ====================
document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Por favor ingresa correo y contraseña');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 404) {
                alert('No existe una cuenta con ese correo. Por favor regístrate.');
                document.getElementById('reg-email').value = email;
                showRegister();
            } else {
                alert(data.error || 'No se pudo iniciar sesión');
            }
            return;
        }

        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    }
});

document.getElementById('register-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 409) {
                alert('Ya existe una cuenta con ese correo. Por favor inicia sesión.');
                document.getElementById('login-email').value = email;
                showLogin();
            } else {
                alert(data.error || 'No se pudo registrar la cuenta');
            }
            return;
        }

        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showDashboard();
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
    }
});

// ==================== CARGA DE DATOS DESDE EL BACKEND ====================
async function loadListas() {
    try {
        const res = await fetch(`${API_BASE}/listas/${currentUser.Id}`);
        listas = await res.json();
    } catch (err) {
        console.error(err);
        alert('No se pudieron cargar tus listas. Verifica que el servidor esté encendido.');
        listas = [];
    }
}

async function loadAnimes() {
    try {
        const res = await fetch(`${API_BASE}/animes/${currentUser.Id}`);
        animes = await res.json();
    } catch (err) {
        console.error(err);
        alert('No se pudieron cargar tus animes. Verifica que el servidor esté encendido.');
        animes = [];
    }
}

// ==================== LISTAS ====================
function populateListSelect(selectedId) {
    const select = document.getElementById('list-select');
    select.innerHTML = '';
    listas.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.Id;
        opt.textContent = l.Nombre;
        select.appendChild(opt);
    });
    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ Crear nueva lista';
    select.appendChild(newOpt);

    const existe = listas.some(l => String(l.Id) === String(selectedId));
    select.value = existe ? selectedId : (listas[0] ? listas[0].Id : '__new__');
}

async function crearListaEnBackend(nombre) {
    try {
        const res = await fetch(`${API_BASE}/listas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: currentUser.Id, nombre })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'No se pudo crear la lista');
            return null;
        }

        listas.push({ Id: data.id, Nombre: nombre });
        return data.id;
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor.');
        return null;
    }
}

async function handleListSelectChange() {
    const select = document.getElementById('list-select');
    if (select.value === '__new__') {
        const nombre = prompt('Nombre de la nueva lista:');
        if (nombre && nombre.trim()) {
            const nuevoId = await crearListaEnBackend(nombre.trim());
            if (nuevoId) {
                populateListSelect(nuevoId);
                return;
            }
        }
        select.value = listas[0] ? listas[0].Id : '__new__';
    }
}

function showListasModal() {
    renderListasInfo();
    document.getElementById('listas-modal').style.display = 'flex';
}

function closeListasModal() {
    document.getElementById('listas-modal').style.display = 'none';
}

function renderListasInfo() {
    const container = document.getElementById('listas-info');
    container.innerHTML = '';

    listas.forEach(l => {
        const count = animes.filter(a => a.ListaId === l.Id).length;
        const item = document.createElement('div');
        item.className = 'lista-item';
        item.innerHTML = `
            <span>${l.Nombre} (${count})</span>
            <div class="lista-actions">
                <button onclick="filtrarPorLista(${l.Id})">Ver</button>
                ${l.Nombre !== 'General' ? `<button onclick="eliminarLista(${l.Id})">Eliminar</button>` : ''}
            </div>
        `;
        container.appendChild(item);
    });
}

async function crearNuevaLista() {
    const nombre = prompt('Nombre de la nueva lista:');
    if (nombre && nombre.trim()) {
        const id = await crearListaEnBackend(nombre.trim());
        if (id) renderListasInfo();
    }
}

async function eliminarLista(id) {
    const lista = listas.find(l => l.Id === id);
    if (!lista) return;
    if (!confirm(`¿Eliminar la lista "${lista.Nombre}"? Los animes que estén en ella pasarán a "General".`)) return;

    try {
        const res = await fetch(`${API_BASE}/listas/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: currentUser.Id })
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'No se pudo eliminar la lista');
            return;
        }

        await loadListas();
        await loadAnimes();
        if (activeListFilter === id) clearListFilter();
        renderListasInfo();
        renderAnimes();
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor.');
    }
}

function filtrarPorLista(id) {
    activeListFilter = id;
    closeListasModal();
    const lista = listas.find(l => l.Id === id);
    const banner = document.getElementById('active-list-banner');
    document.getElementById('active-list-text').textContent = `Mostrando lista: ${lista ? lista.Nombre : ''}`;
    banner.style.display = 'flex';
    filterAnimes();
}

function clearListFilter() {
    activeListFilter = null;
    document.getElementById('active-list-banner').style.display = 'none';
    document.getElementById('search-input').value = '';
    renderAnimes();
}

// ==================== ESTADOS (nuevo) ====================
function showEstadosModal() {
    renderEstadosInfo();
    document.getElementById('estados-modal').style.display = 'flex';
}

function closeEstadosModal() {
    document.getElementById('estados-modal').style.display = 'none';
}

function renderEstadosInfo() {
    const container = document.getElementById('estados-info');
    container.innerHTML = '';

    ESTADOS_DISPONIBLES.forEach(estado => {
        const count = animes.filter(a => a.Estado === estado).length;
        const item = document.createElement('div');
        item.className = 'lista-item';
        item.innerHTML = `
            <span>${estado} (${count})</span>
            <div class="lista-actions">
                <button onclick="filtrarPorEstado('${estado}')">Ver</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function filtrarPorEstado(estado) {
    activeStatusFilter = estado;
    closeEstadosModal();
    const banner = document.getElementById('active-status-banner');
    document.getElementById('active-status-text').textContent = `Mostrando estado: ${estado}`;
    banner.style.display = 'flex';
    filterAnimes();
}

function clearStatusFilter() {
    activeStatusFilter = null;
    document.getElementById('active-status-banner').style.display = 'none';
    document.getElementById('search-input').value = '';
    renderAnimes();
}

// ==================== DASHBOARD / GRID ====================
function getFilteredBase() {
    let resultado = animes;
    if (activeListFilter) {
        resultado = resultado.filter(a => a.ListaId === activeListFilter);
    }
    if (activeStatusFilter) {
        resultado = resultado.filter(a => a.Estado === activeStatusFilter);
    }
    return resultado;
}

function renderAnimes(filteredAnimes = getFilteredBase()) {
    const grid = document.getElementById('anime-grid');
    grid.innerHTML = '';

    if (filteredAnimes.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:50px; color:#ddd;">
            No tienes animes registrados aún.<br>¡Presiona + Añadir!
        </p>`;
        return;
    }

    filteredAnimes.forEach((anime) => {
        const card = document.createElement('div');
        card.className = 'anime-card';

        const editControls = editMode ? `
            <div class="card-actions">
                <button onclick="event.stopPropagation(); editAnime(${anime.Id})" title="Editar">✏️</button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteAnime(${anime.Id})" title="Eliminar">🗑️</button>
            </div>
        ` : '';

        card.innerHTML = `
            ${editControls}
            <img src="${anime.ImagenUrl || 'https://via.placeholder.com/300x400/2a0055/ffffff?text=Anime'}" alt="${anime.Titulo}">
            <div class="anime-info">
                <h3>${anime.Titulo}</h3>
                <span class="status">${anime.Estado}</span>
                <p>${anime.Episodios} episodios</p>
                <div class="tags">
                    <span class="badge">📋 ${anime.ListaNombre || 'General'}</span>
                    ${anime.Categoria ? `<span class="badge">${anime.Categoria}</span>` : ''}
                    ${anime.Temporada ? `<span class="badge">Temp. ${anime.Temporada}</span>` : ''}
                </div>
            </div>
        `;
        card.onclick = () => showAnimeDetail(anime.Id);
        grid.appendChild(card);
    });
}

function filterAnimes() {
    const term = document.getElementById('search-input').value.toLowerCase();
    const base = getFilteredBase();
    const filtered = base.filter(a => a.Titulo.toLowerCase().includes(term));
    renderAnimes(filtered);
}

// ==================== MODO EDICIÓN ====================
function toggleEditMode() {
    editMode = !editMode;
    updateEditButtonUI();
    renderAnimes();
}

function updateEditButtonUI() {
    const btn = document.getElementById('edit-toggle-btn');
    if (editMode) {
        btn.textContent = '✅ Listo';
        btn.classList.add('active');
    } else {
        btn.textContent = '✏️ Editar';
        btn.classList.remove('active');
    }
}

function editAnime(id) {
    const anime = animes.find(a => a.Id === id);
    if (!anime) return;

    document.getElementById('modal-title').textContent = 'Editar Anime';
    document.getElementById('edit-index').value = anime.Id;
    document.getElementById('title').value = anime.Titulo;
    document.getElementById('image').value = anime.ImagenUrl || '';
    document.getElementById('status').value = anime.Estado;
    document.getElementById('episodes').value = anime.Episodios;
    document.getElementById('notes').value = anime.Notas || '';
    document.getElementById('category').value = anime.Categoria || 'Acción';
    document.getElementById('season').value = anime.Temporada || '1';
    populateListSelect(anime.ListaId);
    document.getElementById('anime-modal').style.display = 'flex';
}

async function deleteAnime(id) {
    const anime = animes.find(a => a.Id === id);
    if (!anime) return;
    if (!confirm(`¿Eliminar "${anime.Titulo}" de tu lista?`)) return;

    try {
        const res = await fetch(`${API_BASE}/animes/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: currentUser.Id })
        });

        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'No se pudo eliminar el anime');
            return;
        }

        await loadAnimes();
        renderAnimes();
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor.');
    }
}

// ==================== MODALES ANIME ====================
function showAddModal() {
    document.getElementById('modal-title').textContent = 'Añadir Anime';
    document.getElementById('anime-form').reset();
    document.getElementById('edit-index').value = -1;
    populateListSelect(listas[0] ? listas[0].Id : null);
    document.getElementById('anime-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('anime-modal').style.display = 'none';
}

function showAnimeDetail(id) {
    if (editMode) {
        editAnime(id);
        return;
    }
    const anime = animes.find(a => a.Id === id);
    if (!anime) return;

    alert(
        `📺 ${anime.Titulo}\n\n` +
        `Estado: ${anime.Estado}\n` +
        `Episodios: ${anime.Episodios}\n` +
        `Lista: ${anime.ListaNombre || 'General'}\n` +
        `Categoría: ${anime.Categoria || 'Sin categoría'}\n` +
        `Temporada: ${anime.Temporada || '1'}\n\n` +
        `Notas: ${anime.Notas || 'Sin notas'}`
    );
}

// Guardar anime (añadir o editar)
document.getElementById('anime-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('edit-index').value);

    let listaId = document.getElementById('list-select').value;
    if (listaId === '__new__' || !listaId) listaId = listas[0] ? listas[0].Id : null;
    listaId = parseInt(listaId);

    const payload = {
        usuarioId: currentUser.Id,
        listaId: listaId,
        titulo: document.getElementById('title').value,
        imagenUrl: document.getElementById('image').value,
        estado: document.getElementById('status').value,
        episodios: parseInt(document.getElementById('episodes').value) || 0,
        categoria: document.getElementById('category').value,
        temporada: parseInt(document.getElementById('season').value) || 1,
        notas: document.getElementById('notes').value
    };

    try {
        let res;
        if (id >= 0) {
            res = await fetch(`${API_BASE}/animes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch(`${API_BASE}/animes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'No se pudo guardar el anime');
            return;
        }

        await loadAnimes();
        closeModal();
        renderAnimes();
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor.');
    }
});

// ==================== CUENTA ====================
function showAccount() {
    const info = document.getElementById('account-info');
    info.innerHTML = `
        <p style="margin-bottom:10px;"><strong>Nombre:</strong> ${currentUser.Nombre}</p>
        <p style="margin-bottom:20px;"><strong>Correo:</strong> ${currentUser.Email}</p>
        <p style="color:#ccc; font-size:14px;">Total de animes registrados: ${animes.length}</p>
    `;
    document.getElementById('account-modal').style.display = 'flex';
}

function closeAccountModal() {
    document.getElementById('account-modal').style.display = 'none';
}

// ==================== CONFIGURACIÓN ====================
function showConfigModal() {
    document.getElementById('config-modal').style.display = 'flex';
}

function closeConfigModal() {
    document.getElementById('config-modal').style.display = 'none';
}

async function confirmarBorrarDatos() {
    if (!confirm('Esto eliminará todos tus animes guardados. ¿Deseas continuar?')) return;

    try {
        const res = await fetch(`${API_BASE}/animes/todos/${currentUser.Id}`, { method: 'DELETE' });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'No se pudieron borrar los animes');
            return;
        }
        await loadAnimes();
        renderAnimes();
        closeConfigModal();
    } catch (err) {
        console.error(err);
        alert('No se pudo conectar con el servidor.');
    }
}

// ==================== QUIÉNES SOMOS ====================
function showAboutModal() {
    document.getElementById('about-modal').style.display = 'flex';
}

function closeAboutModal() {
    document.getElementById('about-modal').style.display = 'none';
}

// ==================== SESIÓN ====================
function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    animes = [];
    listas = [];
    activeListFilter = null;
    activeStatusFilter = null;
    editMode = false;
    showLogin();
}

// ==================== OLVIDÉ MI CONTRASEÑA (nuevo) ====================
function showForgotModal() {
    document.getElementById('forgot-message').textContent = '';
    document.getElementById('forgot-form').reset();
    document.getElementById('forgot-modal').style.display = 'flex';
}

function closeForgotModal() {
    document.getElementById('forgot-modal').style.display = 'none';
}

document.getElementById('forgot-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('forgot-email').value.trim();
    const messageEl = document.getElementById('forgot-message');
    messageEl.textContent = 'Enviando...';

    try {
        const res = await fetch(`${API_BASE}/solicitar-recuperacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!res.ok) {
            const data = await res.json();
            messageEl.textContent = data.error || 'No se pudo enviar el correo.';
            return;
        }

        messageEl.textContent = 'Si ese correo existe, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).';
    } catch (err) {
        console.error(err);
        messageEl.textContent = 'No se pudo conectar con el servidor.';
    }
});

// ==================== INICIAR ====================
loadData();