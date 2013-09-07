var persist = require("persist"),
  type = persist.type;

Seller = persist.define('Seller', {
  'name': type.STRING,
  'pwd': type.STRING,
  'phone': type.STRING,
});

Item = persist.define('Item', {
  'price': type.REAL,
  'id': type.INTEGER,
  'description': type.STRING,
}).hasOne(Seller);

exports.Seller = Seller;
exports.Item = Item;
