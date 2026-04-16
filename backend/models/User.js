const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

// "Gatilho" de Segurança Moderno (Sem o 'next')
UserSchema.pre('save', async function () {
    // Se a senha não foi modificada, encerra a função e segue normalmente
    if (!this.isModified('password')) return;

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Método auxiliar para comparar senhas no momento do login
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);