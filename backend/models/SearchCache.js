const mongoose = require('mongoose');

const SearchCacheSchema = new mongoose.Schema({
    cacheKey: {
        type: String,
        required: true,
        unique: true
    },
    origin: {
        type: String
    },
    destination: {
        type: String
    },
    departureDate: {
        type: String
    },
    returnDate: {
        type: String
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // 24 hours em segundos
    }
});

module.exports = mongoose.model('SearchCache', SearchCacheSchema);
