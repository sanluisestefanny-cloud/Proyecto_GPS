const API_URL = 'https://proyecto-gps-ynmg.onrender.com/api';
let map;
let rutaActual; 
let marcadoresFlota = {}; 
let watchId = null; // Para el rastreo GPS en tiempo real

// 1. CONFIGURACIÓN DE ICONO Y RUTAS
const combiIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

const rutasMaestras = {
    "apizaco-teacalco": [[19.4125, -98.1408], [19.3850, -98.1200], [19.3367, -98.0631]],
    "tlaxcala-apizaco": [[19.3133, -98.2394], [19.3580, -98.1950], [19.4125, -98.1408]],
    "huamantla-tlaxcala": [[19.3128, -97.9225], [19.3150, -98.1000], [19.3133, -98.2394]]
};

// 2. PERSISTENCIA Y CARGA
window.onload = () => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('userRol');
    if (token && rol) {
        configurarInterfazSegunRol(rol);
    }
};

// 3. NAVEGACIÓN
function toggleAuth() {
    const login = document.getElementById('login-container');
    const register = document.getElementById('register-container');
    const isLoginVisible = login.style.display !== 'none';
    login.style.display = isLoginVisible ? 'none' : 'block';
    register.style.display = isLoginVisible ? 'block' : 'none';
}

// 4. LOGIN ACTUALIZADO
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRol', data.user.rol);
            localStorage.setItem('userName', data.user.nombre); 
            configurarInterfazSegunRol(data.user.rol);
        } else {
            alert(data.msg || "Error en el login");
        }
    } catch (error) {
        alert("Servidor no disponible");
    }
});

// 5. REGISTRO
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, rol })
        });
        if (res.ok) {
            alert("✅ Registro exitoso. Inicia sesión.");
            toggleAuth();
        } else {
            const data = await res.json();
            alert("❌ Error: " + data.error);
        }
    } catch (error) {
        alert("Error de conexión");
    }
});

// 6. INTERFAZ (Modificada para mostrar el botón de cerrar sesión flotante)
async function configurarInterfazSegunRol(rol) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('map-section').style.display = 'block';
    
    // Mostramos el wrapper del botón de cerrar sesión flotante
    const logoutWrapper = document.getElementById('logout-wrapper');
    if (logoutWrapper) logoutWrapper.style.display = 'block';

    initMap();

    document.getElementById('admin-panel').style.display = rol === 'concesionario' ? 'block' : 'none';
    document.getElementById('driver-panel').style.display = rol === 'chofer' ? 'block' : 'none';

    if (rol === 'concesionario' || rol === 'usuario') {
        setInterval(cargarUnidadesEnMapa, 5000); 
    }
}

// 7. CARGAR UNIDADES
async function cargarUnidadesEnMapa() {
    try {
        const res = await fetch(`${API_URL}/combis/activas`);
        if (res.ok) {
            const unidades = await res.json();
            unidades.forEach(u => {
                const popupContent = `
                    <b>Unidad: ${u.numEconomico}</b><br>
                    <b>Chofer: ${u.nombreChofer || 'Anonimo'}</b><br>
                    Ruta: ${u.ruta}
                `;
                if (!marcadoresFlota[u._id]) {
                    marcadoresFlota[u._id] = L.marker([u.lat, u.lng], { icon: combiIcon })
                        .addTo(map)
                        .bindPopup(popupContent);
                } else {
                    marcadoresFlota[u._id].setLatLng([u.lat, u.lng]).setPopupContent(popupContent);
                }
            });
        }
    } catch (e) { console.log("Buscando unidades..."); }
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([19.313, -98.238], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    setTimeout(() => { map.invalidateSize(); }, 200);
}

// 8. RASTREO GPS EN TIEMPO REAL
function toggleStatus() {
    const btn = document.getElementById('btn-status');
    const statusText = document.getElementById('status-text');
    const estaActivo = btn.innerText === "Iniciar Ruta";
    
    if (estaActivo) {
        btn.innerText = "Finalizar Ruta";
        statusText.innerText = "Activo - En Ruta";
        btn.style.background = "#d32f2f";
        iniciarSeguimientoGPS();
    } else {
        btn.innerText = "Iniciar Ruta";
        statusText.innerText = "Fuera de Servicio";
        btn.style.background = "#00796b";
        detenerSeguimientoGPS();
    }
}

function iniciarSeguimientoGPS() {
    if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(async (pos) => {
            const coords = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                nombreChofer: localStorage.getItem('userName'),
                numEconomico: document.getElementById('numEconomico').value || "S/N",
                ruta: document.getElementById('rutaCombi').value || "General"
            };

            await fetch(`${API_URL}/combis/update-gps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(coords)
            });
        }, (err) => console.error(err), { enableHighAccuracy: true });
    }
}

function detenerSeguimientoGPS() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}