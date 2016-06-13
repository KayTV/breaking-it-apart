// *** main dependencies *** //
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var swig = require('swig');
var cookieSession = require('cookie-session');
var session = require('express-session');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var Twitter = require('twitter');
var client = new Twitter({
  consumer_key: process.env.TWITTER_API_KEY,
  consumer_secret: process.env.TWITTER_SECRET_KEY,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});
var knex = require('../../db/knex');
if ( !process.env.NODE_ENV ) { require('dotenv').config(); }


// *** routes *** //
var routes = require('./routes/index.js');
var auth = require('./routes/auth.js');


// *** express instance *** //
var app = express();


// *** view engine *** //
var swig = new swig.Swig();
app.engine('html', swig.renderFile);
app.set('view engine', 'html');


// *** static directory *** //
app.set('views', path.join(__dirname, 'views'));


// *** config middleware *** //
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SECRET_KEY || 'change_me',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../client')));

// above your routes
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL:
  // "http://localhost:3000/auth/twitter/callback",
    "https://ancient-wave-14103.herokuapp.com/auth/twitter/callback",
  state: true
}, function(accessToken, refreshToken, profile, done) {
  knex('users')
    .where({ twitter_id: profile.id })
    .first()
    .then(function (user) {
      if ( !user ) {
        return knex('users').insert({
          twitter_id: profile.id,
          display_name: profile.displayName,
          avatar_url: profile.photos[0].value
        }, 'id').then(function (id) {
          return done(null, id[0]);
        });
      } else {
        return done(null, user.id);
      }
    });
}));

passport.serializeUser(function(user, done) {
  //later this will be where you selectively send to the browser
  // an identifier for your user, like their primary key from the
  // database, or their ID from linkedin

  done(null, user);
});

passport.deserializeUser(function(userId, done) {
  // here is where you will go to the database and get the
  // user each time from it's id, after you set up your db
  if ( userId ) {
      knex('users')
        .where({ id: userId })
        .first()
        .then(function (user) {
          ( !user ) ? done() : done(null, user);
        })
        .catch(function (err) {
          done(err, null);
        })
    } else {
      done();
    }
});


// *** main routes *** //
app.use('/', routes);
app.use('/auth', auth);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// *** error handlers *** //

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
