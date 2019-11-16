/*global process */
var http = require('http');
var express = require('express');
var proxy = require('./proxy');


var app = express();

var access_token;

app.configure(function () {
  app.set('port', process.env.PORT || 3123);
});

app.configure('development', function () {
  app.use(express.errorHandler());
});
	app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header(
			'Access-Control-Allow-Headers',
			'ORGANIZATION, Origin, X-Requested-With, Content-Type, Accept'
		);
		res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		res.header('Access-Control-Max-Age', '3600');
		next();
	});
app.all('/proxy/?*', proxy.jsforceAjaxProxy({ enableCORS: true}));

app.get('/', function(req, res) {
  res.send('JSforce AJAX Proxy');
});

app.get('/login', proxy.showLoginPage);
app.post('/check-login', function(req, res){ proxy.checkLoginAccount(req, res);});
app.post('/logout', function(req, res){ proxy.logoutAccount(req, res);});

http.createServer(app).listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});
