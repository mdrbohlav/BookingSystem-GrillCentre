// # Hlavní soubor aplikace
// Zde se nastavují všechny potřebné služby, knihovny a proměnné
var express = require('express'),
    path = require('path'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    expressSession = require('express-session'),
    redisStore = require('connect-redis')(expressSession),
    i18n = require('i18n-2'),
    isoLocales = require(__dirname + '/config/isoLocales'),
    moment = require('moment'); 

var passport = require('passport'),
    // Lokální strategie pro autentizaci
    LocalStrategy = require('passport-local').Strategy,
    // Oauth 2.0 strategie pro autentizaci
    OAuth2Strategy = require('passport-oauth2'),
    // [Helper pro autentizaci](helpers/AuthHelper.html)
    AuthHelper = require(__dirname + '/helpers/AuthHelper'),
    // [Helper pro SilicoHill API požadavky](helpers/SiliconHillApiRequest.html)
    ApiRequest = require(__dirname + '/helpers/SiliconHillApiRequest'),
    // [Helper pro generování iCal](helpers/ICalHelper.html)
    ICalHelper = require(__dirname + '/helpers/ICalHelper'),
    // [Helper pro kontrolu skončených rezervací](helpers/FinishReservationHelper.html)
    FinishReservationHelper = require(__dirname + '/helpers/FinishReservationHelper'),
    UserDoesNotHaveServiceError = require(__dirname + '/errors/UserDoesNotHaveServiceError'),
    UnauthorizedError = require(__dirname + '/errors/UnauthorizedError');

var config = require(__dirname + '/config/global'),
    redisConfig = require(__dirname + '/config/redis'),
    expressValidator = require('express-validator');

var stylus = require('stylus'),
    nib = require('nib'),
    fs = require('fs'),
    uglify = require("uglify-js");

// [Základní routy](routes/index.html)
var index = require(__dirname + '/routes/index'),
    // [Routy pro autentizaci](routes/auth.html)
    auth = require(__dirname + '/routes/auth'),
    // [Routy pro uživatele](routes/user.html)
    user = require(__dirname + '/routes/user'),
    // [Routy pro admina](routes/admin.html)
    admin = require(__dirname + '/routes/admin'),
    // [API routy pro uživatele](routes/api/user.html)
    apiUser = require(__dirname + '/routes/api/user'),
    // [API routy pro rezervace](routes/api/reservation.html)
    apiReservation = require(__dirname + '/routes/api/reservation'),
    // [API routy pro příslušenství](routes/api/accessory.html)
    apiAccessory = require(__dirname + '/routes/api/accessory'),
    // [Admin API routy pro uživatele](routes/api/admin/user.html)
    apiAdminUser = require(__dirname + '/routes/api/admin/user'),
    // [Admin API routy pro uživatele 2](routes/api/admin/users.html)
    apiAdminUsers = require(__dirname + '/routes/api/admin/users'),
    // [Admin API routy pro rezervace](routes/api/admin/reservation.html)
    apiAdminReservation = require(__dirname + '/routes/api/admin/reservation'),
    // [Admin API routy pro příslušenství](routes/api/admin/accessory.html)
    apiAdminAccessory = require(__dirname + '/routes/api/admin/accessory'),
    // [Admin API routy pro notifikace](routes/api/admin/notification.html)
    apiAdminNotification = require(__dirname + '/routes/api/admin/notification');

var app = express();

// Nastavení PostgresSQL
var models = require(__dirname + '/models');

// Nastavení šablonovacího systému na Jade
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// ## Nastavení Stylusu
// Funkce, která zajistí kompilaci Stylus souborů, jejich kompresi a
// použití knihovny nib, která doplní vendor prefixy a obsahuje 
// různé užitečné prefixy.
function compile(str, path) {
    return stylus(str)
        .set('filename', path)
        .set('compress', true)
        .use(nib())
        .import('nib');
}

// Nastavení middleware pro Stylus, který zavolá funkci na kompilaci.
app.use(stylus.middleware({
    src: path.join(__dirname, 'public/'),
    dest: path.join(__dirname, 'public/'),
    compile: compile,
    debug: true
}));

// ## Nastavení minifikace JavaScriptu
// Nejprve se spojí všechny používané JavaScriptové knihovny do jednoho
// souboru, který se následně minifikuje s nastavenými parametry.
// - `sequences` - spojení po sobě jdoucích jednoduchých výrazů čárkou.
// - `dead_code` - odstranění nedosažitelného kódu.
// - `conditionals` - optimalizace `if` podmínek.
// - `booleans` - optimalizace boolean výrazů jako je `!!a ? b : c` na `a ? b : c`.
// - `unused` - odstranění nepoužívaných funkcí a proměnných.
// - `if_return` - optimalizace `if/return` a `if/continue` podmínek.
// - `join_vars` - spojení po sobě jdoucích `var` definic.
// - `drop_console` - odstranění výpisů do konzole.
var uglified = uglify.minify([
    path.join(__dirname, 'bower_components/jquery/dist/jquery.js'),
    path.join(__dirname, 'bower_components/velocity/velocity.js'),
    path.join(__dirname, 'bower_components/jquery-validation/dist/jquery.validate.js'),
    path.join(__dirname, 'bower_components/jQuery.dotdotdot/src/jquery.dotdotdot.js'),
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

// Uložení minifikovaného souboru do `public/js/app.min.js`.
fs.writeFile(path.join(__dirname, 'public/js/app.min.js'), uglified.code, function(err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Script generated and saved.");
    }
});

// ## Nastavení logování
// Registrace vlastního formátu data pro logování.
logger.token('customDate', function(req, res) {
    return '[' + moment().format('gggg-MM-DD HH:mm:ss.SSS') + ']';
});
// Nastavení formátu logování.
app.use(logger(':customDate - :method :url :status :response-time ms - :res[content-length]'));

// ## Nastavení session
// Konfigurace pro Redis.
var redisOptions = {
    host: redisConfig.host,
    port: redisConfig.port,
    pass: redisConfig.password,
    db: 0,
    ttl: 60 * 60 * 24
};

// ## Nastavení dalších potřebných middleware funkcí
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(expressValidator());
app.use(cookieParser(config.SECRET));
// Nastavení používání Redisu jako úložiště pro session.
app.use(expressSession({
    secret: config.SECRET,
    store: new redisStore(redisOptions),
    saveUninitialized: true,
    resave: true,
    unset: 'destroy'
}));
// Inicializace Passportu
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// Odchycení ztraceného připojení k Redisu
app.use(function(req, res, next) {
    if (!req.session) {
        res.status(500);
        res.render('error', {
            message: 'Lost connection to the Redis.',
            error: {}
        });
    } else {
        next();
    }
});

// ## Nastavení kontrolování skončených rezervací
FinishReservationHelper.scheduleFinishReservations();

// ## Nastavení pro jazyky
// Vlastní funkce na posunutí prvku v poli.
Array.prototype.move = function(old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
};

// Načtení seznamu dostupných jazyků.
var availableLocales = fs.readdirSync(__dirname + '/locales'),
    csIndex = 0;
for (var i = 0; i < availableLocales.length; i++) {
    availableLocales[i] = availableLocales[i].replace(/\.js/, '');
    if (availableLocales[i] === 'cs') {
        csIndex = i;
    }
}

// Posunutí češtiny na první místo v poli dostupných jazyků.
if (csIndex > 0) {
    availableLocales.move(csIndex, 0);
}

// Nastavení i18n knihovny pro použití s aplikací.
i18n.expressBind(app, {
    locales: availableLocales,
    defaultLocale: 'cs'
});

// Nastavení proměnné prostředí `locale` s hodnotou zvoleného jazyka.
app.use(function(req, res, next) {
    res.locals.isoLocales = isoLocales;
    res.locals.availableLocales = availableLocales;
    var locale = 'cs';
    if (req.user) {
        locale = Object.keys(req.user.locale)[0];
    } else if (req.cookies.locale) {
        locale = req.cookies.locale;
    } else {
        var tmp = req.headers['accept-language'].split(/[\s,;]/);
        for (var i = 0; i < tmp.length; i++) {
            if (availableLocales.indexOf(tmp[i]) > -1) {
                locale = tmp[i];
                break;
            }
        }
    }
    res.locals.locale = locale;
    req.i18n.setLocale(locale);
    next();
});

// ## Middleware pro zachování zpráv v session
// Různé typy: `error`, `success`, `notice`. Zároveň nastavení proměnné
// prostředí `user`.
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

    if (err) res.locals.error = typeof(err) === 'object' &&  'message' in err ? err.message : err;
    if (msg) res.locals.notice = msg;
    if (success) res.locals.success = success;
    if (req.user) res.locals.user = req.user;

    next();
});

