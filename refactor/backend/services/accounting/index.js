const express = require('express');
const cors = require('cors');
const db = require('./models');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
// Limite alzato rispetto al default (100kb): la carta di lavoro modificata manualmente
// è HTML completo (tabelle, note) e può superarlo facilmente.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rende i modelli Sequelize disponibili nei controller via req.app.locals.db
app.locals.db = db;

// Swagger placeholder
app.get('/swagger', (req, res) => {
    res.json({ message: 'Swagger documentation will be available here' });
});

app.use('/api', routes);

db.sequelize.authenticate()
    .then(() => db.sequelize.sync({ alter: true }))
    .then(() => {
        console.log('Database connected and synced successfully.');
        app.listen(PORT, () => {
            console.log(`${process.env.SERVICE_NAME || 'accounting-service'} running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        process.exit(1);
    });
