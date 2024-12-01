const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const Book = require('./models/Book');
const User = require('./models/user');

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

//users i.e index route
app.get('/users',(req,res)=>{
  console.log("req made on"+req.url);
   User.find().sort({createdAt:-1})//it will find all data and show it in descending order
    .then(result => { 
      res.render('index', { users: result ,title: 'Home' }); //it will then render index page along with users
    })
    .catch(err => {
      console.log(err);
    });
})


//route for user create
app.get('/user/create',(req,res)=>{
  console.log("GET req made on"+req.url);
  res.render('adduser',{title:'Add-User'});
})


//route for users/withvar
app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  User.findById(id)
    .then(result => {
      res.render('details', { user: result, action:'edit',title: 'User Details' });
    })
    .catch(err => {
      console.log(err);
    });
});

//route for edit/name/action variable that will display current value to input field
app.get('/edit/:name/:action',(req,res)=>{
  const name = req.params.name;
  console.log("req made on"+req.url);
  User.findOne({name:name})
    .then(result => {
      res.render('edit', { user: result ,title: 'Edit-User' });
    })
    .catch(err => {
      console.log(err);
    });
})


// Route pour créer un utilisateur
app.post('/user/create', (req, res) => {
  console.log("POST req made on " + req.url);
  console.log("Form submitted to server");

  // Nettoyer les données : supprimer les champs vides ou non définis
  const userData = {};
  for (const key in req.body) {
    if (req.body[key]) { // Vérifie que la valeur n'est ni vide ni undefined
      userData[key] = req.body[key];
    }
  }

  // Créer un nouvel utilisateur avec les données nettoyées
  const user = new User(userData);

  user.save() // Enregistrer l'utilisateur dans la base de données
    .then(result => {
      res.redirect('/users'); // Si réussi, rediriger vers la liste des utilisateurs
    })
    .catch(err => {
      console.log(err); // Si une erreur se produit, afficher l'erreur dans la console
    });
});

// Route pour mettre à jour les données d'un utilisateur
app.post('/edit/:id', (req, res) => {
  console.log("POST req made on " + req.url);

  // Nettoyer les données soumises par le formulaire : supprimer les champs vides ou non définis
  const updatedData = {};
  for (const key in req.body) {
    if (req.body[key]) { // Vérifie que la valeur n'est ni vide ni undefined
      updatedData[key] = req.body[key];
    }
  }

  // Mettre à jour l'utilisateur dans la base de données
  User.updateOne({ _id: req.params.id }, updatedData)
    .then(result => {
      if (result.matchedCount === 0) {
        return res.status(404).send("User not found");
      }
      res.redirect('/users'); // Si la mise à jour est réussie, rediriger vers la liste des utilisateurs
      console.log("User profile updated");
    })
    .catch(err => {
      console.log(err); // Si une erreur se produit, afficher l'erreur dans la console
    });
});

//routes for deleting users by getting users name from url then finding that  users then doing delete
app.post('/users/:name',(req,res)=>{ //form action of details.ejs pass name of user that later is assume as name
  const name = req.params.name;
  console.log(name);
  User.deleteOne({name:name})
  .then(result => {
    res.redirect('/users');
  })
  .catch(err => {
    console.log(err);
  });
})

// Afficher tous les livres
/**app.get('/books', (req, res) => {
  Book.find().sort({ createdAt: -1 })
    .then(result => res.render('books', { books: result, title: 'All Books' }))
    .catch(err => console.log(err));
});
*/

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
    .then(result => {
      res.render('detailsBook', { book: result, title: 'Book Details' });
    })
    .catch(err => {
      console.log(err);
      res.status(404).render('404', { title: 'Book Not Found' });
    });
});

// Route pour afficher le formulaire d'édition d'un livre
app.get('/books/edit/:id', (req, res) => {
  const id = req.params.id;
  console.log("Request made on " + req.url);

  // Trouver le livre par ID
  Book.findById(id)
    .then(result => {
      if (!result) {
        return res.status(404).render('404', { title: 'Book Not Found' });
      }

      // Nettoyer les données pour exclure les champs vides ou nuls
      const cleanedBook = {};
      for (const key in result.toObject()) {
        if (result[key] !== "" && result[key] !== null && result[key] !== undefined) {
          cleanedBook[key] = result[key];
        }
      }

      res.render('editBook', { book: cleanedBook, title: 'Edit Book' });
    })
    .catch(err => {
      console.error(err);
      res.status(500).render('404', { title: 'Book Not Found' });
    });
});

// Route pour soumettre les modifications du livre
app.post('/books/edit/:id', (req, res) => {
  console.log("POST request made on " + req.url);

  // Nettoyer les données soumises par le formulaire
  const updatedData = {};
  for (const key in req.body) {
    if (req.body[key] !== "" && req.body[key] !== null && req.body[key] !== undefined) {
      updatedData[key] = req.body[key];
    }
  }

  // Mettre à jour le livre dans la base de données
  Book.updateOne({ _id: req.params.id }, updatedData)
    .then(result => {
      if (result.matchedCount === 0) {
        return res.status(404).send("Book not found");
      }
      res.redirect(`/books/${req.params.id}`); // Rediriger vers la page des détails du livre
      console.log("Book profile updated");
    })
    .catch(err => {
      console.error(err);
      res.status(500).send("Error updating book");
    });
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

// new edit
app.post('/books/:id/review', async (req, res) => {
  const { email, password, comment, rating } = req.body;

  try {
    // Vérifier l'utilisateur dans la base de données
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(401).send('Invalid email or password');
    }

    // Ajouter l'avis au livre
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { $push: { reviews: { user: email, comment, rating } } }, // Utiliser l'email comme identifiant utilisateur
      { new: true }
    );

    // Incrémenter le compteur de reviews de l'utilisateur
    user.reviewCount = (user.reviewCount || 0) + 1;
    await user.save();

    res.redirect(`/books/${req.params.id}`);
  } catch (err) {
    console.error('Erreur lors de l\'ajout de l\'avis:', err);
    res.status(500).send('Erreur interne');
  }
});

