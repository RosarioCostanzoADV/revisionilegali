# Microservice Architecture – Development Skills

> Questo documento codifica i pattern esatti usati in questo progetto.
> Usalo come istruzione per GitHub Copilot (o come riferimento umano) per creare nuovi microservizi identici a quelli già presenti.

---

## 1. Creare un nuovo microservizio

Eseguire sempre lo scaffolding tramite lo script Python:

```bash
python create_ms.py <nome_servizio>
```

Lo script:
1. Copia la cartella `services/template/` in `services/<nome_servizio>/`
2. Aggiorna `package.json` (`name`, `description`)
3. Stampa lo snippet da aggiungere a `docker/docker-compose.yml`

Dopo lo scaffolding, aggiungere manualmente in `docker/docker-compose.yml` lo snippet stampato, scegliendo porte univoche (vedere sezione §6).

---

## 2. Struttura di ogni microservizio

```
services/<nome>/
  Dockerfile
  index.js
  package.json
  config/
    config.js
  middleware/
    auth.js
  models/
    index.js
    <Entità>.js          ← uno per ogni modello di dominio
  migrations/
    <timestamp>-<descrizione>.js
  controllers/
    <entità>Controller.js
  routes/
    index.js
    <entità>Routes.js
```

---

## 3. Pattern file per file

### 3.1 `index.js` (entry point del servizio)

```js
const express = require('express');
const cors = require('cors');
const db = require('./models');
const routes = require('./routes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger placeholder
app.get('/swagger', (req, res) => {
    res.json({ message: "Swagger documentation will be available here" });
});

app.use('/api', routes);

db.sequelize.sync()
  .then(() => {
    console.log('Database connected and synced successfully.');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
```

> **Variante con `authenticate` + `alter: true`** (usata da `users`):
> Se il servizio ha migrazioni frequenti in sviluppo, sostituire `db.sequelize.sync()` con:
> ```js
> db.sequelize.authenticate()
>   .then(() => db.sequelize.sync({ alter: true }))
>   .then(() => { app.listen(PORT, ...); })
>   .catch(err => { console.error(err); });
> ```

---

### 3.2 `config/config.js`

```js
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || '<nome>_db',
    host: process.env.DB_HOST || '<nome>_db',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || '<nome>_test',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'postgres'
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres'
  }
};
```

---

### 3.3 `middleware/auth.js`

Pattern identico in **tutti** i servizi:

```js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
```

> Il servizio `auth` esporta anche `requireAdmin`:
> ```js
> const requireAdmin = (req, res, next) => {
>   if (req.user?.role !== 'admin') return res.sendStatus(403);
>   next();
> };
> module.exports = { authenticateToken, requireAdmin };
> ```

---

### 3.4 `models/index.js`

Loader automatico — **non modificare mai questo file**, è identico in tutti i servizi:

```js
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => (
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    file.indexOf('.test.js') === -1
  ))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
```

---

### 3.5 `models/<Entità>.js`

Pattern classe Sequelize con `static associate`:

```js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class NomeEntita extends Model {
    static associate(models) {
      // Esempi:
      // NomeEntita.belongsTo(models.Societa, { foreignKey: 'societa_id', as: 'societa' });
      // NomeEntita.hasMany(models.AltroModello, { foreignKey: 'entita_id', as: 'altriModelli' });
    }
  }

  NomeEntita.init({
    campo_stringa: {
      type: DataTypes.STRING,
      allowNull: false
    },
    campo_testo: DataTypes.TEXT,
    societa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'societa', key: 'id' }
    }
  }, {
    sequelize,
    modelName: 'NomeEntita',
    tableName: 'nome_entita_plurale'   // snake_case, plurale
  });

  return NomeEntita;
};
```

> **Regole di naming dei modelli:**
> - `modelName`: PascalCase singolare (es. `Socio`, `Pagamento`, `Modulo`)
> - `tableName`: snake_case plurale (es. `soci`, `pagamenti`, `moduli`)
> - Colonne FK: `<entita>_id` (snake_case)
> - Le associazioni usano sempre `as:` con camelCase plurale o singolare coerente

