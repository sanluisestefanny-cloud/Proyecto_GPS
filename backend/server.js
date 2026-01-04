const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARES ---
app.use(cors()); 
app.use(express.json()); 

// --- 2. MODELO DE COMBI ACTUALIZADO ---
// Agregamos 'numEconomico' como clave única para que cada unidad sea independiente
const CombiSchema = new mongoose.Schema({
    numEconomico: { type: String, required: true, unique: true }, // Identificador único de la combi
    ruta: String,
    nombreChofer: String,
    lat: Number,
    lng: Number,
    activo: { type: Boolean, default: true },
    ultimaActualizacion: { type: Date, default: Date.now }
});
const Combi = mongoose.model('Combi', CombiSchema);

// --- 3. RUTAS ---
app.use('/api/auth', require('./routes/auth')); 

// --- 3.1 RUTAS DE RASTREO GPS OPTIMIZADAS ---

// RUTA PARA RECIBIR COORDENADAS (Maneja múltiples unidades automáticamente)
app.post('/api/combis/update-gps', async (req, res) => {
    try {
        const { numEconomico, lat, lng, nombreChofer, ruta } = req.body;

        if (!numEconomico) {
            return res.status(400).json({ msg: "Falta el número económico de la unidad" });
        }

        // Buscamos por numEconomico. Si no existe, lo crea (upsert). Si existe, lo actualiza.
        const unidadActualizada = await Combi.findOneAndUpdate(
            { numEconomico: numEconomico }, 
            { 
                lat, 
                lng, 
                nombreChofer: nombreChofer || "Chofer en turno", 
                ruta: ruta || "Ruta no definida", 
                activo: true, 
                ultimaActualizacion: new Date() 
            },
            { new: true, upsert: true } // Upsert permite que aparezcan unidades nuevas automáticamente
        );

        res.status(200).json({ msg: "Ubicación sincronizada", unidad: unidadActualizada });
    } catch (error) {
        console.error("Error en GPS:", error);
        res.status(500).json({ msg: "Error al procesar GPS" });
    }
});

// RUTA PARA QUE EL DUEÑO VEA TODA LA FLOTA ACTIVA
app.get('/api/combis/activas', async (req, res) => {
    try {
        // Mostramos solo las que han enviado señal en los últimos 5 minutos para que el mapa esté limpio
        const cincoMinutosAgo = new Date(Date.now() - 5 * 60 * 1000);
        const unidades = await Combi.find({ 
            ultimaActualizacion: { $gte: cincoMinutosAgo },
            activo: true 
        });
        res.json(unidades);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener la flota" });
    }
});

app.use('/api/combis', require('./routes/combis')); 

// --- 4. CONEXIÓN A MONGODB ATLAS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Conexión exitosa a MongoDB Atlas'))
    .catch(err => console.error('❌ Error al conectar a la base de datos:', err));

// --- 5. RUTA DE PRUEBA INICIAL ---
app.get('/', (req, res) => {
    res.send('Servidor del Sistema GPS (Flota Multicombi) funcionando 🚀');
});

// --- 6. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});