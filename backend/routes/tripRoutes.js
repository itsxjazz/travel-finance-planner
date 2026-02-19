const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');

// GET /api/trips - Buscar todos os planejamentos
router.get('/', async (req, res) => {
    try {
        const trips = await Trip.find();
        res.json(trips);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/trips - Salvar um novo planejamento
router.post('/', async (req, res) => {
    const trip = new Trip(req.body);
    try {
        const savedTrip = await trip.save();
        res.status(201).json(savedTrip);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE /api/trips/:id - Excluir um planejamento
router.delete('/:id', async (req, res) => {
    try {
        const removedTrip = await Trip.findByIdAndDelete(req.params.id);
        res.json(removedTrip);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;