
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // Ajustamos los nombres para que coincidan con el formulario
    rol: { 
        type: String, 
        enum: ['concesionario', 'chofer', 'usuario'], 
        default: 'usuario' 
    },
    estadoActivo: { type: Boolean, default: false },
    fecha: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);