app.get('/books/:id/rating', async (req, res) => {
  const bookId = req.params.id;

  try {
    // Calcul de la moyenne des reviews
    const book = await Book.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(bookId) } }, // Filtrer par ID du livre
      { $unwind: "$reviews" }, // Diviser le tableau de reviews en documents individuels
      {
        $group: {
          _id: "$_id",
          averageRating: { $avg: "$reviews.rating" } // Calculer la moyenne des notes
        }
      }
    ]);

    // Vérifier si le livre a des reviews
    const averageRating = book.length > 0 ? book[0].averageRating : null;

    res.json({ averageRating: averageRating ? averageRating.toFixed(2) : "No reviews yet" }); // Retourner la moyenne
  } catch (err) {
    console.error('Erreur lors du calcul de la moyenne:', err);
    res.status(500).json({ error: "Erreur interne" });
  }
});

app.get('/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('userProfile', {
      user,
      title: `${user.email}'s Profile`
    });
  } catch (err) {
    console.error('Erreur lors de la récupération du profil utilisateur:', err);
    res.status(500).send('Erreur interne');
  }
});


app.get('/books', async (req, res) => {
  const { keyword = '', genre = '', sort = '' } = req.query; // Assurez des valeurs par défaut

  // Construire le filtre de recherche
  let filter = {};
  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { author: { $regex: keyword, $options: 'i' } }
    ];
  }
  if (genre) {
    filter.genre = genre;
  }

  // Déterminer l'ordre de tri
  let sortOption = {};
  if (sort === 'year_asc') {
    sortOption.publishedYear = 1;
  } else if (sort === 'year_desc') {
    sortOption.publishedYear = -1;
  }

  try {
    const books = await Book.find(filter).sort(sortOption);
    res.render('books', { books, title: 'Filtered Books', keyword, genre, sort });
  } catch (err) {
    console.error('Erreur lors du filtrage/tri des livres:', err);
    res.status(500).send('Erreur interne');
  }
});

/// Aggregation
app.get("/aggregations", async (req, res) => {
  try {
    // 1. Top 3 des auteurs par le nombre de livres
    const authorsRanking = await Book.aggregate([
      { $group: { _id: "$author", totalBooks: { $sum: 1 } } },
      { $sort: { totalBooks: -1 } },
      { $limit: 3 }
    ]);

    // 2. Top 3 des livres les mieux notés
    const topRatedBooks = await Book.aggregate([
      { $unwind: "$reviews" },
      { 
        $group: { 
          _id: "$title", 
          avgRating: { $avg: "$reviews.rating" },
          totalReviews: { $sum: 1 }
        } 
      },
      { $sort: { avgRating: -1, totalReviews: -1 } },
      { $limit: 3 }
    ]);

    // 3. Genres les plus populaires
    const popularGenres = await Book.aggregate([
      { $group: { _id: "$genre", totalBooks: { $sum: 1 } } },
      { $sort: { totalBooks: -1 } }
    ]);

    // 4. Livres sans avis
    const booksWithoutReviews = await Book.aggregate([
      { $match: { reviews: { $exists: true, $size: 0 } } }
    ]);

    // 5. Utilisateurs les plus actifs
    const topReviewers = await User.aggregate([
      { 
        $lookup: { 
          from: "books", 
          localField: "email", 
          foreignField: "reviews.user", 
          as: "userReviews"
        } 
      },
      { $addFields: { totalReviews: { $size: "$userReviews" } } },
      { $sort: { totalReviews: -1 } },
      { $limit: 5 }
    ]);

    // 6. Livres par décennie
    const booksByDecade = await Book.aggregate([
      { $project: { decade: { $substr: ["$publishedYear", 0, 3] } } },
      { $group: { _id: { $concat: ["$decade", "0s"] }, totalBooks: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // 7. Note moyenne par genre
    const avgRatingByGenre = await Book.aggregate([
      { $unwind: "$reviews" },
      { 
        $group: { 
          _id: "$genre", 
          avgRating: { $avg: "$reviews.rating" },
          totalBooks: { $sum: 1 }
        }
      },
      { $sort: { avgRating: -1 } }
    ]);

    // 8. Livres les plus anciens avec avis
    const oldestReviewedBooks = await Book.aggregate([
      { $match: { reviews: { $exists: true, $ne: [] } } },
      { $sort: { publishedYear: 1 } },
      { $limit: 10 }
    ]);

    // Renvoyer tous les résultats à la vue
    res.render("aggregations", {
      title: "Aggregations Dashboard",
      authorsRanking,
      topRatedBooks,
      popularGenres,
      booksWithoutReviews,
      topReviewers,
      booksByDecade,
      avgRatingByGenre,
      oldestReviewedBooks
    });

  } catch (err) {
    console.error("Erreur dans les agrégations:", err);
    res.status(500).send("Erreur interne");
  }
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


//Exécuter l'importation
importManuscripts();

async function importUsers() {
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

// Page 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
