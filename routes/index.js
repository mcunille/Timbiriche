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
var async      = require('async');
var express    = require('express');
var mongoose   = require('mongoose');

var Game      = require('../models/game.js');
var Player    = require('../models/player.js');

var router     = express.Router();
module.exports = router;

//------------------------------------------------------------------------------

var ObjectId   = mongoose.Schema.Types.ObjectId;
var ABORT    = true;

var GAME_ROOT = '/dotsandboxes/';
var MAX_PLAYERS = 4;

//------------------------------------------------------------------------------
// REDIRECT root to timbiriche
router.get('/', function(req, res) {
  res.redirect(GAME_ROOT);
});

//------------------------------------------------------------------------------
// GET index
router.get(GAME_ROOT, function (req, res) {
  res.render('index.ejs');
});

//------------------------------------------------------------------------------
// POST create_game 
router.post(GAME_ROOT + 'create_game/', function (req, res) {

  var result = { created: false, code: 'invalid' };
  
  var name = req.body.name;
  var size = req.body.size;
  var players = req.body.players;
  var player_symbol = req.body.symbol;
  
  var game;
  var player;

	//----------------------------------------------------------------------------
 	function createBoardString(size) {
 		var boardArray = [];
 	 	var boardLength = (2 * size) - 1;
 	 
 	 	for(var i = 0; i < boardLength; i++) {
 	 		boardArray[i] = [];
 	 	 
 	 	 	for(var j = 0; j < boardLength; j++) {
 	 	 		boardArray[i][j] = i % 2 === 0 && j % 2 === 0 ? '.' : ' ';	 
 	 	 	}
 	 	}
 	 
 	 	return JSON.stringify(boardArray);
 	}

	//----------------------------------------------------------------------------
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
          	board: createBoardString(size),
          	players: players});
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

