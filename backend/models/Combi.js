const mongoose = require('mongoose');

const CombiSchema = new mongoose.Schema({
    numEconomico: { type: String, required: true, unique: true },
    ruta: { type: String, default: "Ruta Activa" },
    nombreChofer: { type: String, default: "Cargando..." },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    activo: { type: Boolean, default: true },
    ultimaActualizacion: { type: Date, default: Date.now }
});

// Esta línea evita el error de "OverwriteModelError"
module.exports = mongoose.models.Combi || mongoose.model('Combi', CombiSchema);