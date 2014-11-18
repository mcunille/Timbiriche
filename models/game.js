/*******************************************************************************
 * Dots and Boxes Game
 * Game model definition.
 * Copyright (C) 2014 Mauricio Cunille Blando and Jose Roberto Torres Mancilla
 * Based on "Juego de Gato distribuido" Copyright (C) 2013-2014 by Ariel Ortiz
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 ******************************************************************************/
 
 'use strict'
 
 var mongoose = require('mongoose');
 
 //-------------------------------------------------------------------------------
 var gameSchema = mongoose.Schema({
 		 name: String,
 		 turn: String,
 		 board: String,
 		 players: Number,
 		 started: { type: Boolean, default: false }
 });
 
 //-------------------------------------------------------------------------------
 gameSchema.methods.getBoard = function() {
 	 return JSON.parse(this.board);
 };
 
 //-------------------------------------------------------------------------------
 gameSchema.methods.setBoard = function(board) {
 	 this.board = JSON.stringify(board);
 };
 
 //-------------------------------------------------------------------------------
 module.exports = mongoose.model('Game', gameSchema);
