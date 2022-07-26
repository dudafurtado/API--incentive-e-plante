const knex = require('../services/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const jwt_secret = require('../jwt_secret');
const { fieldsToUser, fieldsToLogin } = require('../validations/requiredFields');

const error = require('../messages/error');
const success = require('../messages/success');

const registerUser = async (req, res) => {
    const { name, email,cep, age, password  } = req.body;

    if (cep.length !== 8) {
        return res.status(400).json(error.cepLengthWrong);
    }

    const validations = fieldsToUser({ name, email, password, cep });
    if (!validations.ok) {
        return res.status(404).json(error.fieldEmpty);
    }

    try {
        const userExists = await knex('users').select('email').where({ email });
        if(userExists.length > 0) {
            return res.status(404).json(error.emailAlreadyBeenUsed);
        }

        const hash = await bcrypt.hash(password, 10);

        const userCreated = await knex('users').insert({ name, email, age, password: hash, cep });
        if(userCreated.length === 0) {
            return res.status(400).json(error.badRequest);
        }

        return res.status(201).json(success.userCreated);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;
    
    const validations = fieldsToLogin({ email, password });
    if (!validations.ok) {
        return res.status(404).json(error.notFound);
    }

    try {
        const userExists = await knex('users').where({ email });
        if(userExists.length === 0) {
            return res.status(404).json(error.emailAlreadyBeenUsed);
        }

        const user = userExists[0];

        const correctPassword = await bcrypt.compare(password, user.password);
        if (!correctPassword) {
            return res.status(404).json(error.loginWrong);
        }

        const token = jwt.sign({ 
            id: user.id 
        }, jwt_secret, 
        { expiresIn: '8h' });

        return res.status(200).json({
            usuarios: {
                id: user.id,
                nome: user.nome,
                email: user.email
            },
            token
        });
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

const updateUser = async (req, res) => {
    const { name, email, password, cep } = req.body;
    
    const validations = fieldsToUser({ name, email, password, cep });
    if (!validations.ok) {
        return res.status(404).json(error.notFound);
    }

    try {
        const userExists = await knex('users').select('email').where({ email });
        if(userExists.length > 0) {
            if (userExists[0].email !== email) {
                return res.status(404).json(error.emailAlreadyBeenUsed);
            }
        }

        const hash = await bcrypt.hash(password, 10);

        const userCreated = await knex('users').insert({ name, email, password: hash, cep });
        if(userCreated.length === 0) {
            return res.status(400).json(error.badRequest);
        }

        return res.status(201).json(success.userUpdated);
    } catch (error) {
        return res.status(400).json(error.message);
    }
}

module.exports = { registerUser, login, updateUser };