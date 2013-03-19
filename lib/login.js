
  
Facebook.prototype.getLoginStatus = function( callback ){
	// access cookie
	return callback( this.auth );
};

Facebook.prototype.login = function(callback, options){
	
	var self = this;
	
    var client_id = this.options.appId || false;
	var redirect_uri = this.options.redirect_uri || "https://www.facebook.com/connect/login_success.html";
	// scope: 'email,user_likes'
	var scope = options.scope || false;
	// display: page, popup, iframe, or touch
	var display = options.display || "page";
	var auth_type = options.auth_type || false;
	
    // exit now if no app id is supplied
    if(!client_id) return;
	
	// return existing auth unless reauthenticate if needed...
	if( this.auth && auth_type != 'reauthenticate') { 
		return callback( this.auth );
	} else {
		// save the callback for later
		this.promise.add( callback );
	}

    // assemble authorization URL
	var url   = "https://www.facebook.com/dialog/oauth/?"
                        + "client_id=" + client_id
                        + "&redirect_uri=" + encodeURIComponent(redirect_uri)
                        + "&display="+ display
						+ "&response_type=token";
                        //+ "&type=user_agent";
	
	// add scope
	if( scope ) url += "&scope=" + scope;
                        
	// open the login url
	this.window( url );
	
};
