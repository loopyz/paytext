var express = require('express'),
 cons = require('consolidate');
var app = express();

app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.use(express.bodyParser());

app.get('/', function (req, res) {
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

app.listen(3333);
