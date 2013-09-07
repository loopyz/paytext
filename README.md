paytext
=======

1. Seller Table Schema
CREATE TABLE Sellers (id integer primary key autoincrement, name text, pwd text, phone text);

2. Item Table Schema
CREATE TABLE Items (id integer primary key autoincrement, price real, description text, link text, seller_id integer, FOREIGN KEY(seller_id) REFERENCES Seller(id));
