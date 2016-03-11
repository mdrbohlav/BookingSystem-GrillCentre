var express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    expressSession = require('express-session'),
    redisStore = require('connect-redis')(expressSession),
    i18n = require('i18n-2'),
    isoLocales = require(__dirname + '/config/isoLocales');

var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    OAuth2Strategy = require('passport-oauth2'),
    AuthHelper = require(__dirname + '/helpers/AuthHelper'),
    ICalHelper = require(__dirname + '/helpers/ICalHelper'),
    FinishReservationHelper = require(__dirname + '/helpers/FinishReservationHelper');

var config = require(__dirname + '/config/global'),
    redisConfig = require(__dirname + '/config/redis'),
    expressValidator = require('express-validator');

var stylus = require('stylus'),
    nib = require('nib'),
    fs = require('fs'),
    uglify = require("uglify-js");

var nodemon = require('nodemon');

var index = require(__dirname + '/routes/index'),
    auth = require(__dirname + '/routes/auth'),
    user = require(__dirname + '/routes/user'),
    admin = require(__dirname + '/routes/admin'),
    apiUser = require(__dirname + '/routes/api/user'),
    apiReservation = require(__dirname + '/routes/api/reservation'),
    apiAccessory = require(__dirname + '/routes/api/accessory'),
    apiAdminUser = require(__dirname + '/routes/api/admin/user'),
    apiAdminUsers = require(__dirname + '/routes/api/admin/users'),
    apiAdminReservation = require(__dirname + '/routes/api/admin/reservation'),
    apiAdminAccessory = require(__dirname + '/routes/api/admin/accessory');

var app = express();

// Postgres setup
var models = require(__dirname + '/models');

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
/*var uglified = uglify.minify([
    path.join(__dirname, 'bower_components/jquery/dist/jquery.js'),
    path.join(__dirname, 'bower_components/velocity/velocity.js'),
    path.join(__dirname, 'bower_components/jquery-validation/dist/jquery.validate.js'),
    path.join(__dirname, 'bower_components/console-polyfill/index.js'),
    path.join(__dirname, 'bower_components/es5-shim/es5-shim.js'),
    path.join(__dirname, 'bower_components/underscore/underscore.js'),
    path.join(__dirname, 'bower_components/moment/moment.js'),
    path.join(__dirname, 'bower_components/moment/locale/cs.js'),
    path.join(__dirname, 'bower_components/pickadate/lib/picker.js'),
    path.join(__dirname, 'bower_components/pickadate/lib/picker.date.js'),
    path.join(__dirname, 'bower_components/pickadate/lib/picker.time.js'),
    path.join(__dirname, 'bower_components/clndr/clndr.min.js'),
    path.join(__dirname, 'bower_components/fastclick/lib/fastclick.js')
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

fs.writeFile(path.join(__dirname, 'public/js/app.min.js'), uglified.code, function(err) {
  if(err) {
    console.log(err);
  } else {
    console.log("Script generated and saved.");
  }      
});*/

// Redis Store options
var redisOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    pass: redisConfig.password,
    db: 0
};

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

// schedule checking unfinished reservations on start and at midnight
FinishReservationHelper.scheduleFinishReservations();

// init ICal calendar
ICalHelper.initCalendar();

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
    if (req.user) res.locals.user = req.user;

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
        req.session.error = err.customMessage;
        done(null, false);
    });
}));

/*passport.use('login-is', new OAuth2Strategy({
    authorizationURL: 'https://www.example.com/oauth2/authorize',
    tokenURL: 'https://www.example.com/oauth2/token',
    clientID: config.EXAMPLE_CLIENT_ID,
    clientSecret: config.EXAMPLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/example/callback"
}, function(accessToken, refreshToken, profile, done) {
    console.log(profile);
    AuthHelper.isAuth(accessToken, refreshToken, profile).then(function(user) {
        if (user) {
            req.session.success = 'You are successfully logged in ' + user.fullName + '!';
            done(null, user);
        }
        if (!user) {
            req.session.error = 'Could not log user in. Please try again.';
            done(null, user);
        }
    }).catch(function(err) {
        req.session.error = err.customMessage;
        done (null, false);
    });
}));*/

// passport session setup
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// enable CORS
//app.use(function(req, res, next) {
//    res.header("Access-Control-Allow-Origin", /*config.AdminUrl*/ "*");
//    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//    res.header("Access-Control-Allow-Methods", "DELETE,GET,HEAD,POST,PUT,PATCH,OPTIONS,TRACE");
//    next();
//});


// locales
Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
};

var availableLocales = fs.readdirSync(__dirname + '/locales'),
    csIndex = 0;
for (var i = 0; i < availableLocales.length; i++) {
    availableLocales[i] = availableLocales[i].replace(/\.js/, '');
    if (availableLocales[i] === 'cs') {
        csIndex = i;
    }
}

if (csIndex > 0) {
    availableLocales.moce(csIndex, 0);
}

i18n.expressBind(app, {
    locales: availableLocales
});

app.use(function(req, res, next) {
    res.locals.isoLocales = isoLocales;
    res.locals.availableLocales = availableLocales;
    var locale = 'cs';
    if (req.user) {
        locale = Object.keys(req.user.locale)[0];
    } else {
        var tmp = req.headers['accept-language'].split(/[\s,;]/);
        for (var i = 0; i < tmp.length; i++) {
            if (availableLocales.indexOf(tmp[i]) > -1) {
                locale = tmp[i];
                break;
            }
        }
    }
    req.i18n.setLocale(locale);
    next();
});

// routes require login
var UnauthorizedError = require(__dirname + '/errors/UnauthorizedError');

app.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        next();
    }).catch(function(err) {
        res.redirect('/login');
    });
});

app.get('/user*', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        next();
    }).catch(function(err) {
        res.redirect('/login');
    });
});

app.get('/admin*', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        if (req.user.isAdmin) {
            next();
        } else {
            next(new UnauthorizedError());
        }
    }).catch(function(err) {
        res.redirect('/login');
    });
});

app.get('/api*', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        next();
    }).catch(function(err) {
        next(err);
    });
});

app.get('/api/admin*', function(req, res, next) {
    if (req.user.isAdmin) {
        next();
    } else {
        next(new UnauthorizedError());
    }
});

// routing
app.use('/', index);
app.use('/auth', auth);
app.use('/user', user);
app.use('/admin', admin);
app.use('/api/user', apiUser);
app.use('/api/reservation', apiReservation);
app.use('/api/accessory', apiAccessory);
app.use('/api/admin/user', apiAdminUser);
app.use('/api/admin/users', apiAdminUsers);
app.use('/api/admin/reservation', apiAdminReservation);
app.use('/api/admin/accessory', apiAdminAccessory);

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
