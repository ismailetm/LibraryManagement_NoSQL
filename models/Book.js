const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schéma flexible pour un livre
const bookSchema = new Schema({
  title: { type: String },
  author: { type: String },
  isbn: { type: String },
  genre: { type: String },
  publishedYear: { type: Number },
  availableCopies: { type: Number, default: 0 },
  pdfBook: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' }, // Référence à GridFS
  reviews: [ // Tableau d'avis
    {
      user: { type: String, required: true },
      comment: { type: String },
      rating: { type: Number, min: 1, max: 5, required: true }
    }
  ]
}, {
  timestamps: true,
  strict: false // Permet l'ajout de champs non définis dans le schéma
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
