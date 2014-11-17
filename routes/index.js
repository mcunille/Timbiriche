/*
 Dots and Boxes Game
 Web services implementation
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
var express    = require('express');
var router     = express.Router();
var async      = require('async');
var mongoose   = require('mongoose');
var constants = require('../models/constants.js');
var Game      = require('../models/game.js');
var Player    = require('../models/player.js');

module.exports = router;

//------------------------------------------------------------------------------

var ObjectId   = mongoose.Schema.Types.ObjectId;
var ABORT    = true;

var GAME_ROOT = '/dotsandboxes/';

/* REDIRECT root to timbiriche */
router.get('/', function(req, res) {
  res.redirect(GAME_ROOT);
});

/* GET index */
router.get(GAME_ROOT, function (req, res) {
  res.render('index.ejs');
});

/* POST create_game */
router.post(GAME_ROOT + 'create_game/', function (req, res) {

  var result = { created: false, code: 'invalid' };
  var name = req.body.name;
  var size = req.body.size;
  var player_symbol = req.body.symbol;
  var game;
  var player;

  if (name) {
    async.waterfall([
      //------------------------------------------------------------------------
      function (callback) {
        Game.find({ name: name, started: false}, callback);
      },
      //------------------------------------------------------------------------
      function (games, callback) {
        if (games.length === 0) {
          game = new Game({
          	name: name, 
          	turn: player_symbol, 
          	board: Game.createBoardString(size)});
          game.save(callback);
        } else {
          result.code = 'duplicate';
          callback(ABORT);
        }
      },
      //------------------------------------------------------------------------
      function (_game, _n, callback) {
        player = new Player({ 
        		game: game._id,
            symbol: player_symbol});
        player.save(callback);
      },
      //------------------------------------------------------------------------
      function (_player, _n, callback) {
        req.session.id_player = player._id;
        result.created = true;
        result.code = 'ok';
        result.symbol = player.symbol;
        callback(null);
      }
    ],
    //--------------------------------------------------------------------------
    function (err) {
      if (err && err !== ABORT) {
        console.log(err);
      }
      res.json(result);
    });
  }
});

/* GET state */
router.get(GAME_ROOT + 'state/', function (req, res) {

  var result = { state: 'error'};

  getGamePlayer(req, function (err, game, player) {
    //--------------------------------------------------------------------------
    function deleteGamePlayers () {
      async.waterfall([
        //----------------------------------------------------------------------
        function (callback) {
          delete req.session.id_player;
          player.remove(callback);
        },
        //----------------------------------------------------------------------
        function (deletedPlayer, callback) {
          Player.find({ game: game._id }, callback);
        },
        //----------------------------------------------------------------------
        function (players, callback) {
          if (players.length === 0) {
            game.remove(callback);
          } else {
            callback(null);
          }
        }
      ],
      //------------------------------------------------------------------------
      function (err) {
        if (err) {
          console.log(err);
        }
        res.json(result);
      });
    };
/* ******************************************* */
    //--------------------------------------------------------------------------
    function gameResult(symbol, board) {
      return 'tie';
    }

    //--------------------------------------------------------------------------
    function full(t) {
      for (var i = 0; i < t.length; i++) {
        for (var j = 0; j < t[j].length; j++) {
          if (t[i][j] === ' ') return false;
        }
      }
      return true;
    }
    //--------------------------------------------------------------------------

    if (err) {
      console.log(err);
      res.json(result);
    } else {

      var board = game.getBoard();

      result.board = board;

      if (!game.started) {
        result.state = 'wait';
        res.json(result);

      } else if (full(board)) {
        result.state = gameResult(player.symbol, board);
        deleteGamePlayers();
        
      } else if (game.turn === player.symbol) {
        result.state = 'your_turn';
        res.json(result);

      } else {
        result.state = 'wait';
        res.json(result);
      }
    }
  });
});

/* GET available_games */
router.get(GAME_ROOT + 'available_games/', function (req, res) {
  Game
    .find({ started: false })
    .sort('name')
    .exec(function (err, games) {
      if (err) {
        console.log(err);
      }
      res.json(games.map(function (x) {
        return { id: x._id, name: x.name, size: x.board.length };
      }));
    });
});

