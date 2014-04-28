// dependencies
var fs = require('fs');
var express = require('express');
var routes = require('./routes');
var path = require('path');
var config = require('./oauth.js');
var User = require('./user.js');
var mongoose = require('mongoose');
var passport = require('passport');
var auth = require('./authentication.js');
var twitterAPI = require('node-twitter-api');
var request = require('request');
var graph = require('fbgraph');

var twitter = new twitterAPI({
  consumerKey: config.twitter.consumerKey,
  consumerSecret: config.twitter.consumerSecret,
  callback: config.twitter.callbackURL
});

// connect to the database
mongoose.connect('mongodb://localhost/Axihub');

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'my_precious' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// seralize and deseralize
passport.serializeUser(function(user, done) {
    //console.log('serializeUser: ' + user._id)
    done(null, user._id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user){
        //console.log(user);
        if(!err) done(null, user);
        else done(err, null);
    })
});

// routes
app.get('/', routes.index);
app.get('/ping', routes.ping);
app.get('/termsofservice', routes.termsofservice);
app.get('/privacypolicy', routes.privacypolicy);
app.get('/app', ensureAuthenticated, function(req, res){
  User.findById(req.session.passport.user, function(err, user) {
    if(err) { 
      console.log(err); 
    } else {
      res.render('app', { user: user});
    }
  })
});

app.get('/auth/facebook', authnOrAuthzFacebook);

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/app');
  });
app.get('/authz/facebook/callback', 
  passport.authorize('facebook-authz', { failureRedirect: '/' }),
  function(req, res) {
    var user = req.user;
    var account = req.account;

    // Associate the Twitter account with the logged-in user.
    account.userId = user.id;
    account.save(function(err) {
      if (err) { return self.error(err); }
      res.redirect('/app');
    });
  });

app.get('/auth/instagram/callback',
  passport.authenticate('instagram', { failureRedirect: '/'}),
  function(req, res) {
    res.redirect('/app');
  });
app.get('/auth/instagram/callback?type-authz',
  passport.authorize('instagram-authz', { failureRedirect: '/' }),
  function(req, res) {
    var user = req.user;
    var account = req.account;

    //Associate the Instagram account with the logged-in user.
    account.userId = user.id;
    account.save(function(err) {
      if (err) { return self.error(err); }
      res.redirect('/app');
    });
  });

app.get('/auth/instagram', authnOrAuthzInstagram);

app.get('/auth/twitter', authnOrAuthzTwitter);

app.get('/auth/linkedin', authnOrAuthzLinkedIn);

app.get('/auth/linkedin/callback',
  passport.authenticate('linkedin', {failureRedirect: '/'}),
  function(req, res) {
    res.redirect('/app');
  });

app.get('/authz/linkedin/callback',
  passport.authorize('linkedin-authz', {failureRedirect: '/'}),
  function(req, res) {
    var user = req.user;
    var account = req.account;

    //associate the linked in account with the logged in user.
    account.userId = user.id;
    account.save(function(err) {
      if (err) { return self.error(err); }
      res.redirect('/app');
    });
  });

app.get('/auth/twitter/callback', 
  passport.authenticate('twitter', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/app');
  });
app.get('/authz/twitter/callback',
  passport.authorize('twitter-authz', { failureRedirect: '/' }),
  function(req, res) {
    var user = req.user;
    var account = req.account;

    // Associate the Twitter account with the logged-in user.
    account.userId = user.id;
    account.save(function(err) {
      if (err) { return self.error(err); }
      res.redirect('/app');
    });
  });
app.get('/account', function(req, res) {
  res.redirect('/app');
});
app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
  });
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/account');
  });
app.get('/auth/google',
  passport.authenticate('google'),
  function(req, res){
  });
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/account');
  });
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/twitter/api', callTwitterApi);

app.get('/linkedin/api', callLinkedInApi);

app.get('/facebook/api', callFacebookApi);

// port
app.listen(config.port);

function callTwitterApi(req, res, next) {
  var user = req.user;
  var accounts = user.accounts;
  var twitt = findAccount(accounts, "twitter.com");
  
  var accessToken = twitt.tokens[0].accessToken;
  var accessTokenSecret = twitt.tokens[0].attributes.refreshToken;

  twitter.verifyCredentials(accessToken, accessTokenSecret, function(error, data, response) {
    if (error) {
      //something was wrong with the accessToken
      console.log('something wrong with verifyCredentials');
    } else {
      //can be used for api-calls
      twitter.getTimeline("home", {"screen_name": data["screen_name"]}, accessToken, accessTokenSecret, function(error, data, response) {
        if (error) {
          //something was wrong
          console.log('something wrong in the getTimeline');
          console.log(error);
        } else {
          // data contains the data sent by twitter, hopefully the timeline
          console.log(data);
          res.send(data);
        }
      });
    }
  });
}

function callLinkedInApi(req, res, next) {
  var user = req.user;
  var accounts = user.accounts;
  var linkedinacc = findAccount(accounts, "linkedin.com");

  var accessToken = linkedinacc.tokens[0].accessToken;
  var accessTokenSecret = linkedinacc.tokens[0].attributes.refreshToken;

  request.get('https://api.linkedin.com/v1/people/~/network/updates?format=json&count=25&oauth2_access_token='+accessToken, function (error, response, body) {
    if (!error) {
      //console.log(body);
      res.send(body);
    } else if (error) {
      console.log(error);
      res.send(error);
    }
  });
}

function callFacebookApi(req, res, next) {
  var user = req.user;
  var accounts = user.accounts;
  var fbacc = findAccount(accounts, "facebook.com");

  var accessToken = fbacc.tokens[0].accessToken;

  graph.setAccessToken(accessToken);

  graph.get('/me/home', function(err, response) {
    res.send(response);
  })
}

function findAccount(accounts, provider) {
  var len = accounts.length;
  for (var cnt = 0; cnt < len; cnt++) {
    if (accounts[cnt].provider == provider) {
      return accounts[cnt];
    }
  }
}

function authnOrAuthzInstagram(req, res, next) {
  if(!req.isAuthenticated()) {
    passport.authenticate('instagram', { sucessRedirect: '/app', failureRedirect: '/' })(req, res, next);
  } else {
    passport.authorize('instagram-authz')(req, res, next);
  }
}

function authnOrAuthzLinkedIn(req, res, next) {
  if (!req.isAuthenticated()) {
    passport.authenticate('linkedin', { state: config.linkedin.state, successRedirect: '/app',
                                        failureRedirect: '/login' })(req, res, next);
  } else {
    passport.authorize('linkedin-authz', { state: config.linkedin.state })(req, res, next);
  }
}

function authnOrAuthzFacebook(req, res, next) {
  if (!req.isAuthenticated()) {
    passport.authenticate('facebook', { scope: ['email', 'read_stream'], successRedirect: '/app',
                                        failureRedirect: '/login' })(req, res, next);
  } else {
    passport.authorize('facebook-authz')(req, res, next);
  }
}

function authnOrAuthzTwitter(req, res, next) {
  if (!req.isAuthenticated()) {
    passport.authenticate('twitter', { successRedirect: '/app',
                                        failureRedirect: '/login' })(req, res, next);
  } else {
    passport.authorize('twitter-authz')(req, res, next);
  }
}

// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/');
}

module.exports = app
