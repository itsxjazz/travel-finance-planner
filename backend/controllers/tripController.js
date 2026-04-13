const Trip = require('../models/Trip');

const getTrips = async (req, res, next) => {
    try {
        const trips = await Trip.find({ userId: req.user.id });
        res.json(trips);
    } catch (err) {
        next({ statusCode: 500, payload: { message: err.message } });
    }
};

const createTrip = async (req, res, next) => {
    const trip = new Trip({
        ...req.body,
        userId: req.user.id,
        lastUpdated: new Date()
    });

    try {
        const savedTrip = await trip.save();
        res.status(201).json(savedTrip);
    } catch (err) {
        next({ statusCode: 400, payload: { message: err.message } });
    }
};

const updateTrip = async (req, res, next) => {
    try {
        const updatedTrip = await Trip.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { ...req.body, lastUpdated: new Date() },
            { returnDocument: 'after' }
        );

        if (!updatedTrip) {
            return res.status(404).json({ message: 'Viagem não encontrada ou sem permissão para editar.' });
        }

        res.json(updatedTrip);
    } catch (err) {
        next({ statusCode: 400, payload: { message: err.message } });
    }
};

const deleteTrip = async (req, res, next) => {
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
        next({ statusCode: 500, payload: { message: err.message } });
    }
};

module.exports = {
    getTrips,
    createTrip,
    updateTrip,
    deleteTrip
};
