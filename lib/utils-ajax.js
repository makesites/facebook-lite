
/*

  YOUR_REDIRECT_URI#
  access_token=USER_ACCESS_TOKEN
  &expires_in=NUMBER_OF_SECONDS_UNTIL_TOKEN_EXPIRES
  
   YOUR_REDIRECT_URI?
  error_reason=user_denied
  &error=access_denied
  &error_description=The+user+denied+your+request.
  
*/
Facebook.prototype.parseResponse = function(query)
{

	var result = unescape(query).split("#")[1];
	result = unescape(result);
	
	// TODO: Error Check
	var accessToken = result.split("&")[0].split("=")[1];		
	var expiresIn = result.split("&")[1].split("=")[1];

	var response = {
		status: 'connected',
		authResponse: {
			accessToken: accessToken,
			expiresIn: expiresIn
		}
	}
	
	// save response 
	setCookie("fb.lite", JSON.stringify( response ), expiresIn);
	
	// keep the response in memory
	this.auth = response;
	
	// continue...
	this.promise.resolve( this.auth );
	//this.callback( this.auth );
	
};


// window method - override with custom logic if needed
Facebook.prototype.window = function( url )
{
	window.location = url;
};


// Internal methods
// - standard AJAX request
Facebook.prototype.ajax = function( url, options, callback)
{
	// setting fallbacks
	url || (url = false);
	callback || (callback = false);
	// check if there's a URL
	if(!url) return;
	
	options = options || null;
	
	//var url = authorize_url;
	var req = new XMLHttpRequest();
    var self = this;
	
	req.open(method,url,true);
	
    if(options !== null){
        //req.setRequestHeader("Content-type", "application/json");
        req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        req.setRequestHeader("Content-Length", options.length);
        
    }
	// if authorizing: 
	//req.setRequestHeader('Authorization', "OAuth " + token); 
	//req.setRequestHeader('Accept',        "application/json");
	
	req.send(options);
	req.onerror = function(){
		self.noConnection();
	};
    
    if(!callback){
        // if no callback just return the request object (assuming we'll do something with it :P)
        return req;
	} else {
        req.onload = function(e){
            var response = JSON.parse(e.target.responseText);
            callback.call(this, response);
        }
    }
	
};

Facebook.prototype.noConnection = function()
{
	//console.log("Unfortunately your request to the server has failed... Please try again later.");
};