---

### 3.6 `migrations/<timestamp>-create-<entita>.js`

```js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('nome_tabella', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      campo_stringa: {
        type: Sequelize.STRING
      },
      campo_testo: {
        type: Sequelize.TEXT
      },
      societa_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('nome_tabella');
  }
};
```

> Naming del file: `YYYYMMDDHHMMSS-<verbo>-<entita>.js`  
> Esempi reali: `20260216000000-create-modulo.js`, `20260307000000-add-societa-id-to-moduli.js`

---

### 3.7 `controllers/<entita>Controller.js`

Due varianti usate nel progetto (entrambe accettabili):

**Variante A — object literal export** (usata da `documents`, `payments`):

```js
const { NomeEntita } = require('../models');

module.exports = {
  async getAll(req, res) {
    try {
      const items = await NomeEntita.findAll();
      return res.status(200).json(items);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const item = await NomeEntita.findByPk(req.params.id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async create(req, res) {
    try {
      const item = await NomeEntita.create(req.body);
      return res.status(201).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async update(req, res) {
    try {
      const [updated] = await NomeEntita.update(req.body, { where: { id: req.params.id } });
      if (!updated) return res.status(404).json({ error: 'Not found' });
      const item = await NomeEntita.findByPk(req.params.id);
      return res.status(200).json(item);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await NomeEntita.destroy({ where: { id: req.params.id } });
      if (!deleted) return res.status(404).json({ error: 'Not found' });
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};
```

**Variante B — `exports.<metodo>` inline** (usata da `activities`, `auth`):

```js
const { NomeEntita } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
    try {
        const { societaId } = req.query;
        if (!societaId) return res.status(400).json({ error: 'societaId richiesto' });

        const items = await NomeEntita.findAll({
            where: { societaId },
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const item = await NomeEntita.create(req.body);
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const [updated] = await NomeEntita.update(req.body, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ error: 'Non trovato' });
        const item = await NomeEntita.findByPk(req.params.id);
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.destroy = async (req, res) => {
    try {
        const deleted = await NomeEntita.destroy({ where: { id: req.params.id } });
        if (!deleted) return res.status(404).json({ error: 'Non trovato' });
        res.status(204).end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
```

---

### 3.8 `routes/<entita>Routes.js`

```js
const express = require('express');
const router = express.Router();
const nomeEntitaController = require('../controllers/nomeEntitaController');
const authenticateToken = require('../middleware/auth'); // solo se le route sono protette

// Route base CRUD su /api/<entita-plurale>
router.get('/', nomeEntitaController.getAll);
router.get('/:id', nomeEntitaController.getById);
router.post('/', nomeEntitaController.create);
router.put('/:id', nomeEntitaController.update);
router.delete('/:id', nomeEntitaController.delete);

module.exports = router;
```

---

### 3.9 `routes/index.js`

```js
const express = require('express');
const router = express.Router();
const nomeEntitaRoutes = require('./nomeEntitaRoutes');
// importa altri route file...

// Health check — OBBLIGATORIO in ogni servizio
router.get('/health', (req, res) => {
    res.json({ status: 'OK', service: process.env.SERVICE_NAME || '<nome>-service' });
});

router.use('/<entita-plurali>', nomeEntitaRoutes);
// router.use('/altra-entita', altraRoutes);

module.exports = router;
```

---

### 3.10 `Dockerfile`

Identico per tutti i servizi:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

---

### 3.11 `package.json`

```json
{
  "name": "<nome>-service",
  "version": "1.0.0",
  "description": "Microservice for <nome>",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "echo \"Error: no test specified\" && exit 1",
    "migrate": "sequelize-cli db:migrate"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.37.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.0",
    "sequelize-cli": "^6.6.2"
  }
}
```

