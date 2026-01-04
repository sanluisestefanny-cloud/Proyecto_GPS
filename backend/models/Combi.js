const mongoose = require('mongoose');

const CombiSchema = new mongoose.Schema({
    placas: { type: String, required: true, unique: true },
    numeroEconomico: { type: String, required: true },
    ruta: { type: String, required: true },
    modelo: { type: String },
    // El dueño es el usuario que la registró
    dueño: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    fechaRegistro: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Combi', CombiSchema);