//------------------------------------------------------------------------------
// GET state
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
    
    //--------------------------------------------------------------------------
    function gameResult(symbol, board) {
    	var players = [];
    	for (var player = 0; player < MAX_PLAYERS; player++) {
    		players[player] = {symbol:null, count:0}; 
    	}
    	
    	for (var row = 1; row < board.length; row += 2) {
    		for (var column = 1; column < board[row].length; column += 2) {
    			var current_symbol = board[row][column];
					
					var found = false;
    			for (var player = 0; player < players.length && !found; player++) {
    				if (players[player].symbol === current_symbol) {
    					players[player].count++;
    					found = true;
    				} else if (players[player].symbol === null) {
    					players[player].symbol = current_symbol;
    					players[player].count++;
    					found = true;
    				}
    			}
    		}
    	}
    	
    	var winnerCount = 0;
    	for (var i = 0; i < players.length; i++) {
    		if (players[i].count > winnerCount) {
    			winnerCount = players[i].count;
    		}
    	}
    	
    	var winners = [];
    	for (var i = 0; i < players.length; i++) {
    		if (players[i].count === winnerCount) {
    			winners[winners.length] = players[i].symbol;
    		}
    	}
    	
    	if (winners.length !== 1) {
    		return 'tie';
    	} else {
    		for (var i = 0; i < winners.length; i++) {
    			if (winners[i] === symbol) {
    				return 'win';
    			}
    		}
    		
    		return 'lost';
    	}
    }

    //--------------------------------------------------------------------------
    function full(t) {
 			// Checks for player symbols in each box. 
 			// If blank then the board isn't full.
      for (var row = 1; row < t.length; row += 2) {
        for (var column = 1; column < t[row].length; column += 2) {
          if (t[row][column] === ' ') return false;
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

//------------------------------------------------------------------------------
// GET available_games
router.get(GAME_ROOT + 'available_games/', function (req, res) {
  Game
    .find({ started: false })
    .sort('name')
    .exec(function (err, games) {
      if (err) {
        console.log(err);
      }
      res.json(games.map(function (x) {
        return { id: x._id, name: x.name, size: x.board.length, players: x.players };
      }));
    });
});

//------------------------------------------------------------------------------
// PUT play
router.put(GAME_ROOT + 'play/', function (req, res) {

  var result = { done: false, code: null };

  getGamePlayer(req, function (err, game, player) {
    //--------------------------------------------------------------------------
    function convertInt(s) {
      var r = /^(0*)(\d+)$/.exec(s);
      return r ? parseInt(r[2]) : -1;
    }

    //--------------------------------------------------------------------------
    function saveChanges(board, row, col) {
    
      board[row][col] = col % 2 === 0 ? '|' : '_';
      var completedSquare = false;
      
      if (row % 2 === 0) {
      	var leftSquareRow = row -1;
      	if (leftSquareRow > 0) {
	      	var squareCompleted = checkSquare(board, leftSquareRow, col);
	      	if (squareCompleted) {	      		      		
	      		board[leftSquareRow][col] = player.symbol;
	      		completedSquare = true;
	      	}
      	}
      	
      	var rightSquareRow = row + 1;
      	if (rightSquareRow < board.length) {
      		var squareCompleted = checkSquare(board, rightSquareRow, col);
      		if (squareCompleted) {
      			board[rightSquareRow][col] = player.symbol;
      			completedSquare = true;
      		}
      	}
      } else {
      	var upperSquareCol = col -1;
      	if (upperSquareCol > 0) {
	      	var squareCompleted = checkSquare(board, row, upperSquareCol);
	      	if (squareCompleted) {
	      		board[row][upperSquareCol] = player.symbol;
	      		completedSquare = true;
	      	}
      	}
      	
      	var lowerSquareCol = col + 1;
      	if (lowerSquareCol < board.length) {
      		var squareCompleted = checkSquare(board, row, lowerSquareCol);
      		if (squareCompleted) {
      			board[row][lowerSquareCol] = player.symbol;
      			completedSquare = true;
      		}
      	}
      }
      
      challenger(game, game.turn, function(challengersymbol) {
      	var nextTurn = completedSquare ? player.symbol : challengersymbol;
      
      	if (nextTurn === -1 ) {
      		result.done = false;
      		result.code = 'invalid_turn';
      		result.board = board;
      		res.json(result);
	      } else {
  	    	game.turn = nextTurn;
		      game.setBoard(board);
	      
  	    	game.save(function (err) {
  	      	if (err) {
  	      	  console.log(err);
  	      	}
        	
  	      	result.done = true;
  	      	result.code = 'ok';
  	      	result.board = board;
  	      	res.json(result);
  	    	});
  	    }
      });
    }

		//--------------------------------------------------------------------------
    function checkSquare(board, center_row, center_col) {
    	return 	board[center_row - 1][center_col] !== ' ' &&
    					board[center_row + 1][center_col] !== ' ' &&
    					board[center_row][center_col - 1] !== ' ' &&
    					board[center_row][center_col + 1] !== ' ';
    }

    //--------------------------------------------------------------------------
    function validatePlay(board, x1, x2, y1, y2, row, col) {
    	var distance 	= Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    	var result 		= distance === 1 && board[row][col] === ' ';
      return result;
    }
    
    //--------------------------------------------------------------------------
    if (err) {
      console.log(err);
      res.json(result);
    } else {

			var x1 = convertInt(req.body.x1);
			var x2 = convertInt(req.body.x2);
			var y1 = convertInt(req.body.y1);
			var y2 = convertInt(req.body.y2);
			
      var row = y1 + y2;
      var col = x1 + x2;

      if (game.turn === player.symbol) {
        var board = game.getBoard();

        if (validatePlay(board, x1, x2, y1, y2, row, col)) {
          saveChanges(board, row, col);
        } else {
          res.json(result);
        }
      } else {
        res.json(result);
      }
    }
  });
});

//------------------------------------------------------------------------------
// PUT join_game
router.put(GAME_ROOT + 'join_game/', function (req, res) {

  var result = { joined: false, code: 'bad_id' };
  
  var gameId = req.body.id_game;
  var symbol = req.body.symbol;
  
  var game;
  var player;

  if (gameId) {
    async.waterfall([
      //------------------------------------------------------------------------
      function (callback) {
        Game.findOne({_id: gameId}, callback);
      },
      //------------------------------------------------------------------------
      function (_game, callback) {
        game = _game;
        if (game.started) {
          return callback(ABORT);
        } else {
        	Player.find({ game: game._id }, function (err, players) {
        		for (var i = 0; i < players.length; i++) {
        			if (players[i].symbol === symbol) {
        				result.code = 'used_symbol';
        				result.gameId = gameId;
        				return callback(ABORT);
        			}
        		}
        	
        		if (players.length === game.players - 1) {
        			game.started = true;
	        	  game.save(callback);
        		}
        	});
        }
      },
      //------------------------------------------------------------------------
      function (_game, _n, callback) {
        player = new Player(
          { game: game._id,
            symbol: symbol
          });
        player.save(callback);
      },
      //------------------------------------------------------------------------
      function (_player, _n, callback) {
        req.session.id_player = player._id;
        result.joined = true;
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
  } else {
    res.json(result);
  }
});

//------------------------------------------------------------------------------
function challenger(game, symbol, callback) {
	Player.find({ game: game._id }).sort({symbol: 1}).exec(function(err, players) {
		for (var i = 0; i < players.length; i++) {
			if (players[i].symbol === symbol) {
				callback(players[++i % players.length].symbol);
				return;
			}
		}
		
		callback(-1);
		return;
	});
}

//------------------------------------------------------------------------------
function getGamePlayer(req, callback) {
  var playerId = req.session.id_player;
  var game;
  var player;

  if (playerId) {
    async.waterfall([
      //------------------------------------------------------------------------
      function (callback) {
        Player.findOne({ _id: playerId }, callback);
      },
      //------------------------------------------------------------------------
      function (_player, callback) {
        player = _player;
        Game.findOne({ _id: player.game }, callback);
      },
      //------------------------------------------------------------------------
      function (_game, callback) {
        game = _game;
        callback(null);
      }
    ],
    //--------------------------------------------------------------------------
    function (err) {
      if (err) {
        console.log(err);
      }
      callback(null, game, player);
    });
  } else {
    callback(Error('There is no session for the player ID'));
  }
}