// ## Notifikace
app.use(function(req, res, next) {
    var notification = models.Notification.findOne().then(function(notification) {
        if (notification) {
            res.locals.notification = notification;
        }
        next();
    }).catch(function(err) {
        console.log("notification err", err);
        next();
    });
});

// ## Passport pro autentizaci
// Registrace strategie pro nativní přihlášení. Potřeba nastavit posílání požadavku
// do callback funkce pomocí `passReqToCallback` a také jména pole s 
// uživatelským jménem `email`.
passport.use('login-native', new LocalStrategy({
    usernameField: 'email',
    passReqToCallback: true
}, function(req, email, password, done) {
    // Volání funkce v helperu pro autentizaci [AuthHelper](helpers/AuthHelper.html#localAuth).
    AuthHelper.localAuth(email, password).then(function(user) {
        // Nastavení zprávy buď pro úspěšné přihlášení, nebo pro chybu.
        if (user) {
            req.session.success = req.i18n.__('success_logged_in') + user.fullName + '!';
        } else {
            req.session.error = 'Could not log in. Please try again.';
        }
        done(null, user);
    }).catch(function(err) {
        console.log(err);
        req.session.error = err.customMessage;
        done(null, false);
    });
}));

// Registrace strategie pro přihlášení pomocí ISu. Opět potřeba poslat požadavek
// do callback funkce. Zároveň se musí nastavit i `authorizationURL`, `tokenURL`,
// `callbackURL` a správci ISu přidělené `clientID` a `clientSecret` nsatavené v
// `config/global.js`.
passport.use('login-is', new OAuth2Strategy({
    authorizationURL: 'https://is.sh.cvut.cz/oauth/authorize',
    tokenURL: 'https://is.sh.cvut.cz/oauth/token',
    clientID: config.OAUTH_CLIENT_ID,
    clientSecret: config.OAUTH_CLIENT_SECRET,
    callbackURL: "http://gc-dev.sh.cvut.cz/auth/login/is",
    passReqToCallback: true
}, function(req, accessToken, refreshToken, profile, done) {
    var data = {};
    // Nejprve musíme získat data o přihlášené osobě.
    ApiRequest('/v1/users/me?access_token=' + accessToken).then(function(profileData, res) {
        data = JSON.parse(profileData);
        // Následně získáme přidělené služby v ISu přihlášenému uživateli.
        return ApiRequest('/v1/services/mine?access_token=' + accessToken).then(function(servicesData, response) {
            servicesData = JSON.parse(servicesData);
            data.service = null;
            for (var i = 0; i < servicesData.length; i++) {
                if (servicesData[i].service.alias === 'zaklad') {
                    data.service = servicesData[i].service;
                    break;
                }
            }
            // Pokud mezi přidělenými službami není Základní, uživatel nemá oprávnění
            // na použití grilovacího centra.
            if (!data.service) {
                throw new UserDoesNotHaveServiceError();
            }
        });
    }).then(function() {
        data.locale = req.i18n.getLocale();
        // Volání funkce v helperu pro autentizaci [AuthHelper](helpers/AuthHelper.html#isAuth).
        return AuthHelper.isAuth(accessToken, refreshToken, data);
    }).then(function(user) {
        // Nastavení zprávy buď pro úspěšné přihlášení, nebo pro chybu.
        if (user) {
            req.session.success = 'You are successfully logged in ' + user.fullName + '!';
        } else {
            req.session.error = 'Could not log user in. Please try again.';
        }
        done(null, user);
    }).catch(function(err) {
        console.log(err);
        req.session.error = err.customMessage;
        done(null, false);
    });
}));

