const mongoose = require('mongoose');
const Schema = mongoose.Schema;



const UserSchema = new Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true
  },
  address:{
    type:String,
  },
  number:{
    type:Number,
  },
},  
{ timestamps: true });

const User = mongoose.model('User', UserSchema);
module.exports = User;

