const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. MIDDLEWARES ---
// CORS permite que tu página web (frontend) hable con el servidor (backend)
app.use(cors()); 
// Permite que el servidor entienda la información que envías en formato JSON
app.use(express.json()); 

// --- 2. RUTAS ---
// Ruta para el manejo de usuarios (Login y Registro)
app.use('/api/auth', require('./routes/auth')); 
// Ruta para el manejo de las combis (CRUD completo)
app.use('/api/combis', require('./routes/combis')); 

// --- 3. CONEXIÓN A MONGODB ATLAS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(' Conexión exitosa a MongoDB Atlas'))
    .catch(err => console.error(' Error al conectar a la base de datos:', err));

// --- 4. RUTA DE PRUEBA INICIAL ---
app.get('/', (req, res) => {
    res.send('Servidor del Sistema GPS funcionando correctamente ');
});

// --- 5. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(` Servidor corriendo en http://localhost:${PORT}`);
});