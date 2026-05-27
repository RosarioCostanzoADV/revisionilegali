'use strict';
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3008;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.listen(PORT, () => {
    console.log(process.env.SERVICE_NAME || 'ai-service', 'running on port', PORT);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});
