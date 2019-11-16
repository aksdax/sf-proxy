var request = require('request');
var debug = require('debug')('jsforce-ajax-proxy');
var http_url = require('url');
var jsforce = require('jsforce');
var conn = new jsforce.Connection();
const USERNAME = process.env.user;
const PASSWORD = process.env.pass;
/**
 * Allowed request headers 
 */
var ALLOWED_HEADERS = [
  'Authorization',
  'Content-Type',
  'Salesforceproxy-Endpoint',
  'X-Authorization',
  'X-SFDC-Session',
  'SOAPAction',
  'SForce-Auto-Assign',
  'If-Modified-Since',
  'X-User-Agent'
];

/**
 * Endpoint URL validation
 */
var SF_ENDPOINT_REGEXP =
  /^https:\/\/[a-zA-Z0-9\.\-]+\.(force|salesforce|cloudforce|database)\.com\//;

/**
 * Create middleware to proxy request to salesforce server
 */
module.exports.jsforceAjaxProxy = function(options) {

  options = options || {}
  var proxyCounter = 0;

  return function(req, res) {
    if (options.enableCORS) {
      res.header('Access-Control-Allow-Origin', options.allowedOrigin || '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE');
      res.header('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(','));
      res.header('Access-Control-Expose-Headers', 'SForce-Limit-Info');
      if (req.method === 'OPTIONS') {
        res.end();
        return;
      }
    }
    var sfEndpoint = req.headers["salesforceproxy-endpoint"];
    if (!SF_ENDPOINT_REGEXP.test(sfEndpoint)) {
      res.send(400, "Proxying endpoint is not allowed. `salesforceproxy-endpoint` header must be a valid Salesforce domain: " + sfEndpoint);
      return;
    }
    var headers = {};

    ALLOWED_HEADERS.forEach(function(header) {
      header = header.toLowerCase();
      var value = req.headers[header]
      if (value) {
		  headers[header] = req.headers[header];		         
      }	   
    });
	headers['authorization'] = conn.accessToken ? 'Bearer '+ conn.accessToken : req.headers['x-authorization'] ||req.headers['authorization'] ;
	// headers['x-authorization'] = conn.accessToken ? 'Bearar '+ conn.accessToken : req.headers[header];
	
    var params = {
      url: sfEndpoint || "https://login.salesforce.com//services/oauth2/token",
      method: req.method,
      headers: headers
    };
	
    proxyCounter++;
    debug("(++req++) " + new Array(proxyCounter+1).join('*'));
    debug("method=" + params.method + ", url=" + params.url);
    req.pipe(request(params))
      .on('response', function() {
        proxyCounter--;
        debug("(--res--) " + new Array(proxyCounter+1).join('*'));
      })
      .on('error', function() {
        proxyCounter--;
        debug("(--err--) " + new Array(proxyCounter+1).join('*'));
      })
      .pipe(res);
  }
};

function getUrlParams(req, resp){
   
   req.query_url = http_url.parse(req.url, true);
   
   console.log(req.query_url);
   
   req.user_name = req.query_url.user_name;
   
   req.password = req.query_url.password;
   
   req.email = req.query_url.email;
   
   req.mobile_phone = req.query_url.mobile_phone;
   
   req.home_phone = req.query_url.home_phone;
   
}

/* This function will return web page navigation menu html source code. */

function pageMenu(){

   var ret = '<a href="/login">Login</a>';
   
   return ret;
}


/* This function will use input parameter to replace place holder in the page template file. */

function buildPage(page_title, page_menu, page_content){
   
   var page_template = "<html>" +
         "<head>" +
         "<title>{page_title}</title>" +
         "</head>" +
         "<body>" +
         "<table>" +
         "<tr><td>{page_menu}</td></tr><tr>" +
         "<tr><td>{page_content}</td></tr>" +
         "</table>" +
         "</body></html>";
   
   var ret = page_template;
   ret = ret.replace("{page_title}", page_title, "g");
    ret = ret.replace("{page_title}", page_title, "g");
    ret = ret.replace("{page_menu}", page_menu, "g");
    ret = ret.replace("{page_content}", page_content, "g");

   return ret;
      
}
/* Return login form page to client request.

   This function is exported so can be invoked out side current module. */

function showLoginPage(req, resp){
   buildLoginPage(req, resp, '');
}

/* Verify user input login account data. Exported function also. */

function checkLoginAccount(req, resp, token){

   // Use node query string module to parse login form post data.
   var query_string = require('querystring');

   // If client use post method to request.
    if (req.method == 'POST') {

       var req_body = '';

        req.on('data', function (data) {
            req_body += data;

            // If the POST data is too much then destroy the connection to avoid attack.
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (req_body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', function () {

           // Parse post data from request body, return a JSON string contains all post data.
            var post_data = query_string.parse(req_body);

            // Get user name from post data.
            var user_name = post_data["user_name"] || USERNAME;

            // Get password from post data.
            var password = post_data["password"] || PASSWORD;
			
				conn.login(user_name, password, function(err, res) {
					if (err) {  // If user name and password is not correct.
						req.user_name = user_name;
						req.password = password;						
						// Return login form page back to response.
					return 	buildLoginPage(req, resp, 'User name or password is not correct.');
					}
				resp.writeHead(200, {'Content-Type':'text/html'});

				// Assign page title.
                var page_title = "Login success";

                // Assign page navigation menu data.
                var page_menu = pageMenu();
				
  			   var login_form = "<form method='post' action='/logout'>" +     
									"<input type='submit' value='Logout'/><br/><br/>" +
								"</form>";								
                // Assign page content.
                var page_content = "<p>" + login_form + "</p><p>" + JSON.stringify({accessToken: conn.accessToken, instanceUrl: conn.instanceUrl}) + "</p>";

                // Build login success page.
                var login_success_page = buildPage(page_title, page_menu, page_content);

                // Send login success page html source data to response.
                resp.end(login_success_page);
			});
			

        });
    }
}

function logoutAccount(req, resp) {
	conn = null;
	return 	buildLoginPage(req, resp, 'Logged out.');
}
/* This is a private function which can only be invoked in this module.
*  This function is used to build login form page and return it to client.
* */
function buildLoginPage(req, resp, error_message) {

    getUrlParams(req, resp);

    var page_title = "Login Page";

    var page_menu = pageMenu();
	
	if(!conn){
		conn = new jsforce.Connection();
	}

	if(!conn.accessToken){
		 var login_form = "<h3>Input user name and password to login.</h3>";

    if(error_message!=='' && error_message!==null && error_message!==undefined)
   {
      login_form += "<font color=red>" + error_message + "</font><br/><br/>";
   }

   login_form += "<form method='post' action='/check-login'>" +
        "User Name : <input type='text' name='user_name' value='{user_name}'/><br/><br/>" +
        "Password :<input type='password' name='password' value='{password}'/><br/><br/>" +
        "<input type='submit' value='Login'/><br/><br/>" +
        "</form>"+"<br/><br/><form method='post' action='/logout'>" +     
		"<input type='submit' value='Logout'/><br/><br/>" +
		"</form>";

    if(req.user_name==null || req.user_name==undefined)
    {
        req.user_name = '';
    }

    if(req.password==null || req.password==undefined)
    {
        req.password = '';
    }

    login_form = login_form.replace("{user_name}", req.user_name);

    login_form = login_form.replace("{password}", req.password);

	}else{
		login_form = JSON.stringify({accessToken: conn.accessToken, instanceUrl: conn.instanceUrl}) +"<br/><br/><form method='post' action='/logout'>" +     
		"<input type='submit' value='Logout'/><br/><br/>" +
		"</form>";
	}
	
    var login_page_data = buildPage(page_title, page_menu, login_form);

    resp.writeHead(200, {'Content-Type':'text/html'});

    resp.end(login_page_data);
   
}

exports.checkLoginAccount = checkLoginAccount; 
exports.logoutAccount = logoutAccount; 
exports.showLoginPage = showLoginPage ;
exports.buildPage = buildPage;
exports.pageMenu = pageMenu;
exports.getUrlParams = getUrlParams;