var express = require('express'),
  cons = require('consolidate'),
  request = require('request');

var app = express();

// non-encrypted passwords :D
var USERS_PASSWORD = {
  lucy: 'pwd',
  nive: 'pwd',
  alexis: 'pwd',
};

var SELLER_PHONE = '4087181204';

var ITEMS_COST = {
  123: 0.01,
  456: 0.01,
  789: 0.01,
}

app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');


app.use(express.cookieParser());
app.use(express.bodyParser());

app.use(express.static('static/'));

// use this stupid middleware to check if the user is logged before loading
// each page, if he's not ask him to log in.
app.use(function(req, res, next) {
  if (req.path!=='/login' && req.path!=='/' && req.path!='/signup' &&
      !req.cookies.user) {
    res.redirect('/');
  } else {
    next();
  }
});

app.post('/login', function(req, res) {
  var user = req.body.user,
    pwd = req.body.pwd;

  if (USERS_PASSWORD[user] === pwd) {
    // obviously this cookie could be easily forget
    res.cookie('user', user);
    res.redirect('/dashboard');
  } else {
    res.render('index', {loginFailed: true});
  }
});

app.get('/signup', function (req, res) {
  res.render('signup');
});

app.post('/signup', function (req, res) {
  var user = req.body.user,
  pwd = req.body.pwd,
  repwd = req.body.repwd;

  //confirm the same password is entered twice
  if (pwd!==repwd) {
    res.render('signup', {error: 'Please enter the same password twice'});
    return;
  }

  //add user to database


  //redirect them somewhere useful
  res.cookie('user', user);
  res.redirect('/dashboard');
});

app.get('/dashboard', function (req, res) {
  res.render('dashboard', {user: req.cookies.user});
});

app.get('/generate', function (req, res) {
  res.render('generate', {user: req.cookies.user});
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
    res.render('generate', { url: qrcode});
});

app.get('/purchase/:id', function (req, res) {
  res.cookie('buying', req.params.id);
  res.redirect(
    'https://api.venmo.com/oauth/authorize?client_id=1347&scope=make_payments&response_type=token'
  );
});

app.get('/make_purchase', function (req, res) {
  var item = parseInt(req.cookies.buying, 10),
    cost = ITEMS_COST[item];
  res.cookie('buying', '');

  request.post(
    'https://api.venmo.com/payments',
    { form: {
      access_token: req.query.access_token,
      phone: SELLER_PHONE,
      note: 'You bought item ' + item,
      amount: cost,
    }}
  , function (err, response, body) {
    var response = JSON.parse(body),
      failed = err || response['error'] || response['status'] !== 'PAYMENT_SETTLED';
    res.render('bought', {item: item, cost: cost, failed: failed, error: response['error']});
  });
});

app.get('/logout', function (req, res) {
  res.cookie('user', '');
  res.redirect('/');
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
