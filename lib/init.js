
Facebook.prototype.init = function(options)
{
	
	// if logging check the query
	if( options.logging === true && window.location.hash.search("access_token") > -1 ){
		this.parseResponse( window.location.href );
		// remove the hash (return to home)
		window.location.hash = "#"
	}
	
	// appId
    
    // type: app, web, client
	options.type || ( options.type = "app"); 
	
	// set redirect uri
	if( options.type == "app" && typeof options.namespace != "undefined" ){
		options.redirect_uri = "https://apps.facebook.com/"+ namespace +"/"
	}
	
	if( options.type == "web" ){
		options.redirect_uri = window.location.origin;
	}
	
    /*
	// check
	switch( options.type ){
		case "app":
			options.authorize = "https://www.facebook.com/dialog/oauth/";
		break;
		case "desktop":
			options.authorize = 
		break;
		case "mobile":
			options.authorize = 
		break;
		default:
			options.authorize = 
		break;
	}
	*/
	
  
	// save options for later
	this.options = options;
	
}