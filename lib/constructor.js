
// configuration 
var config = {
}

function Facebook()
{
	
	// setup css 
	
	// check if there's already an access token...
	this.auth = ( checkCookie("fb.lite") ) ? JSON.parse( getCookie("fb.lite") ) : false;
	//if( !auth) return false;
	this.promise = new Promise( this );
}
