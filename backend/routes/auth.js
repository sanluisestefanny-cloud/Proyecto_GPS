const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO: Guarda nombre, email, password encriptado y ROL
router.post('/register', async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            nombre,
            email,
            password: hashedPassword,
            rol: rol // 'concesionario', 'chofer' o 'usuario'
        });

        await newUser.save();
        res.status(201).json({ mensaje: "Usuario registrado correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// LOGIN: Verifica credenciales y devuelve el ROL para el Frontend
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: "Usuario no encontrado" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Contraseña incorrecta" });

        const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.json({
            token,
            user: { id: user._id, nombre: user.nombre, rol: user.rol }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;