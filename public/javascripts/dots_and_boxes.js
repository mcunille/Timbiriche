/*
 Dots and Boxes distributed game.
 Web client.
 Copyright (C) 2014 by José Roberto Torres and Mauricio Cunillé Blando.

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

var GAME_ROOT = '/dotsandboxes/';
var PAUSE = 1000;

//------------------------------------------------------------------------------
$(document).ready(function() {
    eraseErrorMessage();
    $('#new_game_button').click(displayNewGameForm);
    $('#create_game_button').click(createGame);
    $('#main_menu_button').click(showMainMenu);

    //----------------------------------------------------------------------------
    function createGame() {
        eraseErrorMessage();

        var name = $('#game_name').val().trim();
        var size = $('#game_size').val().trim();
        var players = $('#players_num').val().trim();
        var player_symbol = $('#player_symbol').val().trim();

        var isValid = true;

        if(name === '') {
            isValid = false;
            errorMessage('El nombre del juego no puede quedar vacío.');
            return false;
        }

        if(size === '') {
            isValid = false;
            errorMessage('Especifique un tamaño de juego válido.');
            return false;
        }

        if(players === '') {
            isValid = false;
            errorMessage('Introduzca un número válido de jugadores. De 2 - 4.');
            return false;
        }

        if(player_symbol === '') {
            isValid = false;
            errorMessage('Especifique su símbolo de juego.');
            return false;
        }

        if(isValid) {

            $.ajax({
                url: GAME_ROOT + 'create_game/',
                type: 'POST',
                dataType: 'json',
                data: {
                    name: name,
                    size: size,
                    players: players,
                    symbol: player_symbol
                },
                error: conexionError,
                success: function(result) {
                    var text;
                    if(result.created) {
                        errorMessage('Por favor espera tu turno.');
                        $('#main_menu_button').fadeOut(function() {
                            $('#new_game').fadeOut("slow", function() {
                                $('#board_wrapper').fadeIn("slow");
                            });
                        });
                        waitTurn();
                    } else {
                        switch(result.code) {

                            case 'duplicate':
                                text = 'Alguien más ya creó un juego con este ' +
                'nombre: <em>' + scapeHtml(name) + '</em>';
                                break;

                            case 'invalid':
                                text = 'No se proporcionó un nombre de juego válido.';
                                break;

                            default:
                                text = 'Error desconocido.';
                                break;
                        }
                        errorMessage(text);
                    }
                }
            });
        }
        return false; // Se requiere para evitar que la forma haga un "submit".
    }

    //------------------------------------------------------------------------------

    $('#get_games_button').click(function() {
        $.ajax({
            url: GAME_ROOT + 'available_games/',
            type: 'GET',
            dataType: 'json',
            error: conexionError,
            success: function(result) {

                if(result.length === 0) {
                    errorMessage("No hay juegos disponibles");
                } else {
                    var gList = result.map(function(x) {
                        return '<li value="' + x.id + '" class="game">' + scapeHtml(x.name) + '</li>'
                    });

                    $('#games_list > ul').html(gList.join(''));

                    $('.game').click(joinGame);

                    $('#main_menu').fadeOut("slow", function() {
                        $('#main_menu_button').fadeIn("slow", function() {
                            $('#games_list').fadeIn("slow");
                        });
                    });
                }
            }
        });
    });

    //----------------------------------------------------------------------------
    function errorMessage(message) {
        $('body').css('cursor', 'auto');
        $('#error_message').html(message);
        $('#error_message').fadeIn("slow");
    }

    //----------------------------------------------------------------------------
    // Para evitar inyecciones de HTML.
    function scapeHtml(str) {
        return $('<div/>').text(str).html();
    }

    //----------------------------------------------------------------------------
    function waitTurn() {
        eraseErrorMessage();

        var secs = 0;

        $('body').css('cursor', 'wait');

        function ticToc() {
            errorMessage('Llevas ' + secs + ' segundo' + (secs === 1 ? '' : 's') + ' esperando.');
            secs++;
            $.ajax({
                url: GAME_ROOT + 'state/',
                type: 'GET',
                dataType: 'json',
                error: conexionError,
                success: function(result) {

                    switch(result.state) {

                        case 'your_turn':
                            updateBoard(result.board);
                            errorMessage('<strong>Es tu turno.</strong>');
                            $('.dash_active').click(makeMove);
                            break;

                        case 'wait':
                            setTimeout(ticToc, PAUSE);
                            break;

                        case 'tie':
                            updateBoard(result.board);
                            errorMessage('<strong>Empate.</strong>');
                            break;

                        case 'win':
                            updateBoard(result.board);
                            errorMessage('<strong>Ganaste.</strong> ¡Felicidades!');
                            break;

                        case 'lost':
                            updateBoard(result.board);
                            errorMessage('<strong>Perdiste.</strong> ¡Lástima!');
                            break;
                    }
                }
            });
        };
        setTimeout(ticToc, 0);
    };

    //----------------------------------------------------------------------------
    function conexionError() {
        errorMessage('No es posible conectarse al servidor.');
    }

    //----------------------------------------------------------------------------
    function joinGame() {
        eraseErrorMessage();

        var id = $(this).attr("value");
        var symbol = $('#guest_symbol').val().trim();

        if(symbol === '') {
            errorMessage('Debes introducir tu símbolo');
            return false;
        }

        $.ajax({
            url: GAME_ROOT + 'join_game/',
            type: 'PUT',
            dataType: 'json',
            data: { id_game: id, symbol: symbol },
            error: conexionError,
            success: function(result) {
                if(result.joined) {
                    errorMessage('Por favor espera tu turno.');
                    $('#main_menu_button').fadeOut("slow", function() {
                        $('#games_list').fadeOut("slow", function() {
                            $('#board_wrapper').fadeIn("slow");
                        });
                    });
                    waitTurn();
                }
                else {
                    switch(result.code) {
                        case 'bad_id':
                            errorMessage('Error al unirse al juego: ' + name);
                            break;
                        case 'used_symbol':
                            errorMessage('El símbolo: ' + symbol + ' ya está en uso.');
                            break;
                        default:
                            errorMessage('No es posible unirse al juego, inténtelo más tarde.');
                    }
                }
            }
        });
    }

    //----------------------------------------------------------------------------
    function displayNewGameForm() {
        eraseErrorMessage();
        $('#main_menu').fadeOut("slow", function() {
            $('#main_menu_button').fadeIn("slow", function() {
                $('#new_game').fadeIn("slow");
            });
        });
    }

    //---------------------------------------------------------------------------------

    function updateBoard(board) {
        var row = -1;
        var col = -1;

        var newBoard = board.map(function(x) {
	    col = -1;
	    row++;
            return '<tr>' + x.map(function(y) {
		col++;
                if((row % 2) === 0 && (col % 2) === 0) {
                    return '<td><p class="point">' + y + '</p></td>';
                } else if((row % 2) !== 0 && (col % 2) !== 0) {
		    if (y === ' ') {
				return '<td><p class="letter">*</p></td>';
			
			    } else {
				return '<td><p class="letter">' + y + '</p></td>';
			
			    }
                } else {
                    if((row % 2) === 0) {
			if(y === ' ') {
			    return '<td><p class="dash_active" xM="'+col+'" yM="'+row+'">--</p></td>';
			} else {
			    return '<td><p class="dash_inactive">' + y + '</p></td>';
			}
                    } else {
if(y === ' ') {
			return '<td><p class="dash_active" xM="'+col+'" yM="'+row+'">|</p></td>';
		    } else {
			return '<td><p class="dash_inactive">' + y + '</p></td>';
		    }
                    }
                }
            }) + '</tr>';
        });

        $('#game_board').html(newBoard.join(''));
    }

    //-------------------------------------------------------------------------------
    function showMainMenu() {
        eraseErrorMessage();
        if($('#new_game').is(':visible')) {
            $('#new_game').fadeOut("slow", function() {
                $('#main_menu_button').fadeOut("slow", function() {
                    $('#main_menu').fadeIn("slow");
                });
            });
        }
        else {
            $('#games_list').fadeOut("slow", function() {
                $('#main_menu_button').fadeOut("slow", function() {
                    $('#main_menu').fadeIn("slow");
                });
            });
        }
    }

    function eraseErrorMessage() {
        $('#error_message').fadeOut("slow");
        $('#error_message').html("");
    }

    //---------------------------------------------------------------------
    function makeMove() {
        eraseErrorMessage();

	var xM = $(this).attr("xM");
	var yM = $(this).attr("yM");

        var x1 = Math.floor(xM / 2);
        var x2 = Math.floor(xM / 2) + (xM % 2);
	var y1 = Math.floor(yM / 2);
        var y2 = Math.floor(yM / 2) + (yM % 2);

	
        $.ajax({
            url: GAME_ROOT + 'play/',
            type: 'PUT',
            dataType: 'json',
            data: { 'x1': x1, 'x2': x2, 'y1': y1, 'y2': y2 },
            error: conexionError,
            success: function(result) {
                if(result.done) {
                    updateBoard(result.board);
										waitTurn();
                } else {
                    if (result.code === 'invalid_turn') {
    		errorMessage('El servidor ha experimentado un problema.');
    	} else {
      	errorMessage('ERROR: Tiro inválido.');
      	waitTurn();
      }
                }
            }
        });
    }
});
