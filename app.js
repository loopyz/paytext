var express = require('express'),
  cons = require('consolidate');

var app = express();

// non-encrypted passwords :D
var USERS_PASSWORD = {
  lucy: 'pwd',
  nive: 'pwd',
  alexis: 'pwd',
};

app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(express.cookieParser());
app.use(express.bodyParser());

// use this stupid middleware to check if the user is logged before loading
// each page, if he's not ask him to log in.
app.use(function(req, res, next) {
  if (req.path !== '/login' && !req.cookies.user) {
    res.redirect('/login');
  } else {
    next();
  }
});

app.get('/login', function(req, res) {
  res.render('login', {success: false});
});

app.post('/login', function(req, res) {
  var user = req.body.user,
    pwd = req.body.pwd;

  if (USERS_PASSWORD[user] === pwd) {
    // obviously this cookie could be easily forget
    res.cookie('user', user);
    res.render('login', {success: true, user: user});
  } else {
    res.redirect('/login');
  }
});

app.get('/', function(req, res) {
  res.render('index');
});

app.listen(3333);
