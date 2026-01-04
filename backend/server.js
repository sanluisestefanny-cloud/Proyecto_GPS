const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARES ---
app.use(cors()); 
app.use(express.json()); 

// --- 2. MODELO DE COMBI ---
// Aseguramos que el esquema coincida exactamente con los datos que envía el script.js
const CombiSchema = new mongoose.Schema({
    numEconomico: { type: String, required: true, unique: true },
    ruta: { type: String, default: "Ruta Activa" },
    nombreChofer: { type: String, default: "Cargando..." },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    activo: { type: Boolean, default: true },
    ultimaActualizacion: { type: Date, default: Date.now }
});
const Combi = mongoose.model('Combi', CombiSchema);

// --- 3. RUTAS DE AUTENTICACIÓN ---
app.use('/api/auth', require('./routes/auth')); 

// --- 4. RUTAS DE RASTREO GPS ---

// ACTUALIZAR POSICIÓN: Esta es la ruta que recibe los datos de tu celular
app.post('/api/combis/update-gps', async (req, res) => {
    try {
        const { numEconomico, lat, lng, nombreChofer, ruta } = req.body;

        if (!numEconomico || lat === undefined || lng === undefined) {
            return res.status(400).json({ msg: "Datos incompletos (Falta unidad o coordenadas)" });
        }

        // Buscamos la unidad. Si no existe la crea (upsert).
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

// OBTENER UNIDADES: El mapa usa esta ruta para dibujar las combis
app.get('/api/combis/activas', async (req, res) => {
    try {
        // Aumentamos a 30 minutos el margen para que la unidad no desaparezca si el GPS falla un momento
        const margenTiempo = new Date(Date.now() - 30 * 60 * 1000); 
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`📡 Servidor listo en puerto ${PORT}`);
});