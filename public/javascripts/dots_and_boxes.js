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
$(document).ready(function () {

//----------------------------------------------------------------------------
 function createGame() {

    var name = $('#game_name').val().trim();
    var size = $('#game_size').val().trim();
    var players = $('#players_num').val().trim();
    var player_symbol = $('#player_symbol').val().trim();
    
    var isValid = true;

    if (name === '') {
      isValid = false;
      errorMessage('El nombre del juego no puede quedar vacío.');
    }
    
    if (size === '') {
      isValid = false;
      errorMessage('Especifique un tamaño de juego válido.');
    }
    
    if (players === '') {
      isValid = false;
      errorMessage('Introdusca un número válido de jugadores. De 2 - 4.');
    }
    
    if (player_symbol === '') {
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
          if (result.created) {
            $('div').hide();
            $('#simbolo').html(result.symbol);
            $('#mensaje_1').html('Esperando a que alguien más se una al ' +
              'juego <strong>' + scapeHtml(name) + '</strong>.');
            $('#boton_mensajes_regresar_al_menu').hide();
            $('#seccion_mensajes').show();
            $('#seccion_tablero').show();
            waitTurn();
          } else {
            switch (result.code) {

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
  
  //----------------------------------------------------------------------------
  function errorMessage(message) {
    $('body').css('cursor', 'auto');
    $('div').hide();
    $('#error_message').html(message);
    $('#error_section').show();
  }
  
  //----------------------------------------------------------------------------
  // Para evitar inyecciones de HTML.
  function scapeHtml (str) {
    return $('<div/>').text(str).html();
  }
  
  //----------------------------------------------------------------------------
  function waitTurn() {

    var secs = 0;

    $('body').css('cursor', 'wait');

    function ticToc() {
      $('#message_3').html('Llevas ' + secs + ' segundo' +
        (secs === 1 ? '' : 's') + ' esperando.');
      secs++;
      $.ajax({
        url: GAME_ROOT + 'state/',
        type: 'GET',
        dataType: 'json',
        error: conexionError,
        success: function(result) {

          switch (result.state) {

          case 'tu_turno':
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
});