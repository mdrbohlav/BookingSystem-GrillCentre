var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    expressSession = require('express-session'),
    redisStore = require('connect-redis')(expressSession);

var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    OAuth2Strategy = require('passport-oauth2'),
    AuthHelper = require('./helpers/AuthHelper');

var config = require('./config'),
    expressValidator = require('express-validator');

var stylus = require('stylus'),
    nib = require('nib'),
    fs = require('fs'),
    uglify = require("uglify-js");

var routes = require('./routes/index'),
    auth = require('./routes/auth'),
    apiUser = require('./routes/api/user'),
    apiReservation = require('./routes/api/reservation'),
    apiAccessory = require('./routes/api/accessory');

var app = express();

// Postgres setup
var models = require("./models");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// stylus setup
function compile(str, path) {
    return stylus(str)
        .set('filename', path)
        .set('compress', true)
        .use(nib())
        .import('nib');
}

app.use(stylus.middleware({
    src: path.join(__dirname, 'public/'),
    dest: path.join(__dirname, 'public/'),
    compile: compile,
    debug: true
}));

// uglify setup
var uglified = uglify.minify([
    path.join(__dirname, 'public/js/global.js')
], {
    mangle: true,
    compress: {
        sequences: true,
        dead_code: true,
        conditionals: true,
        booleans: true,
        unused: true,
        if_return: true,
        join_vars: true,
        drop_console: true
    }
});

/*fs.writeFile(path.join(__dirname, 'public/js/global.min.js'), uglified.code, function(err) {
  if(err) {
    console.log(err);
  } else {
    console.log("Script generated and saved.");
  }      
});*/

// Redis Store options
var redisOptions = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    pass: config.REDIT_PASS,
    db: 0
};

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(expressValidator());
app.use(cookieParser(config.SECRET));
app.use(expressSession({
    secret: config.SECRET,
    store: new redisStore(redisOptions),
    saveUninitialized: true,
    resave: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// handle lost connection to Redis
app.use(function(req, res, next) {
    if (!req.session) {
        res.status(500);
        res.render('error', {
            message: 'Lost connection to the Redis.',
            error: {}
        });
    }
    next();
});

// session-persisted message middleware
app.use(function(req, res, next) {
    var err = req.session.error,
        msg = req.session.notice,
        success = req.session.success;

    if (req.session.notice) {
        console.log(req.session.notice);
    }

    delete req.session.error;
    delete req.session.success;
    delete req.session.notice;

    if (err) res.locals.error = err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;

    next();
});

// passport setup
passport.use('login-native', new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true // allows us to pass back the request to the callback
}, function(req, email, password, done) {
    AuthHelper.localAuth(email, password).then(function(user) {
        if (user) {
            req.session.success = 'You are successfully logged in ' + user.fullName + '!';
            done(null, user);
        }
        if (!user) {
            req.session.error = 'Could not log user in. Please try again.';
            done(null, user);
        }
    }).catch(function(err) {
        console.log(err);
    });
}));

/*passport.use('login-is', new OAuth2Strategy({
        authorizationURL: 'https://www.example.com/oauth2/authorize',
        tokenURL: 'https://www.example.com/oauth2/token',
        clientID: EXAMPLE_CLIENT_ID,
        clientSecret: EXAMPLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/example/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        console.log(profile);
        //models.User.upsert(profile).then(function(user) {
        //    return done(err, user);
        //}).catch(function(data) {
        //    console.log(data);
        //});
    }
));*/

// passport session setup
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// enable CORS
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", /*config.AdminUrl*/ "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "DELETE,GET,HEAD,POST,PUT,PATCH,OPTIONS,TRACE");
    next();
});

// routing
app.use('/', routes);
app.use('/auth', auth);
app.use('/api/user', apiUser);
app.use('/api/reservation', apiReservation);
app.use('/api/accessory', apiAccessory);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// custom error handler
app.use(function(err, req, res, next) {
    if (err.customType) {
        res.status(err.status || 500);
        return res.send({
            error: {
                type: err.customType,
                message: err.customMessage
            }
        });
    }
    next(err);
});

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
