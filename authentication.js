var passport = require('passport')
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var GithubStrategy = require('passport-github').Strategy;
var GoogleStrategy = require('passport-google').Strategy;
var InstagramStrategy = require('passport-instagram').Strategy;
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var User = require('./user.js');
var config = require('./oauth.js');
var Account = require('./account.js');


//authenticate facebook

module.exports = passport.use(new FacebookStrategy({
    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    authentication(accessToken, refreshToken, profile, done, 'facebook.com');
  }
));


//authorize facebook

passport.use('facebook-authz', new FacebookStrategy({
  clientID: config.facebook.clientID,
  clientSecret: config.facebook.clientSecret,
  callbackURL: config.facebook.callbackauthzURL,
  passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    authorization(req, accessToken, refreshToken, profile, done, 'facebook.com');
  }
));


passport.use(new LinkedInStrategy({
    consumerKey: config.linkedin.consumerKey,
    consumerSecret: config.linkedin.consumerSecret,
    callbackURL: config.linkedin.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    authentication(accessToken, refreshToken, profile, done, 'linkedin.com');
  }
));


//authorize facebook

passport.use('linkedin-authz', new LinkedInStrategy({
  consumerKey: config.linkedin.consumerKey,
  consumerSecret: config.linkedin.consumerSecret,
  callbackURL: config.linkedin.callbackauthzURL,
  passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    authorization(req, accessToken, refreshToken, profile, done, 'linkedin.com');
  }
));


//authenticate instagram

passport.use(new InstagramStrategy({
  clientID: config.instagram.clientID,
  clientSecret: config.instagram.clientSecret,
  callbackURL: config.instagram.callbackauthzURL,
  passReqToCallback: true
},
  function(req, accessToken, refreshToken, profile, done) {
    authentication(accessToken, refreshToken, profile, done, 'instagram.com');
  }
));

//authorize instagram

passport.use('instagram-authz', new InstagramStrategy({
  clientID: config.instagram.clientID,
  clientSecret: config.instagram.clientSecret,
  callbackURL: config.instagram.callbackauthzURL,
  passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    authorization(req, accessToken, refreshToken, profile, done, 'instagram.com');
  }
))


//authenticate twitter

passport.use(new TwitterStrategy({
   consumerKey: config.twitter.consumerKey,
   consumerSecret: config.twitter.consumerSecret,
   callbackURL: config.twitter.callbackURL
 },
 function(accessToken, refreshToken, profile, done) {
    authentication(accessToken, refreshToken, profile, done, 'twitter.com');
  }
));


//authorize twitter

passport.use('twitter-authz', new TwitterStrategy({
  consumerKey: config.twitter.consumerKey,
  consumerSecret: config.twitter.consumerSecret,
  callbackURL: config.twitter.callbackauthzURL,
  passReqToCallback: true
  },
  function(req, accessToken, refreshToken, profile, done) {
    authorization(req, accessToken, refreshToken, profile, done, 'twitter.com');
  }
));

function authentication(accessToken, refreshToken, profile, done, provider) {
  User.findOne({ 'accounts.uid': profile.id }, function(err, user) {
    if(err) { console.log(err); }
    if (!err && user != null) {
      done(null, user);
    } else {
      var user = new User({
        //oauthID: profile.id,
        name: profile.displayName,
        created: Date.now()
      });
      var acc = {
        uid: profile.id,
        provider: provider,
        name: profile.displayName,
        tokens: []
      };
      var t = { kind: 'oauth', accessToken: accessToken, attributes: { refreshToken: refreshToken } };
      acc.tokens.push(t);
      user.accounts.push(acc);
      user.save(function(err) {
        if(err) { 
          console.log(err); 
        } else {
          console.log("saving user ...");
          done(null, user);
        };
      });
    };
  });
}

function authorization(req, accessToken, refreshToken, profile, done, provider) {
  if (!req.user) {
    // Not logged-in, wtf?
  } else {
    User.findOne({ 'accounts.uid': profile.id }, function(err, user) {
      if (err) { console.log(err); }
      if (!err && user != null) {
        if (user.name == req.user.name) {
          done(null, user)  
        } else {
          console.log('account is already associated with another account');
        }
      } else{
        var user = req.user;
        var acc = {
          uid: profile.id,
          provider: provider,
          name: profile.displayName,
          tokens: []
        };
        var t = { kind: 'oauth', accessToken: accessToken, attributes: { refreshToken: refreshToken } };
        acc.tokens.push(t);
        user.accounts.push(acc);
        user.save(function(err) {
          if(err) { 
            console.log(err); 
          } else {
            console.log("saving user ...");
            done(null, user);
          };
        });
      }
    });
  }
}

/*
passport.use(new GithubStrategy({
   clientID: config.github.clientID,
   clientSecret: config.github.clientSecret,
   callbackURL: config.github.callbackURL
 },
 function(accessToken, refreshToken, profile, done) {
  authenticate(accessToken, refreshToken, profile, done, 'github.com');
}
));

passport.use(new GoogleStrategy({
   returnURL: config.google.returnURL,
   realm: config.google.realm
 },
 function(accessToken, refreshToken, profile, done) {
  authenticate(accessToken, refreshToken, profile, done, 'google.com');
}
));
*/

