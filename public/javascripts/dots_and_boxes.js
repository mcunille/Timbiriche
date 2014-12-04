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
        }

        if(size === '') {
            isValid = false;
            errorMessage('Especifique un tamaño de juego válido.');
        }

        if(players === '') {
            isValid = false;
            errorMessage('Introdusca un número válido de jugadores. De 2 - 4.');
        }

        if(player_symbol === '') {
            isValid = false;
            errorMessage('Especifique su símbolo de juego.');
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
                    player_symbol: player_symbol
                },
                error: conexionError,
                success: function(result) {
                    var text;
                    if(result.created) {
                        errorMessage('Juego creado')
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
                            turnoTirar(result.board);
                            break;

                        case 'wait':
                            setTimeout(ticToc, PAUSE);
                            break;

                        case 'tie':
                            actualizar(result.board);
                            finDeJuego('<strong>Empate.</strong>');
                            break;

                        case 'win':
                            finDeJuego('<strong>Ganaste.</strong> ¡Felicidades!');
                            resalta(result.board);
                            break;

                        case 'lost':
                            finDeJuego('<strong>Perdiste.</strong> ¡Lástima!');
                            actualizar(result.board);
                            resalta(result.board);
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
        var symbol = 'a';

        $.ajax({
            url: GAME_ROOT + 'join_game/',
            type: 'PUT',
            dataType: 'json',
            data: { id_game: id, symbol: symbol },
            error: conexionError,
            success: function(result) {
                if(result.joined && result.code === 'ok') {
                    errorMessage('Por favor espera tu turno.');
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

    function showMainMenu() {
        eraseErrorMessage();
        $('#new_game').fadeOut("slow", function() {
            $('#main_menu_button').fadeOut("slow", function() {
                $('#main_menu').fadeIn("slow");
            });
        });
    }

    function eraseErrorMessage() {
        $('#error_message').fadeOut("slow");
        $('#error_message').html("");
    }
});