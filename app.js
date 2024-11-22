const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Book = require('./models/Book');
const mongoURI = "mongodb://localhost:27017/librarytest"; // Remplacez-le par votre URI MongoDB

// Création de l'application Express
const app = express();

// Connexion à MongoDB avec Mongoose
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Database connected");
    app.listen(8080);
  })
  .catch(err => console.log(err));

// Configuration de Multer-GridFS
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    if (file.mimetype === 'application/pdf') {
      return {
        bucketName: 'uploads',  // Nom du bucket GridFS
        filename: `book_${Date.now()}.pdf`
      };
    }
    return null;
  }
});

const upload = multer({ storage });

// Configuration EJS
app.set('view engine', 'ejs');

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.redirect('/books');
});

// Afficher tous les livres
app.get('/books', (req, res) => {
  Book.find().sort({ createdAt: -1 })
    .then(result => res.render('books', { books: result, Title: 'All Books' }))
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

    // Nettoyer les données : supprimer les champs vides
    for (const key in bookData) {
      if (bookData[key] === "" || bookData[key] == null) {
        delete bookData[key];
      }
    }

    // Ajouter l'ID du fichier PDF si un fichier a été téléchargé
    if (req.file) {
      bookData.pdfBook = req.file.id;
    }

    // Création du livre dans la base de données
    const newBook = new Book(bookData);
    await newBook.save();

    console.log('Book added successfully:', newBook);
    res.redirect('/books');
  } catch (err) {
    console.error('Error adding book:', err);
    res.status(500).send("Error saving book.");
  }
});

// Détails d'un livre
app.get('/books/:id', (req, res) => {
  const id = req.params.id;
  Book.findById(id)
    .then(result => res.render('detailsBook', { book: result, title: 'Book Details' }))
    .catch(err => res.status(404).render('404', { title: 'Book Not Found' }));
});

// Télécharger un fichier PDF depuis GridFS
app.get('/books/download/:id', (req, res) => {
  const bookId = req.params.id;

  // Chercher le livre dans la base de données
  Book.findById(bookId)
    .then(book => {
      if (book && book.pdfBook) {
        // Récupérer l'objet GridFS du fichier correspondant
        mongoose.connection.db.collection('uploads.files').findOne({ _id: mongoose.Types.ObjectId(book.pdfBook) }, (err, file) => {
          if (!file || file.length === 0) {
            return res.status(404).json({ err: 'No file exists' });
          }

          // Vérifier que le fichier est bien un PDF
          if (file.contentType === 'application/pdf') {
            // Créer un stream pour lire le fichier depuis GridFS
            const gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
            const downloadStream = gridfsBucket.openDownloadStream(file._id);
            
            // Définir les en-têtes de la réponse HTTP
            res.set('Content-Type', 'application/pdf');
            res.set('Content-Disposition', 'attachment; filename=' + file.filename);
            
            // Utiliser pipe pour transmettre le fichier en morceaux (chunks) au client
            downloadStream.pipe(res).on('error', (err) => {
              console.log('Erreur lors du téléchargement du fichier', err);
              res.status(500).json({ err: 'Erreur lors du téléchargement du fichier' });
            });
          } else {
            res.status(404).json({ err: 'Ce fichier n\'est pas un PDF' });
          }
        });
      } else {
        res.status(404).json({ err: 'Livre non trouvé ou aucun PDF associé' });
      }
    })
    .catch(err => {
      res.status(500).json({ err: 'Erreur lors de la récupération des détails du livre' });
    });
});

app.post('/books/delete/:id', (req, res) => {
  const id = req.params.id;
  Book.findByIdAndDelete(id)
    .then(result => {
      res.redirect('/books');
    })
    .catch(err => {
      console.log(err);
    });
});

// Page 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


async function importManuscripts() {
  try {
    // Transformer les données
    const data = JSON.parse(fs.readFileSync('./data/corpus_sans_arabe.json', 'utf8'));
    const manuscripts = Object.entries(data).map(([url, details]) => ({
      url,
      ...details
    }));

    // Insérer dans la base MongoDB
    const result = await Book.insertMany(manuscripts);
    console.log(`${result.length} manuscrits ont été importés avec succès !`);
  } catch (error) {
    console.error('Erreur lors de l\'importation :', error);
  } finally {
    mongoose.connection.close();
  }
}

// Exécuter l'importation
importManuscripts();

