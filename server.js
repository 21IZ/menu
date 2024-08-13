const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Configuración de Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Configuración de Multer
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Conexión a MongoDB (asegúrate de usar la URL de conexión proporcionada por Railway)
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB', err));

// Definición del modelo (sin cambios)
const menuItemSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  precio: Number,
  imagen: String,
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Rutas
app.get('/api/menu', async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/menu', upload.single('imagen'), async (req, res, next) => {
  try {
    const { nombre, descripcion, precio } = req.body;

    if (!nombre || !descripcion || !precio) {
      return res.status(400).json({ message: 'Nombre, descripción y precio son requeridos' });
    }

    let imagen = '';
    if (req.file) {
      const blob = bucket.file(`${uuidv4()}-${req.file.originalname}`);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      blobStream.on('error', (err) => next(err));

      blobStream.on('finish', async () => {
        imagen = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        const nuevoPlato = new MenuItem({ nombre, descripcion, precio, imagen });
        await nuevoPlato.save();
        res.status(201).json(nuevoPlato);
      });

      blobStream.end(req.file.buffer);
    } else {
      const nuevoPlato = new MenuItem({ nombre, descripcion, precio, imagen });
      await nuevoPlato.save();
      res.status(201).json(nuevoPlato);
    }
  } catch (error) {
    next(error);
  }
});

app.put('/api/menu/:id', upload.single('imagen'), async (req, res, next) => {
  try {
    const { nombre, descripcion, precio } = req.body;
    let imagen = req.body.imagen;

    if (req.file) {
      const blob = bucket.file(`${uuidv4()}-${req.file.originalname}`);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: req.file.mimetype,
        },
      });

      blobStream.on('error', (err) => next(err));

      blobStream.on('finish', async () => {
        imagen = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
        const item = await MenuItem.findByIdAndUpdate(req.params.id, 
          { nombre, descripcion, precio, imagen }, 
          { new: true }
        );
        if (!item) return res.status(404).json({ message: 'Ítem no encontrado' });
        res.json(item);
      });

      blobStream.end(req.file.buffer);
    } else {
      const item = await MenuItem.findByIdAndUpdate(req.params.id, 
        { nombre, descripcion, precio, imagen }, 
        { new: true }
      );
      if (!item) return res.status(404).json({ message: 'Ítem no encontrado' });
      res.json(item);
    }
  } catch (error) {
    next(error);
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    const result = await MenuItem.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Ítem no encontrado' });
    }
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manejador de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});