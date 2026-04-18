require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const tripRoutes = require('./routes/tripRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const authRoutes = require('./routes/authRoutes');
const localsRoutes = require('./routes/localsRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const flightRoutes = require('./routes/flightRoutes');

const app = express();

app.set('trust proxy', 1);

// Middlewares
app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'x-auth-token'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// Rotas
app.use('/api/trips', tripRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/currency', currencyRoutes);
app.use('/api/locals', localsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/flights', flightRoutes);

const errorHandler = require('./middleware/errorHandler');

// Middleware Global de Tratamento de Erros Profissional (Fallbacks Gerais)
app.use(errorHandler);

// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Conectado ao MongoDB Atlas');
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));
    })
    .catch((err) => console.error('Erro ao conectar no MongoDB:', err));