// Nastavení passport session
passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

// ## Nastavení route potřebujících login
// Pokud uživatel není přihlášen, je přesměrován na přihlašovací stránku.
// Hlavní stránka.
app.get('/', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        next();
    }).catch(function(err) {
        res.redirect('/login');
    });
});

// Všechny uživatelské routy.
app.get('/user*', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        next();
    }).catch(function(err) {
        res.redirect('/login');
    });
});

// Všechny routy vyžadující administrátorská práva.
app.get('/admin*', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        if (req.user.isAdmin) {
            next();
        } else {
            res.send(new UnauthorizedError());
        }
    }).catch(function(err) {
        res.redirect('/login');
    });
});

// Všechny routy pro API.
app.get('/api*', function(req, res, next) {
    AuthHelper.isAuthenticated(req, res, next).then(function() {
        next();
    }).catch(function(err) {
        next(err);
    });
});

// Všechny routy pro API pouze pro administrátory.
app.get('/api/admin*', function(req, res, next) {
    if (req.user.isAdmin) {
        next();
    } else {
        res.send(new UnauthorizedError());
    }
});

// ## Routování
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
app.use('/api/admin/notification', apiAdminNotification);

// ## Odchycení 404
// Přesměruje uživatele na middleware, který řeší chyby.
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// ## Funkce na řešení chyb
// Vlastní funkce pro chyby.
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

// Funkce pro chyby při vývoji, vypíše stacktrace.
if (app.get('env') === 'development' || app.get('env') === 'localhost') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            status: err.status || 500
        });
    });
}

// Funkce pro chyby na produkci, žádný stacktrace.
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        status: err.status || 500
    });
});

// ## Export proměnné app
module.exports = app;
