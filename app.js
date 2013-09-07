var express = require('express'),
 cons = require('consolidate');
var app = express();

app.engine('html', cons.swig);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');


app.get('/', function(req, res){
  res.render('index');
});

app.listen(3333);
