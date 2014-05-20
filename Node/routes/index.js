var path = require("path");

exports.index = function(req, res){
  res.render('index', { title: "Passport-Examples"});
};

exports.ping = function(req, res){
  res.send("pong!", 200);
};

exports.termsofservice = function(req, res) {
	res.render('termsofservice');
};

exports.privacypolicy = function(req, res) {
	res.render('privacypolicy');
};