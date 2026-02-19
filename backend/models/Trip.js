const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    destination: { type: String, required: true },
    countryCode: { type: String }, // Ex: JPY
    flagUrl: { type: String },
    financialGoalLocal: { type: Number, required: true }, // Meta na moeda do país
    financialGoalBrl: { type: Number, required: true }, // Meta convertida para R$
    currentSavingsBrl: { type: Number, default: 0 }, // O que já tem guardado
    monthlyContributionBrl: { type: Number, required: true }, // Aporte mensal
    estimatedTravelDate: { type: Date } // Data calculada pela lógica do front
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);