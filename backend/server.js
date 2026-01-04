const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- 1. IMPORTACIÓN DEL MODELO (Paso 2 de limpieza) ---
// Importamos el modelo desde su archivo independiente para evitar duplicados
const Combi = require('./models/Combi');

const app = express();

// --- 2. MIDDLEWARES ---
app.use(cors()); 
app.use(express.json()); 

// --- 3. RUTAS DE AUTENTICACIÓN ---
app.use('/api/auth', require('./routes/auth')); 

// --- 4. RUTAS DE RASTREO GPS ---

// ACTUALIZAR POSICIÓN: Recibe datos del celular y los guarda en Atlas
app.post('/api/combis/update-gps', async (req, res) => {
    try {
        const { numEconomico, lat, lng, nombreChofer, ruta } = req.body;

        if (!numEconomico || lat === undefined || lng === undefined) {
            return res.status(400).json({ msg: "Datos incompletos (Falta unidad o coordenadas)" });
        }

        // Usamos el modelo importado para actualizar o crear (upsert)
        const unidadActualizada = await Combi.findOneAndUpdate(
            { numEconomico: numEconomico }, 
            { 
                lat, 
                lng, 
                nombreChofer: nombreChofer || "Chofer", 
                ruta: ruta || "En trayecto", 
                activo: true, 
                ultimaActualizacion: new Date() 
            },
            { new: true, upsert: true } 
        );

        console.log(`✅ Unidad ${numEconomico} actualizada en Atlas`);
        res.status(200).json(unidadActualizada);
    } catch (error) {
        console.error("❌ Error en update-gps:", error);
        res.status(500).json({ msg: "Error al procesar ubicación" });
    }
});

// OBTENER UNIDADES: El mapa consulta esta ruta para dibujar los marcadores
app.get('/api/combis/activas', async (req, res) => {
    try {
        // Margen de 30 minutos para mantener la visibilidad en el mapa
        const margenTiempo = new Date(Date.now() - 120 * 60 * 1000); 
        const unidades = await Combi.find({ 
            ultimaActualizacion: { $gte: margenTiempo },
            activo: true 
        });
        res.json(unidades);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener unidades" });
    }
});

app.use('/api/combis', require('./routes/combis')); 

// --- 5. CONEXIÓN A MONGODB ATLAS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🚀 Conectado a MongoDB Atlas: GPS_Proyecto'))
    .catch(err => console.error('❌ Error de conexión:', err));

// --- 6. RUTA DE PRUEBA ---
app.get('/', (req, res) => {
    res.send('Servidor GPS Activo y Sincronizado 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Servidor listo en puerto ${PORT}`);
});