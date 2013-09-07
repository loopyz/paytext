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

app.use(express.static('static/'));

// use this stupid middleware to check if the user is logged before loading
// each page, if he's not ask him to log in.
app.use(function(req, res, next) {
  if (req.path !== '/login' && req.path!== '/' && !req.cookies.user) {
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
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

app.get('/dashboard', function (req, res) {
  res.render('dashboard', {user: req.cookies.user});
});

app.get('/', function (req, res) {
  if (req.cookies.user) {
      res.redirect('/dashboard');
  }
  res.render('index');
});

app.post('/generate-qr', function (req, res) {
  var note = 'Thank you for buying '+ req.body.item
  var link = 'venmo.com/?txn=pay&amount=' + req.body.price +
             '&note=' + encodeURIComponent(note) + '&recipients=' +
             req.body.seller;

  var qrcode = 'http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' +
                encodeURIComponent(link);
    res.render('qrcode', { url: qrcode});
});

//app.listen(3333);

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
