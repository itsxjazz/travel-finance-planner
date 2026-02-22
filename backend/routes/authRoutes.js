const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Função para gerar o JWT (Crachá de Acesso)
const generateToken = (id) => {
    // Se o process.env.JWT_SECRET não existir, o servidor vai falhar 
    if (!process.env.JWT_SECRET) {
        throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
    }

    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// --- ROTA DE REGISTRO ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Verifica se o usuário já existe
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email já cadastrado.' });
        }

        // Cria o usuário
        const user = await User.create({ name, email, password });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao registrar usuário.', error: error.message });
    }
});

// --- ROTA DE LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Busca o usuário pelo email
        const user = await User.findOne({ email });

        // Verifica se o usuário existe e se a senha bate (usando o método do User.js)
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor.', error: error.message });
    }
});

// --- ROTA DE PERFIL (GET) ---
// Retorna os dados do usuário logado (protegido pelo middleware auth)
router.get('/profile', auth, async (req, res) => {
    try {
        // O select('-password') garante que a senha não seja enviada de volta por segurança
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar perfil.', error: error.message });
    }
});

// --- ROTA DE TROCAR SENHA (PUT) ---
router.put('/change-password', auth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        // 1. Busca o usuário no banco, incluindo a senha para poder comparar
        const user = await User.findById(req.user.id);

        // 2. Usa o método do modelo para verificar a senha antiga
        const isMatch = await user.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'A senha atual está incorreta.' });
        }

        // 3. Atualiza a senha
        user.password = newPassword;
        await user.save();

        res.json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar a senha.', error: error.message });
    }
});

module.exports = router;