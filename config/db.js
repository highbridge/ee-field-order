// config/db.js
var mysql = require('mysql');
var pool = mysql.createPool({
    host: '',
    user: '',
    password: '',
    database: ''
});

/**
 * getConnection
 *  - sets up a mysql connection pool
 *
 * @param {function} callback
 */
exports.getConnection = function(callback) {
    var cb = callback || function() {};

    pool.getConnection(function(err, connection) {
        cb(err, connection);
    });
};