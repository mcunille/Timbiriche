#!/usr/bin/env node
/*
 Dots and Boxes Game
 Text Client.
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

'use strict';

//------------------------------------------------------------------------------
var querystring    = require('querystring');
var request				 = require('request');

//------------------------------------------------------------------------------
var stdin					 = process.stdin;
var stdout				 = process.stdout;

var PAUSE					 = 1000;					// Miliseconds between each waiting request.
var GAME_ROOT			 = '/dotsandboxes/';

//------------------------------------------------------------------------------
// Web Service Requests Object Constructor.
function webServiceCaller(host) {
	
	var cookiesSession = null;
	
	//------------------------------------------------------------------------------
	function getCookies(res) {
		var setCookiesValue = res.headers['set-cookies'];
		
		if(setCookiesValue) {
			var cookies = [];
			setCookiesValue.foreach(function () {
					cookies.push(/[^=]+=[^;]+/.exec(str)[1]);
			});
			cookiesSession = cookies.join('; ');
		}
	}
	
	//------------------------------------------------------------------------------
	function headers(method) {
		var r = {};
		
		if(method !== 'GET') {
			r['Content-type'] = 'application/x-www-form-urlencoded';
		}
		
		if(cookiesSession) {
			r['Cookie'] = cookiesSession;
		}
		return r;
	}
	
	//------------------------------------------------------------------------------
	return {
		invoke: function (method, route, params, callback) {
			
			var options = {
				url: host + route,
				mathod: method,
				headers: headers(method)
			};
			
			if(method === 'GET') {
				options.url += '?' + querystring.stringify(params);
			} else {
				options.body = queystring.stringify(params);
			}
			
			request(options, function(error, res, body) {
				
					if(res.statusCode !== 200) {
						fatalError('Not OK status code (' + res.statusCode + ')');
					}
					
					getCookies(res);
					callback(JSON.parse(body));
			});
		}
	}
}

//------------------------------------------------------------------------------
// Create a new game
function createGame() {

  println();
  print('Indica el nombre del juego: ');

  stdin.once('data', function(data) {
    var name = data.toString().trim();

    if (name === '') {
      menu();
    } else {
    
    	print('Indica el tamaño del tablero (5 - 10): ');
    	
    	stdin.once('data', function(data) {
    		var size = data.toString().trim();
    		
    		if (size === '') {
    			menu();
    		} else {
    			servicioWeb.invoke(
        		'POST',
        		GAME_ROOT + 'create_game/',
        		{'name': name, 'size': size},
        		function (result) {

		          if (result.created) {
		            play(result.symbol);
		            return;
		          } else if (result.code === 'duplicate') {
    		        println();
    		        println('Error: Alguien más ya creó un juego con este ' +
    	                  'nombre: ' + name);
		          } else {
    		        println();
    		        println('No se proporcionó un nombre de juego válido.');
    		      }
    		      
		          menu();
        		}
      		);
    		}
    	});
    }
  });
}

//------------------------------------------------------------------------------
// Throw fatal error
function fatalError(message) {
  println('ERROR FATAL: ' + message);
  process.exit(1);
}

//------------------------------------------------------------------------------
// Wait for the player's turn
function waitTurn(callback) {
  webService.invoke(
    'GET',
    GAME_ROOT + 'state/',
    {},
    function (result) {
      if (result.state === 'wait') {
        setTimeout(
          function () {
            waitTurn(callback);
          },
          PAUSE
        );
      } else {
        println();
        callback(result);
      }
    }
  );
}

//-------------------------------------------------------------------------------
// Print the Menu
function printMenu() {
  println();
  println('================');
  println(' MENÚ PRINCIPAL');
  println('================');
  println('(1) Crear un nuevo juego');
  println('(2) Unirse a un juego existente');
  println('(3) Salir');
  println();
}

//------------------------------------------------------------------------------
// Print a message on the screen
function print(message) {
  if (message !== undefined) {
    stdout.write(message);
  }
}

//------------------------------------------------------------------------------
// Print a message on the screen followed by a new line
function println(message) {
  print(message);
  stdout.write('\n');
}

//------------------------------------------------------------------------------
// Print board
//
//   0   1   2   3   4   x 
// 0 .   .   .   .   .
//  
// 1 .   .   .   .   .
//  
// 2 .   .   .   .   .
//  
// 3 .   .   .   .   .
// 
// 4 .   .   .   .   .
//
// y
function printBoard(board) {
	print('  ');
	for(var i = 0; i < board.length; i++) {
		print(i + '   ');
	};
	println();

	for (var row = 0; row < board.length; row++) {
		print(row + ' ');
		for (var column = 0; column < board[row].length; column++) {
			if (column % 2 === 0) {
				print(board[row][column]);
			} else {
				print(' ' + board[row][column] + ' ');
			}
		}
		println();
	}
}

//------------------------------------------------------------------------------
function endGame(state) {

  function message(s) {
    printNl();
    printNl(s);
    return true;
  }

  switch (state) {

  case 'tie':
    return message('Empate.');

  case 'win':
    return message('Ganaste. ¡Felicidades!');

  case 'lost':
    return message('Perdiste. ¡Lástima!');

  default:
    return false;
  }
}

//------------------------------------------------------------------------------
function play(symbol) {

  println();
  println('Un momento');
  waitTurn(function (result) {

    //--------------------------------------------------------------------------
    function moveDone(board) {
      println();
      printBoard(board);
      webService.invoke(
        'GET',
        GAME_ROOT + 'state/',
        {},
        function (result) {
          if (endGame(result.state)) {
            menu();
          } else {
            play(symbol);
          }
        }
      );
    }

    //--------------------------------------------------------------------------
    function moveNotDone() {
      println();
      println('ERROR: Tiro inválido.');
      play(symbol);
    }
    //--------------------------------------------------------------------------

    printBoard(result.board);

    if (endGame(result.state)) {
      menu();

    } else if (result.state === 'your_turn') {
      println();
      println('Tú tiras con: ' + symbol);
      println();
      
      var x1;
      var x2;
      var y1;
      var y2;
      
      var boardLength = result.board.length / 2;
      
      readNumber(0, boardLength, 'x1', function(nX1){
          x1 = nX1;
          readNUmber(0, boardLength, 'x2' function(nX2){
              x2 = nX2;
              readNumber(0, boardLength, 'y1' function(nY1){
                  y1 = nY1;
                  readNumber(0, boardLength, 'y2', function(nY2){
                      y2 = nY2;
                      webService.invoke(
                          'PUT',
                          GAME_ROOT + 'play/',
                          { x1: x1, x2: x2, y1: y1, y2: y2},
                          function(result){
                              if(result.done){
                                  moveDone(result.board);
                              }
                              else{
                                  moveNotDone();
                              }
                          }
                      );
                  });
              });
          });
      });
    }
  });
}

//------------------------------------------------------------------------------
function readNumber(begin, end, label, callback) {

  imprimir('Introduce tu coordenada ' + label + ' del ' + begin + ' al ' + end + ': ');

  stdin.once('data', function (data) {

    var validNumber = false;

    data = data.toString().trim();

    if (/^\d+$/.test(data)) {
      var num = parseInt(data);
      if (begin <= num && num <= end) {
        validNumber = true;
      }
    }
    if (validNUmber) {
      callback(num);
    } else {
      readNumber(begin, end, label ,callback);
    }
  });
}

//------------------------------------------------------------------------------
// Print the license
function license() {
  console.log('Copyright (C) 2014 Mauricio Cunille, Jose Roberto Torres');
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
}

//------------------------------------------------------------------------------
// Menu functionality
function menu() {
  printMenu();
  readNumber(1, 3, function (option) {
    switch (option) {
    case 1:
      createGame();
      break;
    case 2:
      joinGame();
      break;
    case 3:
      process.exit(0);
    }});
}

//------------------------------------------------------------------------------
function selectAvailableGames(games, callback) {

  var total = games.length + 1;

  printnl();
  printnl('¿A qué juego deseas unirte?');
  for (var i = 1; i < total; i++) {
    printnl('    (' + i + ') «' + games[i - 1].name + '»');
  }
  printnl('    (' + total + ') Regresar al menú principal');
  readNumber(1, total, function (option) {
    callback(option === total ? -1 : option - 1);
  });
}

//------------------------------------------------------------------------------
function title() {
  printnl('JUego de Timbiriche distribuido');
  printnl('© 2014 por Mauricio Cunillé Blando y José Roberto Torres, ITESM CEM.');
}

//------------------------------------------------------------------------------
function joinGame() {

  //----------------------------------------------------------------------------
  function verifyJoin(result) {
    if (result.join) {
      play(result.symbol);
    } else {
      printnl();
      printnl('No es posible unirse a ese juego.');
      menu();
    }
  }
  //----------------------------------------------------------------------------

  webService.invoke(
    'GET',
    GAME_ROOT + 'available_game/',
    {},
    function (games) {
      if (games.length === 0) {
        printnl();
        printnl('No hay juegos disponibles.');
        menu();
      } else {
        selectAvailableGames(games, function (option) {
          if (option === -1) {
            menu();
          } else {
            webService.invoke(
              'PUT',
              GAME_ROOT + 'join_game/',
              { id_game: game[option].id },
              varifyJoin
            );
          }
        });
      }
    }
  );
}

//------------------------------------------------------------------------------

title();
printnl();
licese();

if (process.argv.length !== 3) {
  println();
  println('Se debe indicar: http://<nombre de host>:<puerto>');
  process.exit(0);

} else {
  var webService = webServiceCaller(process.argv[2]);
  stdin.resume();
  menu();
}
