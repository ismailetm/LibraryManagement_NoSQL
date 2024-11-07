const mongoose = require('mongoose');


const bookSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
},
  author: {
    type: String,  
    required: true 
},
  isbn: { 
    type: String, 
    unique: true 
},
  genre: { 
    type: String 
},
  publishedYear: { 
    type: Number 
},
  copies: { 
    type: Number, 
    default: 1 
},
  availableCopies: { 
    type: Number, 
    default: 1 
},
});

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;
