var fs = require('fs');
var glob = require('glob');
var _ = require('underscore');
var db = require('./config/db');

// arguments
var args = process.argv.slice(2);
if(!args.length)
    return console.log('usage: node index.js [path/to/files/] [file-expression]');

var tmplPath = args[0]; // '/path/to/template/group/'
var fileExp = args[1]; // File(s) expression: '*.html'

// parse our file
// for fields
var parseFile = function(file, callback) {
    var cb = callback || function() {};
    var fields = [];
    fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
            console.log(err);
            process.exit();
        }
        var lines = data.split("\n");
        _.each(lines, function(line) {
            field = line.match(/(\{.*\})/);

            if (field) {
                 var invalid = field[0].match(/(\'|\"|if|segment|\\|\/)/);
                 if(!invalid) {
                    var f = field[0].replace(/\{|\}|\:|options|field/g, '');
                    fields.push(f);
                 }          
            }
        });

        cb(fields);
    });
};

// update the database with
// the correct field order
var updateDbFieldOrder = function(channel, fields) {
    console.log('Updating order for ' + channel);

    var total = fields.length - 1;

    db.getConnection(function(err, connection) {
        if (err) {
            console.log(err);
            process.exit();
        }

        _.each(fields, function(field, index) {

            var query = 'UPDATE exp_channel_fields ' +
                        'SET field_order = ? ' +
                        'WHERE field_name = ?';

            connection.query(query, [index, field], function(err, result) {
                if(err) {
                    console.log(err);
                    process.exit();
                }

                if (index == total) {
                    connection.release();
                    console.log('Done updating ' + channel + '!');
                }
            });
        });

    });
}

// start by looping through all template files
glob(tmplPath + fileExp, function(er, files) {
    var channels = {};

    _.each(files, function(file, index) {

        // setup channel
        var channelName = file.replace(tmplPath, '').replace(/(step|\.html|[0-9])/g, '');
        channelName = channelName.replace(/_/g, '-').replace(/-{2}/g, '');
        if (typeof(channels[channelName]) == 'undefined') {
            console.log('Getting fields for ' + channelName);
            channels[channelName] = [];
        }

        parseFile(file, function(data) {
            if (data.length) {
                channels[channelName] = channels[channelName].concat(data);
            }
            // async update the
            // database field order
            if (index == (files.length - 1)) {
                _.each(channels, function(fields, channelName) {
                    console.log('Found ' + (fields.length+1) + ' fields for ' + channelName);
                    updateDbFieldOrder(channelName, fields);
                });
            }
        });

    });
});