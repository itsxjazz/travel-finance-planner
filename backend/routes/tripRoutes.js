const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

// GET /api/trips - Busca apenas as viagens DO USUÁRIO logado
router.get('/', auth, async (req, res) => {
    try {
        // Filtra pelo userId que o middleware extraiu do token
        const trips = await Trip.find({ userId: req.user.id });
        res.json(trips);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/trips - Salva a viagem vinculando ao ID do usuário
router.post('/', auth, async (req, res) => {
    // Espalha o corpo da requisição e força o userId do dono do token
    const trip = new Trip({
        ...req.body,
        userId: req.user.id
    });

    try {
        const savedTrip = await trip.save();
        res.status(201).json(savedTrip);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE e PUT também precisam do middleware 'auth' para segurança
router.delete('/:id', auth, async (req, res) => {
    try {
        // Garante que o usuário só delete o que é dele
        const removedTrip = await Trip.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!removedTrip) return res.status(404).json({ message: 'Viagem não encontrada ou sem permissão.' });
        res.json(removedTrip);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;