> Dipendenze aggiuntive usate da alcuni servizi (aggiungere solo se necessario):
> - `bcryptjs` → hashing password (auth)
> - `multer` → upload file (users)
> - `nodemailer` → invio email (users)

---

## 4. Convenzioni generali

| Aspetto | Convenzione |
|---|---|
| Lingua variabili/funzioni JS | `camelCase` |
| Nomi file controller/route | `<entita>Controller.js` / `<entita>Routes.js` |
| Nome classe modello | PascalCase singolare (`Socio`, `Pagamento`) |
| `tableName` nel modello | snake_case plurale (`soci`, `pagamenti`) |
| Colonne FK | `<entita>_id` |
| Alias associazioni Sequelize | `as: '<camelCase>'` coerente fra modello e query |
| Porta container | sempre `3000` internamente |
| Endpoint health | `GET /api/health` → `{ status: 'OK', service: '...' }` |
| Risposta errore | `{ error: error.message }` o `{ error: 'messaggio human-readable' }` |
| Risposta 204 | usare `.send()` o `.end()` (nessun body) |

---

## 5. Flusso per aggiungere una nuova entità a un servizio esistente

1. **Creare il modello** `models/<Entità>.js` seguendo il pattern §3.5
2. **Creare la migration** `migrations/<timestamp>-create-<entita>.js` seguendo §3.6
3. **Creare il controller** `controllers/<entita>Controller.js` seguendo §3.7
4. **Creare le routes** `routes/<entita>Routes.js` seguendo §3.8
5. **Registrare le routes** in `routes/index.js` aggiungendo `router.use(...)` (§3.9)
6. Eseguire le migrazioni: `npm run migrate`

---

## 6. Porte Docker (assegnazione progressiva)

| Servizio | Host app port | Debug port | DB port |
|---|---|---|---|
| template | 3001 | 9229 | 5432 |
| auth | 3002 | 9230 | 5433 |
| users | 3003 | 9231 | 5434 |
| documents | 3004 | 9232 | 5435 |
| products | 3005 | 9233 | 5436 |
| payments | 3006 | 9234 | 5437 |
| activities | 3007 | 9235 | 5438 |
| **prossimo** | **3008** | **9236** | **5439** |

---

## 7. Snippet Docker Compose per un nuovo servizio

Aggiungere in `docker/docker-compose.yml` (sostituire `<nome>` e porte):

```yaml
  <nome>_ms:
    build: ../services/<nome>
    container_name: <nome>_ms
    environment:
      - PORT=3000
      - DB_HOST=<nome>_db
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DB_NAME=<nome>_db
      - SERVICE_NAME=<nome>-service
    ports:
      - "300X:3000"   # scegliere porta host univoca
      - "92XX:9229"   # scegliere porta debug univoca
    depends_on:
      - <nome>_db
    volumes:
      - ../services/<nome>:/app
      - /app/node_modules
    networks:
      - app_network

  <nome>_db:
    image: postgres:13
    container_name: <nome>_db
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=<nome>_db
    ports:
      - "54XX:5432"   # scegliere porta host univoca
    volumes:
      - <nome>_db_data:/var/lib/postgresql/data
    networks:
      - app_network
```

Aggiungere anche in fondo al file, nella sezione `volumes:`:

```yaml
  <nome>_db_data:
```

---

## 8. Checklist creazione nuovo microservizio

- [ ] `python create_ms.py <nome>` eseguito con successo
- [ ] `config/config.js` — DB name aggiornato (sostituire `template` con `<nome>`)
- [ ] Modelli creati in `models/`
- [ ] Migrations create in `migrations/`
- [ ] Controller(s) creati in `controllers/`
- [ ] Routes create in `routes/`
- [ ] `routes/index.js` aggiornato con le nuove route e l'health check
- [ ] Snippet Docker Compose aggiunto in `docker/docker-compose.yml`
- [ ] Volume aggiunto nella sezione `volumes:` di `docker-compose.yml`
- [ ] Porte univoche scelte (vedere tabella §6)
- [ ] `npm install` eseguito nel container o nella cartella del servizio
