#!/usr/bin/env node

/*
 Dots and Boxes Game
 Text Client.
 Copyright (C) 2014 by Mauricio Cunille Blando and Jose Roberto Torres

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
var PAUSA					 = 1000;					// Miliseconds between each waiting request.

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
	
	return {
		
		//------------------------------------------------------------------------------
		call: function (method, route, params, callback) {
			
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
					
					obtenerCookies(res);
					callback(JSON.parse(body));
			});
		}
	}
}

//--------------------------------------------------------------------------
