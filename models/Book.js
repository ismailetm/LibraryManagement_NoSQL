const mongoose = require('mongoose');
const Schema = mongoose.Schema;


// Schéma pour les manuscrits
const bookSchema = new mongoose.Schema({
  url: { type: String, required: true },// URL comme champ
  Title: { type: String },
  author: { type: String },
  isbn: { type: String },
  genre: { type: String },
  publishedYear: { type: Number },
  DigitisedBy: { type: String },
  availableCopies: { type: Number, default: 0 },
  pdfBook: { type: mongoose.Schema.Types.ObjectId, ref: 'fs.files' }, 
  DigitisedBy: String,
  Shelfmark: String,
  Date: mongoose.Schema.Types.Mixed, // Accepte soit une chaîne, soit un tableau d'objets
  Language: [String],
  Format: String,
  Creator: String,
  Type: String,
  Place: mongoose.Schema.Types.Mixed, // Peut être un objet ou une chaîne
}, {
  timestamps: true,
  strict: false // Permet l'ajout de champs non définis dans le schéma
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
  
