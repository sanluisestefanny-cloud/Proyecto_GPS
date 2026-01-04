const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARES ---
app.use(cors()); 
app.use(express.json()); 

// --- 2. MODELO DE COMBI (Directo para asegurar la funcionalidad) ---
// Definimos el esquema aquí para que el servidor sepa qué guardar
const CombiSchema = new mongoose.Schema({
    numEconomico: String,
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

// --- 3.1 NUEVAS RUTAS DE RASTREO GPS ---

// RUTA PARA RECIBIR COORDENADAS DEL CHOFER
app.post('/api/combis/update-gps', async (req, res) => {
    try {
        const { numEconomico, lat, lng, nombreChofer, ruta } = req.body;

        // Actualiza la ubicación si ya existe el número económico, si no, lo crea (upsert)
        const unidadActualizada = await Combi.findOneAndUpdate(
            { numEconomico: numEconomico }, 
            { 
                lat, 
                lng, 
                nombreChofer, 
                ruta, 
                activo: true, 
                ultimaActualizacion: new Date() 
            },
            { new: true, upsert: true }
        );

        res.status(200).json({ msg: "Ubicación actualizada", unidad: unidadActualizada });
    } catch (error) {
        console.error("Error en GPS:", error);
        res.status(500).json({ msg: "Error al procesar GPS" });
    }
});

// RUTA PARA QUE EL DUEÑO VEA UNIDADES ACTIVAS (Últimos 10 minutos)
app.get('/api/combis/activas', async (req, res) => {
    try {
        const diezMinutosAgo = new Date(Date.now() - 10 * 60 * 1000);
        const unidades = await Combi.find({ 
            ultimaActualizacion: { $gte: diezMinutosAgo },
            activo: true 
        });
        res.json(unidades);
    } catch (error) {
        res.status(500).json({ msg: "Error al obtener unidades" });
    }
});

// Ruta original para otras funciones de combis
app.use('/api/combis', require('./routes/combis')); 

// --- 4. CONEXIÓN A MONGODB ATLAS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(' Conexión exitosa a MongoDB Atlas'))
    .catch(err => console.error(' Error al conectar a la base de datos:', err));

// --- 5. RUTA DE PRUEBA INICIAL ---
app.get('/', (req, res) => {
    res.send('Servidor del Sistema GPS funcionando correctamente ');
});

// --- 6. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Servidor corriendo en el puerto ${PORT}`);
});