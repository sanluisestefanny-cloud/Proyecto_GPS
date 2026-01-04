// Borra la línea de localhost y pon esta:
const API_URL = 'https://proyecto-gps-ynmg.onrender.com/api';
let map;
let rutaActual; 
let marcadoresFlota = {}; // Objeto para controlar múltiples combis en el mapa

// 1. CONFIGURACIÓN DE ICONO Y RUTAS MAESTRAS
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

// 2. PERSISTENCIA Y CARGA INICIAL
window.onload = () => {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('userRol');
    if (token && rol) {
        configurarInterfazSegunRol(rol);
    }
};

// 3. FUNCIONES DE NAVEGACIÓN
function toggleAuth() {
    const login = document.getElementById('login-container');
    const register = document.getElementById('register-container');
    const isLoginVisible = login.style.display !== 'none';
    login.style.display = isLoginVisible ? 'none' : 'block';
    register.style.display = isLoginVisible ? 'block' : 'none';
}

// 4. MANEJO DE LOGIN
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
            configurarInterfazSegunRol(data.user.rol);
        } else {
            alert(data.msg || "Error en el login");
        }
    } catch (error) {
        alert("Servidor no disponible");
    }
});

// 5. MANEJO DE REGISTRO
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
            alert("✅ Registro exitoso. Iniciando sesión...");
            toggleAuth();
        } else {
            const data = await res.json();
            alert("❌ Error: " + data.error);
        }
    } catch (error) {
        alert("Error de conexión");
    }
});

// 6. CONFIGURACIÓN DE LA INTERFAZ Y VISTA DE DUEÑO
async function configurarInterfazSegunRol(rol) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('map-section').style.display = 'block';
    initMap();

    document.getElementById('admin-panel').style.display = rol === 'concesionario' ? 'block' : 'none';
    document.getElementById('driver-panel').style.display = rol === 'chofer' ? 'block' : 'none';

    // Si es Dueño o Usuario, cargamos las unidades activas para que las vean en el mapa
    if (rol === 'concesionario' || rol === 'usuario') {
        cargarUnidadesEnMapa();
    }
}

// Nueva función para mostrar todas las combis activas al Dueño y Usuario
async function cargarUnidadesEnMapa() {
    try {
        const res = await fetch(`${API_URL}/combis/activas`); // Ruta que deberás tener en tu backend
        if (res.ok) {
            const unidades = await res.json();
            unidades.forEach(u => {
                if (!marcadoresFlota[u._id]) {
                    marcadoresFlota[u._id] = L.marker([u.lat, u.lng], { icon: combiIcon }).addTo(map)
                        .bindPopup(`<b>Unidad: ${u.numEconomico}</b><br>Ruta: ${u.ruta}`);
                } else {
                    marcadoresFlota[u._id].setLatLng([u.lat, u.lng]); // Actualiza posición si ya existe
                }
            });
        }
    } catch (e) { console.log("Cargando unidades..."); }
}

function initMap() {
    if (!map) {
        map = L.map('map').setView([19.313, -98.238], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }
    setTimeout(() => { map.invalidateSize(); }, 200);
}

// 7. REGISTRO DE UNIDAD E ITINERARIO (IDA Y VUELTA)
document.getElementById('combi-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const economico = document.getElementById('numEconomico').value;
    const entrada = document.getElementById('rutaCombi').value.toLowerCase().trim();
    
    let puntosFinales = null;
    const claveIda = entrada.replace(/\s+/g, '-');
    const claveVuelta = entrada.split(/\s+/).reverse().join('-');

    if (rutasMaestras[claveIda]) {
        puntosFinales = rutasMaestras[claveIda];
    } else if (rutasMaestras[claveVuelta]) {
        puntosFinales = [...rutasMaestras[claveVuelta]].reverse();
    }

    if (puntosFinales) {
        if (rutaActual) map.removeLayer(rutaActual); 
        
        rutaActual = L.polyline(puntosFinales, { color: '#00796b', weight: 5, opacity: 0.7 }).addTo(map);
        
        const m = L.marker(puntosFinales[0], { icon: combiIcon }).addTo(map)
            .bindPopup(`<b>Unidad: ${economico}</b><br>Ruta: ${entrada.toUpperCase()}`)
            .openPopup();
            
        map.fitBounds(rutaActual.getBounds(), { padding: [50, 50] });
    } else {
        alert("Ruta no definida. Intenta 'Apizaco Teacalco' o 'Teacalco Apizaco'");
    }
});

// 8. CERRAR SESIÓN
function logout() {
    localStorage.clear();
    location.reload();
}

// 9. ESTADO CHOFER
function toggleStatus() {
    const btn = document.getElementById('btn-status');
    const statusText = document.getElementById('status-text');
    const estaActivo = btn.innerText === "Iniciar Ruta";
    
    btn.innerText = estaActivo ? "Finalizar Ruta" : "Iniciar Ruta";
    statusText.innerText = estaActivo ? "Activo - En Ruta" : "Fuera de Servicio";
    btn.style.background = estaActivo ? "#d32f2f" : "#00796b";
}