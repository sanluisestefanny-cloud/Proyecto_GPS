const API_URL = 'https://proyecto-gps-ynmg.onrender.com/api';
let map;
let rutaActual; 
let marcadoresFlota = {}; 
let watchId = null; 

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

// 4. LOGIN (Ahora recupera la unidad vinculada)
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
            // Guardamos la unidad vinculada al chofer
            if(data.user.unidad) localStorage.setItem('userUnidad', data.user.unidad);
            
            configurarInterfazSegunRol(data.user.rol);
        } else {
            alert(data.msg || "Error en el login");
        }
    } catch (error) {
        alert("Servidor no disponible");
    }
});

// 5. REGISTRO (Envía la unidad si es chofer)
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;
    const unidad = document.getElementById('reg-unidad').value; // Nueva unidad

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, email, password, rol, unidad })
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

function verificarRol(){
    const rol = document.getElementById('reg-rol').value;
    const container = document.getElementById('unidad-input-container');
    container.style.display =( rol === 'chofer') ? 'block' : 'none';
}

// 6. INTERFAZ
async function configurarInterfazSegunRol(rol) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('map-section').style.display = 'block';
    
    const logoutWrapper = document.getElementById('logout-wrapper');
    if (logoutWrapper) logoutWrapper.style.display = 'block';

    initMap();

    document.getElementById('admin-panel').style.display = rol === 'concesionario' ? 'block' : 'none';
    document.getElementById('driver-panel').style.display = rol === 'chofer' ? 'block' : 'none';

    if (rol === 'concesionario' || rol === 'usuario') {
        setInterval(cargarUnidadesEnMapa, 5000); 
    }
}

// 7. CARGAR TODA LA FLOTA
async function cargarUnidadesEnMapa() {
    try {
        const res = await fetch(`${API_URL}/combis/activas`);
        if (res.ok) {
            const unidades = await res.json();
            
            // Limpiar unidades inactivas
            Object.keys(marcadoresFlota).forEach(id => {
                const existe = unidades.find(u => u._id === id);
                if (!existe) {
                    map.removeLayer(marcadoresFlota[id]);
                    delete marcadoresFlota[id];
                }
            });

            unidades.forEach(u => {
                const popupContent = `
                    <div style="text-align: center;">
                        <b style="color: #00796b;">Unidad: ${u.numEconomico}</b><br>
                        <b>Chofer:</b> ${u.nombreChofer}<br>
                        <b>Ruta:</b> ${u.ruta}
                    </div>`;

                if (!marcadoresFlota[u._id]) {
                    marcadoresFlota[u._id] = L.marker([u.lat, u.lng], { icon: combiIcon })
                        .addTo(map).bindPopup(popupContent);
                } else {
                    marcadoresFlota[u._id].setLatLng([u.lat, u.lng]).setPopupContent(popupContent);
                }
            });
        }
    } catch (e) { console.log("Sincronizando..."); }
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([19.313, -98.238], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
}

// 8. RASTREO AUTOMATIZADO (Toma la unidad del perfil)
function toggleStatus() {
    const btn = document.getElementById('btn-status');
    const estaActivo = btn.innerText === "Iniciar Ruta";
    
    if (estaActivo) {
        btn.innerText = "Finalizar Ruta";
        btn.style.background = "#d32f2f";
        iniciarSeguimientoGPS();
    } else {
        btn.innerText = "Iniciar Ruta";
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
                numEconomico: localStorage.getItem('userUnidad') || "S/N", // Automático
                ruta: "Ruta Activa" 
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