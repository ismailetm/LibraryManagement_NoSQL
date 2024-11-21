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


//submitting data routes
app.post('/user/create',(req,res)=>{
  console.log("POST req made on"+req.url);
  console.log("Form submitted to server");
  /*Note: when you are passing form obj directly to collection using model you
          have to give same name in form of that data that is to be passed in database 
          and that name is declared inside schema*/
  const user = new User(req.body); //passing object of form data directly to collection
  user.save() //then saving this to database and this return promise
    .then(result => {
      res.redirect('/users');//is success save this will redirect to home page
    })
    .catch(err => { //if data not saved error showed
      console.log(err);
    });
})


//route for updating users data
app.post('/edit/:id',(req,res)=>{
  console.log("POST req made on"+req.url);
  User.updateOne({_id:req.params.id},req.body) //then updating that user whose id is get from url 
                                               //first passing id which user is to be updated than passing update info
    .then(result => {
      res.redirect('/users');//is success save this will redirect to home page
      console.log("Users profile Updated");
    })
    .catch(err => { //if data not saved error showed
      console.log(err);
    });
})

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
app.get('/books', (req, res) => {
  Book.find().sort({ createdAt: -1 })
    .then(result => res.render('books', { books: result, title: 'All Books' }))
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
    .then(result => {
      res.render('detailsBook', { book: result, title: 'Book Details' });
    })
    .catch(err => {
      console.log(err);
      res.status(404).render('404', { title: 'Book Not Found' });
    });
});
app.get('/books/edit/:id', (req, res) => {
  const id = req.params.id;
  console.log("Request made on " + req.url);
  
  // Trouver le livre par ID
  Book.findById(id)
    .then(result => {
      res.render('editBook', { book: result, title: 'Edit Book' });
    })
    .catch(err => {
      console.log(err);
      res.status(404).render('404', { title: 'Book Not Found' });
    });
});

app.post('/books/edit/:id',(req,res)=>{
  console.log("POST req made on"+req.url);
  Book.updateOne({_id:req.params.id},req.body) //then updating that user whose id is get from url 
                                               //first passing id which user is to be updated than passing update info
    .then(result => {
      res.redirect(`/books/${req.params.id}`);//is success save this will redirect to home page
      console.log("Users profile Updated");
    })
    .catch(err => { //if data not saved error showed
      console.log(err);
      res.status(500).send("Error updating book");
    });
})

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
