const API_URL = 'https://proyecto-gps-ynmg.onrender.com/api';
let map;
let marcadoresFlota = {}; 
let watchId = null;

// Unidades que siempre aparecerán en el mapa
const unidadesSimuladas = [
    { _id: 'sim-1', numEconomico: '05', nombreChofer: 'Simulador 1', ruta: 'Tlaxcala-Apizaco', lat: 19.3133, lng: -98.2394 },
    { _id: 'sim-2', numEconomico: '12', nombreChofer: 'Simulador 2', ruta: 'Apizaco-Teacalco', lat: 19.4125, lng: -98.1408 }
];

const combiIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

// 1. CARGA INICIAL
window.onload = () => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('userRol');
    if (token && rol) {
        configurarInterfazSegunRol(rol);
    }
};

function toggleAuth() {
    const login = document.getElementById('login-container');
    const register = document.getElementById('register-container');
    const isLoginVisible = login.style.display !== 'none';
    login.style.display = isLoginVisible ? 'none' : 'block';
    register.style.display = isLoginVisible ? 'block' : 'none';
}

// 2. MANEJO DE LOGIN
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
            if(data.user.unidad) localStorage.setItem('userUnidad', data.user.unidad);
            
            configurarInterfazSegunRol(data.user.rol);
        } else {
            alert(data.msg || "Error en el login");
        }
    } catch (error) {
        alert("Servidor no disponible");
    }
});

// 3. REGISTRO
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-nombre').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;
    const unidad = document.getElementById('reg-unidad').value;

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

// 4. CONFIGURACIÓN DE INTERFAZ Y REFRESCADO
async function configurarInterfazSegunRol(rol) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('map-section').style.display = 'block';
    
    const logoutWrapper = document.getElementById('logout-wrapper');
    if (logoutWrapper) logoutWrapper.style.display = 'block';

    initMap();

    document.getElementById('admin-panel').style.display = rol === 'concesionario' ? 'block' : 'none';
    document.getElementById('driver-panel').style.display = rol === 'chofer' ? 'block' : 'none';

    // Carga inicial inmediata
    cargarUnidadesEnMapa();
    
    // Refresco constante cada 4 segundos para mayor fluidez
    setInterval(cargarUnidadesEnMapa, 4000); 
}

// 5. LÓGICA MAESTRA DE RENDERIZADO DE FLOTA
async function cargarUnidadesEnMapa() {
    try {
        const res = await fetch(`${API_URL}/combis/activas`);
        let unidadesReales = [];
        if (res.ok) {
            unidadesReales = await res.json();
        }

        // Combinamos las fijas (simuladas) con las que vienen de la base de datos
        const todasLasUnidades = [...unidadesSimuladas, ...unidadesReales];

        todasLasUnidades.forEach(u => {
            const popupContent = `
                <div style="text-align: center;">
                    <b style="color: #00796b;">Unidad: ${u.numEconomico}</b><br>
                    <b>Chofer:</b> ${u.nombreChofer || 'Operador'}<br>
                    <b>Ruta:</b> ${u.ruta || 'En tránsito'}
                </div>`;

            if (!marcadoresFlota[u._id]) {
                // Crear marcador nuevo si no existe
                marcadoresFlota[u._id] = L.marker([u.lat, u.lng], { icon: combiIcon })
                    .addTo(map).bindPopup(popupContent);
                
                // Si es real (ID de MongoDB), lo resaltamos abriendo el popup
                if(!u._id.toString().startsWith('sim')) marcadoresFlota[u._id].openPopup();
            } else {
                // Actualizar posición y contenido
                marcadoresFlota[u._id].setLatLng([u.lat, u.lng]).setPopupContent(popupContent);
            }
        });
    } catch (e) {
        console.log("Sincronizando flota...");
    }
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([19.313, -98.238], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    // Forzar el redibujado del mapa para evitar cuadros grises
    setTimeout(() => { map.invalidateSize(); }, 400);
}

// 6. CONTROL DEL CHOFER
function toggleStatus() {
    const btn = document.getElementById('btn-status');
    const estaActivo = btn.innerText === "Iniciar Ruta";
    
    if (estaActivo) {
        btn.innerText = "Finalizar Ruta";
        btn.style.background = "#d32f2f";
        
        // ENVÍO INMEDIATO AL PRESIONAR EL BOTÓN
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const inicial = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                nombreChofer: localStorage.getItem('userName'),
                numEconomico: localStorage.getItem('userUnidad') || "S/N",
                ruta: "Iniciando Servicio"
            };
            await fetch(`${API_URL}/combis/update-gps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inicial)
            });
            
            // Iniciar rastreo continuo
            iniciarSeguimientoGPS();
        }, (err) => alert("Por favor activa el GPS de tu celular"), { enableHighAccuracy: true });
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
                numEconomico: localStorage.getItem('userUnidad') || "S/N",
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