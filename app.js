var express = require('express'),
  cons = require('consolidate'),
  request = require('request'),
  persist = require('persist'),
  io = require('socket.io'),
  models = require('./models');

var app = express(),
  IO;

var CONNECTION = null;

//anyone can access the following pages
var ALL_ACCESS = ['/', '/login', '/signup', '/purchase', '/make_purchase', '/api'];

var generate_qr = function (id) {
    var link = 'paytext.herokuapp.com/purchase/' + id;
    return 'http://chart.apis.google.com/chart?cht=qr&chs=300x300&chl=' +
      encodeURIComponent(link);
};

var get_items = function (seller_id, callback) {
  models.Item.where('sellerId = ?', seller_id).all(CONNECTION,
      function (err, items) {
        callback(items);
      });
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
  var can_access = false;

  for (var i=0; i<ALL_ACCESS.length; i++) {
    can_access = can_access || (req.path.indexOf(ALL_ACCESS[i]) === 0);
  }

  if (!can_access && !req.cookies.user) {
    res.redirect('/');
  } else {
    next();
  }
});

app.use(function(req, res, next) {
  if (req.cookies.user) {
    models.Seller.where({'name':req.cookies.user}).first(CONNECTION,
        function(err, seller) {
          req.seller = seller;
          next();
        });
  } else {
    next();
  }

});

app.post('/login', function(req, res) {
  var user = req.body.user,
    pwd = req.body.pwd;

  models.Seller.where({'name':user, 'pwd': pwd}).count(CONNECTION,
    function(err, count) {
      if (count >= 1) {
        // obviously this cookie could be easily forget
        res.cookie('user', user);
        res.redirect('/dashboard');
      } else {
        res.render('index', {loginFailed: true});
      }
  });

});

app.get('/signup', function (req, res) {
  res.render('signup');
});

app.post('/signup', function (req, res) {
  var user = req.body.user,
  pwd = req.body.pwd,
  repwd = req.body.repwd,
  phone = req.body.phone;

  //confirm the same password is entered twice
  if (pwd!==repwd) {
    res.render('signup', {error: '<a class="close" data-dismiss="alert" href="#">Passwords did not match!</a>'});
    return;
  }

  var seller = new models.Seller({
      name: user,
      pwd: pwd,
      phone: phone
  });

  //add user to database
  seller.save(CONNECTION, function (err) {
      //redirect them somewhere useful
      res.cookie('user', user);
      res.redirect('/dashboard');
  });

});

app.get('/', function (req, res) {
  if (req.cookies.user) {
      res.redirect('/dashboard');
  }
  res.render('index');
});

app.get('/dashboard', function (req, res) {
  get_items(req.seller.id, function (items) {
    res.render('dashboard', {
        user: req.cookies.user,
        sidebar_items: items
    });
  });
});

app.get('/add-item', function (req, res) {
  get_items(req.seller.id, function (items) {
    res.render('add-item', {
        user: req.cookies.user,
        sidebar_items: items
    });
  });
});

app.post('/add-item', function (req, res) {

  var item = new models.Item({
    price: req.body.price,
    seller: req.seller,
    description: req.body.description
  });

  item.save(CONNECTION, function (err) {
      get_items(req.seller.id, function (items) {
        res.render('add-item', {
            user: req.cookies.user,
            sidebar_items: items,
            url: generate_qr(item.id)
        });
      });
  });

});

app.get('/delete-item', function (req, res) {

    get_items(req.seller.id, function (items) {
      res.render('delete-item', {
          user: req.cookies.user,
          items: items,
          sidebar_items: items
      });
    });
});