/* PUT play */
router.put(GAME_ROOT + 'play/', function (req, res) {

  var result = { done: false };

  getGamePlayer(req, function (err, game, player) {

    //--------------------------------------------------------------------------
    function convertirEntero(s) {
      var r = /^(0*)(\d+)$/.exec(s);
      return r ? parseInt(r[2]) : -1;
    }

    //--------------------------------------------------------------------------
    function guardarCambios(tablero, ren, col) {
      tablero[ren][col] = jugador.simbolo;
      juego.turno = contrincante(juego.turno);
      juego.setTablero(tablero);
      juego.save(function (err) {
        if (err) {
          console.log(err);
        }
        resultado.efectuado = true;
        resultado.tablero = tablero;
        res.json(resultado);
      });
    }

    //--------------------------------------------------------------------------
    function tiroValido(tablero, ren, col) {
      return (0 <= ren && ren <= 2) &&
             (0 <= col && col <= 2) &&
             tablero[ren][col] === ' ';
    }
    //--------------------------------------------------------------------------

    if (err) {
      console.log(err);
      res.json(resultado);
    } else {

      var ren = convertirEntero(req.body.ren);
      var col = convertirEntero(req.body.col);

      if (juego.turno === jugador.simbolo) {

        var tablero = juego.getTablero();

        if (tiroValido(tablero, ren, col)) {
          guardarCambios(tablero, ren, col);
        } else {
          res.json(resultado);
        }
      } else {
        res.json(resultado);
      }
    }
  });
});

//------------------------------------------------------------------------------
router.put('/gato/unir_juego/', function (req, res) {

  var resultado = { unido: false, codigo: 'id_malo' };
  var idJuego = req.body.id_juego;
  var juego;
  var jugador;

  if (idJuego) {
    async.waterfall([
      //------------------------------------------------------------------------
      function (callback) {
        Juego.findOne({_id: idJuego}, callback);
      },
      //------------------------------------------------------------------------
      function (_juego, callback) {
        juego = _juego;
        if (juego.iniciado) {
          callback(ABORTAR);
        } else {
          juego.iniciado = true;
          juego.save(callback);
        }
      },
      //------------------------------------------------------------------------
      function (_juego, _n, callback) {
        jugador = new Jugador(
          { juego: juego._id,
            simbolo: constantes.SIMBOLO[1]
          });
        jugador.save(callback);
      },
      //------------------------------------------------------------------------
      function (_jugador, _n, callback) {
        req.session.id_jugador = jugador._id;
        resultado.unido = true;
        resultado.codigo = 'bien';
        resultado.simbolo = jugador.simbolo;
        callback(null);
      }
    ],
    //--------------------------------------------------------------------------
    function (err) {
      if (err && err !== ABORTAR) {
        console.log(err);
      }
      res.json(resultado);
    });
  } else {
    res.json(resultado);
  }
});

//------------------------------------------------------------------------------
function contrincante(s) {
  return constantes.SIMBOLO[(s === constantes.SIMBOLO[1]) ? 0: 1];
}

//------------------------------------------------------------------------------
function obtenerJuegoJugador(req, callback) {

  var idJugador = req.session.id_jugador;
  var juego;
  var jugador;

  if (idJugador) {
    async.waterfall([
      //------------------------------------------------------------------------
      function (callback) {
        Jugador.findOne({ _id: idJugador }, callback);
      },
      //------------------------------------------------------------------------
      function (_jugador, callback) {
        jugador = _jugador;
        Juego.findOne({ _id: jugador.juego }, callback);
      },
      //------------------------------------------------------------------------
      function (_juego, callback) {
        juego = _juego;
        callback(null);
      }
    ],
    //--------------------------------------------------------------------------
    function (err) {
      if (err) {
        console.log(err);
      }
      callback(null, juego, jugador);
    });
  } else {
    callback(Error('La sesión no contiene el ID del jugador'));
  }
}
