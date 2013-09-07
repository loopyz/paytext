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

exports.Seller = Seller;
exports.Item = Item;
