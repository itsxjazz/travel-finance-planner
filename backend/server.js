require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const tripRoutes = require('./routes/tripRoutes');
const budgetRoutes = require('./routes/budgetRoutes'); 

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/trips', tripRoutes);
app.use('/api/budget', budgetRoutes); 


// Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Conectado ao MongoDB Atlas');
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => console.log(`servidor rodando na porta ${PORT}`));
    })
    .catch((err) => console.error('Erro ao conectar no MongoDB:', err));