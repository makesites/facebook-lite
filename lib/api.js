
Facebook.prototype.api = function(){
    var service, method, options, callback;
	// get the access token
	var access_token = this.auth.authResponse.accessToken;
	
    // define parameters
    switch(arguments.length){
        case 0:
            return;
        break;
        case 1:
            service = arguments[0];
        break;
        case 2:
            service = arguments[0];
            callback = arguments[1];
        break;
        case 3:
            service = arguments[0];
            method = arguments[1];
            callback = arguments[2];
        break;
        case 4:
            service = arguments[0];
            method = arguments[1];
            options = JSON_serialize( arguments[2] );
            callback = arguments[3];
        break;
    }
    
    if(typeof(service) == "undefined") return;
    // remove leading/ending slash
    service = service.replace(/^\/|\/$/g, '');
    // set other params
    method || (method = "get");
    options || (options = null);
    // set the token (check if the service has a questionmark)
    var access_token = ((service.search("\\?") > -1 ) ? "&" : "?" ) + "access_token=" + access_token;
    
	var url = "https://graph.facebook.com/"+ service + access_token;
	var req = new XMLHttpRequest();
    var self = this;
	
	req.open(method,url,true);
    if(options != null){
        //req.setRequestHeader("Content-type","application/json");
        req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
        req.setRequestHeader('Content-Length',options.length);
    }
	req.send(options);
	req.onerror = function(){
		self.noConnection();
	};
    
    if(typeof(callback) == "undefined"){
        // if no callback just return the request object (assuming we'll do something with it :P)
        return req;
	} else {
        req.onload = function(e){
            var response = JSON.parse(e.target.responseText);
            callback.call(this, response);
        }
    }
}
