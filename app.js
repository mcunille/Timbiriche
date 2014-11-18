/*
 Dots and Boxes Game
 Web server.
 Copyright (C) 2014 by Mauricio Cunille Blando and Jose Roberto Torres
 Based on "Juego de Gato distribuido" Copyright (C) 2013-2014 by Ariel Ortiz

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict'

var express 				= require('express');
var path 						= require('path');
var favicon 				= require('serve-favicon');
var logger 					= require('morgan');
var cookieParser 		= require('cookie-parser');
var bodyParser 			= require('body-parser');

// Aditional modules
var cookieSession  = require('cookie-session');
var mongoose       = require('mongoose');
var game          = require('./package.json');
var routes = require('./routes/index');

var app = express();

// Session management
app.use(cookieSession({ secret: 'Secret string for Dots and Boxes ;)' }));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;

// Application startup
console.log("Distributed Dots and Boxes Game, version " + game.version);
console.log(game.author);
console.log();

console.log('This program is free software; you can redistribute it and/or ');
console.log('modify it under the terms of the GNU General Public License as');
console.log('published by the Free Software Foundation; either version 3 of');
console.log('the License, or (at your option) any later version.');
  
console.log();
console.log('This program is distributed in the hope that it will be useful,');
console.log('but WITHOUT ANY WARRANTY; without even the implied warranty of');
console.log('MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the');
console.log('GNU General Public License for more details.');
  
console.log();
console.log('You should have received a copy of the GNU General Public');
console.log('License along with this program; if not, see');
console.log('<http://www.gnu.org/licenses>.');
  
console.log();
console.log('You can download the source code from');
console.log('<https://github.com/mcunille/Timbiriche.git>.');
console.log();

// DB connection
mongoose.connect('mongodb://localhost/dotsandboxes');
mongoose.connection.on('open', function () {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', function (err) {
  console.log('Mongoose Error. ' + err);
});