app.post('/delete-item', function (req, res) {
  var deleteLen,
    deleteItems;


  if (req.body.deleteItems instanceof Array) {
    deleteLen = req.body.deleteItems ? req.body.deleteItems.length : 0;
    deleteItems = req.body.deleteItems;
  }
  else if (req.body.deleteItems) {
    deleteLen = 1;
    deleteItems = [req.body.deleteItems];
  } else {
    deleteLen = 0;
    deleteItems = [];
  }

  deleteItems.forEach(function (id) {
    models.Item.getById(CONNECTION, id, function (err, item) {
      item.delete(CONNECTION, function (err) {
        deleteLen--;
        if (deleteLen===0) {
            get_items(req.seller.id, function (items) {
              res.render('delete-item', {
                  user: req.cookies.user,
                  items: items,
                  sidebar_items: items
              });
            });
        }
      });
    });
  });
});

app.get('/qrcodes', function (req, res) {

  models.Item.where('sellerId = ?', req.seller.id).all(CONNECTION,
      function (err, items) {
        items.forEach(function (item) {
            item.link = generate_qr(item.id);
        });

        res.render('qrcodes', {
            user: req.cookies.user,
            items: items,
            sidebar_items: items
        });
      });
});

app.get('/item/:id', function (req, res) {
  var quiche = require('quiche');

  var chart = quiche('line');
  chart.setTitle('Items Sold');
  chart.addData([0, 1, 1, 2, 3, 5, 8, 13, 21], "Cookie", '999999');
  chart.addAxisLabels('x', ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept']);
  chart.setAutoScaling();
  chart.setTransparentBackground();

  var imageUrl = chart.getUrl(true);

  models.Item.getById(CONNECTION, req.params.id, function (err, item) {
  models.Sale.where('item_id = ?', req.params.id).count(CONNECTION,
      function (err, total_quantity) {
        models.Sale.where('item_id = ?', req.params.id).sum(CONNECTION, 'price',
            function (err, total_revenue) {
              CONNECTION.runSqlAll("SELECT COUNT(*) as quantity FROM Sales WHERE item_id=?" +
                  " AND time_created>='2013-09-08'", [req.params.id],
                  function (err, res_quantity) {
                      CONNECTION.runSqlAll("SELECT SUM('price') as revenue FROM Sales " +
                          " WHERE item_id=? AND time_created>='2013-09-08'",
                          [req.params.id], function (err, res_revenue) {
                            get_items(req.seller.id, function (items) {
                              res.render('item', {
                                user: req.cookies.user,
                                total_quantity: total_quantity || 0,
                                today_quantity: res_quantity[0].quantity || 0,
                                total_revenue: total_revenue || 0,
                                today_revenue: res_revenue[0].revenue || 0,
                                graphurl: imageUrl,
                                item: item,
                                sidebar_items: items
                              });
                            });
                          });
                  });
            });
      });
  });

});

app.get('/', function (req, res) {
  if (req.cookies.user) {
      res.redirect('/dashboard');
  }
  res.render('index');
});

app.get('/purchase/:id', function (req, res) {
  res.cookie('buying', req.params.id);
  res.redirect(
    'https://api.venmo.com/oauth/authorize?client_id=1347&scope=make_payments&response_type=token'
  );
});

app.get('/make_purchase', function (req, res) {
  var id = parseInt(req.cookies.buying, 10),
    description,
    price,
    seller_phone,
    d = new Date();
  res.cookie('buying', '');

  models.Item.where('id = ?', id).first(CONNECTION, function (err, item) {
    price = item.price;
    description = item.description;

    models.Seller.where('id = ?', item.sellerId).first(CONNECTION,
        function (err, seller) {
          seller_phone = seller.phone;
          request.post(
            'https://api.venmo.com/payments',
            { form: {
              access_token: req.query.access_token,
              phone: seller_phone,
              note: 'You bought ' + description + ' at ' + d.getHours() + ' : ' +
                d.getMinutes() + ' : ' + d.getSeconds(),
              amount: price,
              audience: 'private',
            }}
          , function (err, response, body) {
            var response = JSON.parse(body),
              failed = !!(err || response['error'] ||
                (response['status'] !== 'PAYMENT_SETTLED'));
            if (!failed) {
              var sale = new models.Sale({
                seller_id: seller.id,
                item_id: item.id,
                price: item.price
              });

              sale.save(CONNECTION, function (err) {
                //do nothing
              });
            }
            res.render('bought', {
                description: description,
                price: price,
                failed: failed,
                error: JSON.stringify(response['error'])
            });
          });
        });
  });

});

app.get('/api/bake_cookies/:payee_phone', function (req, res) {
  var payee_phone = req.params.payee_phone,
    amount = req.query.amount,
    payee_id = req.query.payee_id,
    link = 'paytext.herokuapp.com:5000/api/pay';

  res.cookie('api_amount', amount);
  res.cookie('api_payee_phone', payee_phone);
  res.cookie('api_payee_id', payee_id);

  res.redirect(
    'https://api.venmo.com/oauth/authorize?client_id=1362&scope=make_payments&response_type=token'
  );
});

app.get('/api/pay', function (req, res) {
  var amount = req.cookies.api_amount,
    payee_phone = req.cookies.api_payee_phone,
    payee_id = req.cookies.api_payee_id,
    d = new Date();

  res.cookie('api_amount', '');
  res.cookie('api_payee_phone', '');
  res.cookie('api_payee_id', '');

  request.post(
    'https://api.venmo.com/payments',
    { form: {
      access_token: req.query.access_token,
      phone: payee_phone,
      note: 'Bought some stuff at ' + d.getHours() + ' : ' +
        d.getMinutes() + ' : ' + d.getSeconds(),
      amount: amount,
      audience: 'private',
    }}
  , function (err, response, body) {
    var response = JSON.parse(body),
      failed = !!(err || response['error'] || (response['status'] !== 'PAYMENT_SETTLED'));

    if (failed) {
      res.render('bought_via_api', {failed: failed, error: JSON.stringify(response['error'])});
      IO.sockets.in(req.query.payee_id).emit('fail', {});
    } else {
      res.render('bought_via_api', {failed: failed});
      IO.sockets.in(req.query.payee_id).emit('payment', {amount: amount});
    }
  });

});

app.get('/api/updates/:payee_id', function (req, res) {
  // TODO: auth...
  res.render('updates', {payee_id: req.params.payee_id});
});

app.get('/example', function (req, res) {
  //var e = document.getElementById("ddlViewBy");
  //var strUser = e.options[e.selectedIndex].value;
  //console.log("OH HEY: " + strUser);
  res.render('example');
});

app.get('/logout', function (req, res) {
  res.cookie('user', '');
  res.redirect('/');
});

var port = process.env.PORT || 5000;

persist.connect({
  driver: 'sqlite3',
  filename: ':memory:',
  trace: true
}, function (err, conn) {
  if (err) {
    console.error('bummer ;(');
  } else {
    CONNECTION = conn;

    conn.runSql("CREATE TABLE Sellers (id integer primary key autoincrement, name text, pwd text, phone text)", [], function (err, results) {
        conn.runSql("CREATE TABLE Items (id integer primary key autoincrement, price real, description text, seller_id integer, FOREIGN KEY(seller_id) REFERENCES Seller(id))", [], function (err2, results2) {
          conn.runSql("CREATE TABLE Sales (id integer primary key autoincrement, time_created datetime default current_timestamp, item_id integer, price id integer, seller_id integer)", [], function (err3, results3) {
            var seller = new models.Seller({
              name: 'admin',
              pwd: 'admin',
              phone: '9255968005'
            });

            seller.save(conn, function (err) {
              var server = require('http').createServer(app);
              server.listen(port, function() {
                console.log("Listening on " + port);
              });

              IO = io.listen(server);

              IO.configure(function () {
                IO.set("transports", ["xhr-polling"]);
                IO.set("polling duration", 10);
              });

              IO.sockets.on('connection', function (socket) {
                socket.on('sub', function (data) {
                  socket.join(data);
                });
              });
            });
          });

        });
    });
  }
});
