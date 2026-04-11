const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Email já cadastrado.' });
        }
        const user = await User.create({ name, email, password });
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        // Enviar o exato payload que era enviado na rota
        next({ statusCode: 500, payload: { message: 'Erro ao registrar usuário.', error: error.message } });
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }
    } catch (error) {
        next({ statusCode: 500, payload: { message: 'Erro no servidor.', error: error.message } });
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(user);
    } catch (error) {
        next({ statusCode: 500, payload: { message: 'Erro ao buscar perfil.', error: error.message } });
    }
};

const changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        const isMatch = await user.comparePassword(oldPassword);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'A senha atual está incorreta.' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Senha atualizada com sucesso!' });
    } catch (error) {
        next({ statusCode: 500, payload: { message: 'Erro ao atualizar a senha.', error: error.message } });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    changePassword
};
