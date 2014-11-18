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
function juegoTerminado(estado) {

  function mens(s) {
    imprimirNl();
    imprimirNl(s);
    return true;
  }

  switch (estado) {

  case 'empate':
    return mens('Empate.');

  case 'ganaste':
    return mens('Ganaste. ¡Felicidades!');

  case 'perdiste':
    return mens('Perdiste. ¡Lástima!');

  default:
    return false;
  }
}

//------------------------------------------------------------------------------
function jugar(symbol) {

  imprimirNl();
  imprimirNl('Un momento');
  esperarTurno(function (resultado) {

    //--------------------------------------------------------------------------
    function tiroEfectuado(tablero) {
      imprimirNl();
      imprimirTablero(tablero);
      servicioWeb.invocar(
        'GET',
        '/gato/estado/',
        {},
        function (resultado) {
          if (juegoTerminado(resultado.estado)) {
            menu();
          } else {
            jugar(symbol);
          }
        }
      );
    }

    //--------------------------------------------------------------------------
    function tiroNoEfectuado() {
      imprimirNl();
      imprimirNl('ERROR: Tiro inválido.');
      jugar(symbol);
    }
    //--------------------------------------------------------------------------

    imprimirTablero(resultado.tablero);

    if (juegoTerminado(resultado.estado)) {
      menu();

    } else if (resultado.estado === 'tu_turno') {
      imprimirNl();
      imprimirNl('Tú tiras con: ' + symbol);
      imprimirNl();
      imprimirPosicionesTablero();
      leerNumero(0, 8, function (opcion) {
        servicioWeb.invocar(
          'PUT',
          '/gato/tirar/',
          { ren: Math.floor(opcion / 3), col: opcion % 3 },
          function (resultado) {
            if (resultado.efectuado) {
              tiroEfectuado(resultado.tablero);
            } else {
              tiroNoEfectuado();
            }
          }
        );
      });
    }
  });
}

//------------------------------------------------------------------------------
function leerNumero(inicio, fin, callback) {

  imprimir('Selecciona una opción del ' + inicio + ' al ' + fin + ': ');

  stdin.once('data', function (data) {

    var numeroValido = false;

    data = data.toString().trim();

    if (/^\d+$/.test(data)) {
      var num = parseInt(data);
      if (inicio <= num && num <= fin) {
        numeroValido = true;
      }
    }
    if (numeroValido) {
      callback(num);
    } else {
      leerNumero(inicio, fin, callback);
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
function seleccionarJuegosDisponibles(juegos, callback) {

  var total = juegos.length + 1;

  imprimirNl();
  imprimirNl('¿A qué juego deseas unirte?');
  for (var i = 1; i < total; i++) {
    imprimirNl('    (' + i + ') «' + juegos[i - 1].nombre + '»');
  }
  imprimirNl('    (' + total + ') Regresar al menú principal');
  leerNumero(1, total, function (opcion) {
    callback(opcion === total ? -1 : opcion - 1);
  });
}

//------------------------------------------------------------------------------
function titulo() {
  imprimirNl('Juego de Gato distribuido');
  imprimirNl('© 2013-2014 por Ariel Ortiz, ITESM CEM.');
}

//------------------------------------------------------------------------------
function unirJuego() {

  //----------------------------------------------------------------------------
  function verificarUnion(resultado) {
    if (resultado.unido) {
      jugar(resultado.simbolo);
    } else {
      imprimirNl();
      imprimirNl('No es posible unirse a ese juego.');
      menu();
    }
  }
  //----------------------------------------------------------------------------

  servicioWeb.invocar(
    'GET',
    '/gato/juegos_existentes/',
    {},
    function (juegos) {
      if (juegos.length === 0) {
        imprimirNl();
        imprimirNl('No hay juegos disponibles.');
        menu();
      } else {
        seleccionarJuegosDisponibles(juegos, function (opcion) {
          if (opcion === -1) {
            menu();
          } else {
            servicioWeb.invocar(
              'PUT',
              '/gato/unir_juego/',
              { id_juego: juegos[opcion].id },
              verificarUnion
            );
          }
        });
      }
    }
  );
}

//------------------------------------------------------------------------------

titulo();
imprimirNl();
licencia();

if (process.argv.length !== 3) {
  imprimirNl();
  imprimirNl('Se debe indicar: http://<nombre de host>:<puerto>');
  process.exit(0);

} else {
  var webService = webServiceCaller(process.argv[2]);
  stdin.resume();
  menu();
}
