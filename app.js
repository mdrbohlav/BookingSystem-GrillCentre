var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var redisStore = require('connect-redis')(expressSession);

var config = require('./config');
var expressValidator = require('express-validator');

var stylus = require('stylus');
var nib = require('nib');
var fs = require('fs');
var uglify = require("uglify-js");

var routes = require('./routes/index');
var auth = require('./routes/auth');
var apiUser = require('./routes/api/user');
var apiReservation = require('./routes/api/reservation');
var apiAccessory = require('./routes/api/accessory');

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
    saveUninitialized: false,
    resave: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// handle lost connection to Redis
app.use(function (req, res, next) {
  if (!req.session) {
    res.status(500);
    res.render('error', {
        message: 'Lost connection to the Redis.',
        error: {}
    });
  }
  next();
})

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
