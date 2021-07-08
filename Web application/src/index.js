const express = require('express');

const app = express();

require('dotenv').config();
const pg = require('pg');
const { PORT } = process.env;
const { DB_HOST } = process.env;
const { DB_USER } = process.env;
const { DB_PASS } = process.env;
const { DB_NAME } = process.env;
const { DB_PORT } = process.env;
const pgcon = new pg.Client({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    port: DB_PORT
});

const path = require('path');

app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '/css')));
app.use(express.static(path.join(__dirname, '/img')));

app.get('/', (req, response) => {
    if (req.query.id) {
        pgcon.connect(function (err) {
            pgcon.query('SELECT * FROM productlist WHERE maSanPham=' + req.query.id, (err, res) => {
                if (err) {
                    response.render('main', {
                        errors: err.message,
                        masp: req.query.id,
                    });
                } else {
                    if (res.rows.length == 0) {
                        response.render('main', {
                            masp: req.query.id,
                        });
                    } else {
                        response.render('main', {
                            masp: req.query.id,
                            products: res.rows,
                        });
                    }
                }
            })
        })
    } else {
        response.render('main');
    }
});

app.listen(PORT);
