var mongoose = require('mongoose')

// create a user model
var Account = mongoose.model('Account', {
  provider: String,
  uid: Number,
  name: String,
  created: Date,
  tokens: []
});


module.exports = Account;