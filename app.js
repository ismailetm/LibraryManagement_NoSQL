const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const fs = require('fs');
const Book = require('./models/Book');

const mongoURI = "mongodb://localhost:27017/librarytest";

// Initialisation de l'application Express
const app = express();
let gridfsBucket;

// Configuration des middlewares
app.set('view engine', 'ejs'); // Vue EJS
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Connexion à MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })//évite que tout s'écroule si changement de topologie
  .then(() => {
    console.log("Connexion réussie à MongoDB");
    app.listen(8080);
    
    // Initialisation de GridFS
    gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });

    // Lancer l'importation des manuscrits
    importManuscripts();
  })
  .catch(err => {
    console.error("Erreur de connexion à MongoDB :", err);
  });

// Gestion des événements MongoDB
mongoose.connection.on('connected', () => {
  console.log("MongoDB est connecté !");
});

mongoose.connection.on('error', (err) => {
  console.error("Erreur MongoDB :", err);
});

mongoose.connection.on('disconnected', () => {
  console.log("MongoDB est déconnecté !");
});

// Configuration de Multer pour GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    if (file.mimetype === 'application/pdf') {
      return {
        bucketName: 'uploads',
        filename: `book_${Date.now()}.pdf`
      };
    }
    return null;
  }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => res.redirect('/books'));

// Afficher tous les livres
app.get('/books', (req, res) => {
  Book.find().sort({ createdAt: -1 })
    .then(books => res.render('books', { books, title: 'All Books' }))
    .catch(err => console.log(err));
});

// Formulaire pour ajouter un livre
app.get('/books/create', (req, res) => {
  res.render('addbook', { title: 'Add Book' });
});

// Ajouter un livre avec un fichier PDF
app.post('/books/create', upload.single('pdfFile'), async (req, res) => {
  try {
    const bookData = req.body;

    // Nettoyage des données vides
    Object.keys(bookData).forEach(key => {
      if (!bookData[key]) delete bookData[key];
    });

    // Ajout du fichier PDF, si présent
    if (req.file) {
      bookData.pdfBook = req.file.id;
    }

    const newBook = new Book(bookData);
    await newBook.save();
    console.log('Livre ajouté avec succès :', newBook);
    res.redirect('/books');
  } catch (err) {
    console.error('Erreur lors de l\'ajout du livre :', err);
    res.status(500).send('Erreur lors de l\'ajout du livre.');
  }
});

// Détails d'un livre
app.get('/books/:id', (req, res) => {
  Book.findById(req.params.id)
    .then(book => res.render('detailsBook', { book, title: 'Book Details' }))
    .catch(err => res.status(404).render('404', { title: 'Book Not Found' }));
});

// Télécharger un fichier PDF
app.get('/books/download/:id', (req, res) => {
  Book.findById(req.params.id)
    .then(book => {
      if (book && book.pdfBook) {
        mongoose.connection.db.collection('uploads.files')
          .findOne({ _id: mongoose.Types.ObjectId(book.pdfBook) }, (err, file) => {
            if (!file || file.length === 0) {
              return res.status(404).json({ err: 'Fichier non trouvé' });
            }

            if (file.contentType === 'application/pdf') {
              const downloadStream = gridfsBucket.openDownloadStream(file._id);
              res.set('Content-Type', 'application/pdf');
              res.set('Content-Disposition', `attachment; filename=${file.filename}`);
              downloadStream.pipe(res).on('error', err => {
                console.error('Erreur pendant le téléchargement du fichier', err);
                res.status(500).json({ err: 'Erreur pendant le téléchargement' });
              });
            } else {
              res.status(400).json({ err: 'Le fichier n\'est pas un PDF' });
            }
          });
      } else {
        res.status(404).json({ err: 'Livre ou PDF non trouvé' });
      }
    })
    .catch(err => res.status(500).json({ err: 'Erreur serveur' }));
});

// Supprimer un livre
app.post('/books/delete/:id', (req, res) => {
  Book.findByIdAndDelete(req.params.id)
    .then(() => res.redirect('/books'))
    .catch(err => console.log(err));
});

// Page 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

// Fonction d'importation des manuscrits
async function importManuscripts() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB non connecté. Importation annulée.");
      return;
    }

    const data = JSON.parse(fs.readFileSync('./data/corpus_sans_arabe.json', 'utf8'));
    const manuscripts = Object.entries(data).map(([url, details]) => ({ url, ...details }));

    const result = await Book.insertMany(manuscripts);
    console.log(`${result.length} manuscrits importés avec succès !`);
  } catch (err) {
    console.error('Erreur lors de l\'importation des manuscrits :', err);
  }
}

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré : http://localhost:${PORT}`);
});