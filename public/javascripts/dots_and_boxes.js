var GAME_ROOT = '/dotsandboxes/';

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
      mensajeError('Especifique un tamaño de juego válido.');
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
        error: conectionError,
        success: function(result) {
          var text;
          if (result.created) {
            $('div').hide();
            $('#simbolo').html(resultado.simbolo);
            $('#mensaje_1').html('Esperando a que alguien más se una al ' +
              'juego <strong>' + scapeHtml(nombre) + '</strong>.');
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
      $('#mensaje_3').html('Llevas ' + secs + ' segundo' +
        (secs === 1 ? '' : 's') + ' esperando.');
      secs++;
      $.ajax({
        url: '/gato/estado/',
        type: 'GET',
        dataType: 'json',
        error: errorConexion,
        success: function(resultado) {

          switch (resultado.estado) {

          case 'tu_turno':
            turnoTirar(resultado.tablero);
            break;

          case 'espera':
            setTimeout(ticToc, PAUSA);
            break;

          case 'empate':
            actualizar(resultado.tablero);
            finDeJuego('<strong>Empate.</strong>');
            break;

          case 'ganaste':
            finDeJuego('<strong>Ganaste.</strong> ¡Felicidades!');
            resalta(resultado.tablero);
            break;

          case 'perdiste':
            finDeJuego('<strong>Perdiste.</strong> ¡Lástima!');
            actualizar(resultado.tablero);
            resalta(resultado.tablero);
            break;
          }
        }
      });
    };
    setTimeout(ticToc, 0);
  };