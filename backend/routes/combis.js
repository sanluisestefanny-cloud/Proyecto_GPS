const express = require('express');
const router = express.Router();
const Combi = require('../models/Combi');

// 1. CREAR: Registrar una nueva combi
router.post('/add', async (req, res) => {
    try {
        const nuevaCombi = new Combi(req.body);
        await nuevaCombi.save();
        res.status(201).json({ mensaje: "Combi registrada con éxito", nuevaCombi });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 2. LEER: Obtener todas las combis
router.get('/', async (req, res) => {
    try {
        const combis = await Combi.find();
        res.json(combis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. ACTUALIZAR: Modificar datos de una combi específica por su ID
router.put('/:id', async (req, res) => {
    try {
        const combiActualizada = await Combi.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({ mensaje: "Combi actualizada con éxito", combiActualizada });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// 4. ELIMINAR: Borrar una combi por su ID
router.delete('/:id', async (req, res) => {
    try {
        await Combi.findByIdAndDelete(req.params.id);
        res.json({ mensaje: "Combi eliminada del sistema" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;