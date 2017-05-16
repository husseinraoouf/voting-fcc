var express = require('express'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    TwitterStrategy = require('passport-twitter'),
    // GoogleStrategy = require('passport-google'),
    FacebookStrategy = require('passport-facebook'),
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;




var funct = require('./functions.js');
var User = require('./users.js');

var mongodbUrl = 'mongodb://hussein:123456@ds143221.mlab.com:43221/heroku_pvgc3m6k';
var MongoClient = require('mongodb').MongoClient;


var app = express();

// Simple route middleware to ensure user is authenticated.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.error = 'Please sign in!';
  res.redirect('/signin');
}


app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());


passport.use('local-signin', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    funct.localAuth(username, password)
    .then(function (user) {
      if (user) {
        console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT LOG IN");
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    funct.localReg(req, username, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.displayName);
        req.session.success = 'You are successfully registered and logged in ' + user.displayName + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

var TWITTER_CONSUMER_KEY = "HDIrSZdEUlqBmeP66rbXsRfzg";
var TWITTER_CONSUMER_SECRET = "FaEq7LQ7snflpGeZ2qFwC93r4KmOcdy1NX36RNjhp7J1jzzQaq";


passport.use(new TwitterStrategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: "https://hussein-voting-fcc.herokuapp.com/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, cb) {
    // In this example, the user's Twitter profile is supplied as the user
    // record.  In a production-quality application, the Twitter profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    // console.log(profile);
    User.findOrCreate(profile, cb);
  }
));


passport.use(new GoogleStrategy({
    clientID: "192489128144-7c2s53kfu7p2cspo476sgp6g4tt5u6i3.apps.googleusercontent.com",
    clientSecret: "VUZvwZ-DJ-uzHDs639GPIx8w",
    callbackURL: "https://hussein-voting-fcc.herokuapp.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      User.findOrCreate(profile, done);
  }
));

passport.use(new FacebookStrategy({
    clientID: "1147482535398076",
    clientSecret: "8b7b3c0c90a1804ce787d05277f08712",
    callbackURL: "https://hussein-voting-fcc.herokuapp.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
      User.findOrCreate(profile, done);
    // console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"+ profile+"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
    //   return done(null, profile);
  }
));


passport.serializeUser(function(user, done) {
  console.log("serializing " + user.username);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});




app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});


var hbs = exphbs.create({ defaultLayout: 'main' });
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');


app.get('/', function(req, res){
    // console.log(req.user);
    MongoClient.connect(mongodbUrl, function (err, db) {
        var collection = db.collection('polls');
        collection.find().toArray(function(err, result) {
            if (!result) {
                res.render('home', {polls: [], user: req.user});
            } else {
                res.render('home', {polls: result, user: req.user});
            }
        });
    });
    //   res.render('home', {user: req.user, polls:});
});

app.get('/newpoll',ensureAuthenticated, function(req, res){
  res.render('newpoll', {user: req.user});
});


app.post('/createpoll', function(req, res){
    MongoClient.connect(mongodbUrl, function (err, db) {
        var collection = db.collection('polls');
        var options = req.body.options.split("\n");
        for (var i = 0; i < options.length;i++) {
            options[i] = options[i].trim();
            if (!options[i]) {
                options.splice(i, 1);
                i--;
            }
        }

        function onlyUnique(value, index, self) {
            return self.indexOf(value) === index;
        }

        var options = options.filter( onlyUnique );


        var poll = {
             title : req.body.title,
             options: options,
             userId: req.user._id
         }

         for (var i = 0; i < options.length;i++) {
             poll[options[i]] = 0;
         }

         collection.insert(poll, function(err, data){
             if (err) console.log(err);
             db.close();
             res.redirect('/poll/'+data.insertedIds[0]);
         })
    });
});

app.get('/poll/:id', function(req, res){
    MongoClient.connect(mongodbUrl, function (err, db) {
        var collection = db.collection('polls');
        collection.findOne({'_id': require('mongodb').ObjectID(req.params.id)})
          .then(function (result) {
              if (!result) {
                  req.session.error = "That Poll Doesn't exist";
                  res.redirect('/');
              } else {
                  var pollarr = [ ['Task', 'Hours per Day'] ];
                  var del = (req.user && result.userId === req.user._id);
                  for (var i = 0; i < result.options.length; i++) {
                      var a = [result.options[i], result[result.options[i]]];
                      pollarr.push(a);
                  }
                  console.log(pollarr);
                  res.render('poll', {poll: result, user: req.user, del: del, pollarr: pollarr});
              }
        });
    });
});

app.get('/delete/:id', function(req, res){
    MongoClient.connect(mongodbUrl, function (err, db) {
        var collection = db.collection('polls');
        collection.findOne({'_id': require('mongodb').ObjectID(req.params.id)})
          .then(function (result) {
              if (!result) {
                  req.session.error = "That Poll Doesn't exist";
                  res.redirect('/');
              } else {
                  if (req.user && result.userId === req.user._id) {
                      collection.remove({'_id': require('mongodb').ObjectID(req.params.id)}, function(er, data) {
                          req.session.success = 'The Poll deleted Successfully!';
                          res.redirect('/');
                      })
                  } else {
                      req.session.error = "You don't have permission to delete it";
                      res.redirect('/');
                  }
              }
        });
    });
});
app.get('/mypolls', function(req, res){
    // console.log(req.user);
    MongoClient.connect(mongodbUrl, function (err, db) {
        var collection = db.collection('polls');
        collection.find({"userId" : req.user._id}).toArray(function(err, result) {
            console.log(result + "\n\n\n\n\n\n\n\n\n" + req.user._id + "\n\n\n\n\n\n\n\n\n");
            res.render('mypolls', {polls: result, user: req.user});

        });
    });
    //   res.render('home', {user: req.user, polls:});
});


app.post('/vote', function(req, res){
    MongoClient.connect(mongodbUrl, function (err, db) {
        var collection = db.collection('polls');
        // console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"+ req.body.pollId +"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");

        var a = {
            $inc: {}
        }
        a.$inc[req.body.q] = 1;
        // console.log("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"+ JSON.stringify(a) +"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
        collection.update({'_id': require('mongodb').ObjectID(req.body.pollId)}, a, function(er, result) {
            if (er) {
                db.close();
                res.redirect('/');
            } else {
                db.close();
                req.session.success = 'You are successfully voted for ' + req.body.q + '!';
                res.redirect('/poll/' + req.body.pollId);
            }
        });
    });
});




app.get('/signin', function(req, res){
  res.render('signin');
});

app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

app.post('/login', passport.authenticate('local-signin', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);


app.get('/auth/twitter', passport.authenticate('twitter'));


app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/signin' }),
  function(req, res) {
    res.redirect('/');
  });




app.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});



app.get('/auth/google',
  passport.authenticate('google', { scope: ['openid profile email'] }));


app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signin' }),
  function(req, res) {
    res.redirect('/');
  });


app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/',
                                      failureRedirect: '/login' }));





var port = process.argv[2];
app.listen(port, function() {
  console.log('server listening on port ' + port);
  console.log('http://127.0.0.1:'+port);
});
