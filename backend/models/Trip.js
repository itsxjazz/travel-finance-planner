const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    countryCode: { type: String }, // Ex: JPY
    flagUrl: { type: String },
    financialGoalLocal: { type: Number, required: true }, // Meta na moeda do país
    financialGoalBrl: { type: Number, required: true }, // Meta convertida para R$
    currentSavingsBrl: { type: Number, default: 0 }, // O que já tem guardado
    monthlyContributionBrl: { type: Number, required: true }, // Aporte mensal
    estimatedTravelDate: { type: Date }, // Data calculada pela lógica do front,
    itinerary: { type: Array, default: [] }, // Lista de atrações planejadas
    budgetResult: { type: Object, default: null }, // Resultado detalhado do orçamento
    budgetPreferences: { type: Object, default: null } // Preferências usadas para gerar o orçamento

}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);