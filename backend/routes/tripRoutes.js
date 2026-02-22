const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const auth = require('../middleware/auth');

// GET /api/trips - Busca apenas as viagens DO USUÁRIO logado
router.get('/', auth, async (req, res) => {
    try {
        const trips = await Trip.find({ userId: req.user.id });
        res.json(trips);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/trips - Salva a viagem vinculada ao usuário
router.post('/', auth, async (req, res) => {
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

// PUT /api/trips/:id - ATUALIZAÇÃO 
router.put('/:id', auth, async (req, res) => {
    try {
        // Procura pelo ID da viagem e garante que ela pertença ao usuário logado
        const updatedTrip = await Trip.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            req.body,
            { new: true } // Devolve o documento já atualizado
        );

        if (!updatedTrip) {
            return res.status(404).json({ message: 'Viagem não encontrada ou sem permissão para editar.' });
        }

        res.json(updatedTrip);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/trips/:id - Exclui apenas se for o dono
router.delete('/:id', auth, async (req, res) => {
    try {
        const removedTrip = await Trip.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!removedTrip) {
            return res.status(404).json({ message: 'Viagem não encontrada ou sem permissão.' });
        }
        res.json(removedTrip);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;