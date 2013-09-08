var persist = require("persist"),
  type = persist.type;

Seller = persist.define('Seller', {
  'id': {
      type: type.INTEGER,
      primaryKey: true
  },
  'name': type.STRING,
  'pwd': type.STRING,
  'phone': type.STRING,
});

Item = persist.define('Item', {
  'id': {
      type: type.INTEGER,
      primaryKey: true
  },
  'price': type.REAL,
  'description': type.STRING,
}).hasOne(Seller, {name: 'seller_id'});

Sale = persist.define('Sale', {
  'id': {
      type: type.INTEGER,
      primaryKey: true
  },
  'time_created': type.DATETIME,
  'item_id': type.INTEGER,
  'price': type.REAL,
  'seller_id': type.INTEGER,
});

exports.Seller = Seller;
exports.Item = Item;
exports.Sale = Sale;
