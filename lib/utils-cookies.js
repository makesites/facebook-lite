/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 *
 * @provides fb.cookie
 * @requires fb.prelude
 *           fb.qs
 *           fb.event
 */

/**
 * Cookie Support.
 *
 * @class FB.Cookie
 * @static
 * @access private
 */
FB.provide('Cookie', {
  /**
   * Holds the base_domain property to match the Cookie domain.
   *
   * @access private
   * @type String
   */
  _domain: null,

  /**
   * Indicate if Cookie support should be enabled.
   *
   * @access private
   * @type Boolean
   */
  _enabled: false,

  /**
   * Enable or disable Cookie support.
   *
   * @access private
   * @param val {Boolean} true to enable, false to disable
   */
  setEnabled: function(val) {
    FB.Cookie._enabled = !!val;
    if (typeof val == 'string') {
      FB.Cookie._domain = val;
    }
  },

  /**
   * Return the current status of the cookie system.
   *
   * @access private
   * @returns {Boolean} true if Cookie support is enabled
   */
  getEnabled: function() {
    return FB.Cookie._enabled;
  },

  /**
   * Try loading metadata from the unsecure fbm_ cookie
   *
   * @access private
   * @return {Object} the meta data for for the connect implementation
   */
  loadMeta: function() {
    var
      // note, we have the opening quote for the value in the regex, but do
      // not have a closing quote. this is because the \b already handles it.
      cookie = document.cookie.match('\\bfbm_' + FB._apiKey + '=([^;]*)\\b'),
      meta;

    if (cookie) {
      // url encoded session stored as "sub-cookies"
      meta = FB.QS.decode(cookie[1]);
      if (!FB.Cookie._domain) {
        // capture base_domain for use when we need to clear
        FB.Cookie._domain = meta.base_domain;
      }
    }

    return meta;
  },

  /**
   * Try loading the signedRequest from the cookie if one is found.
   *
   * @return {String} the cached signed request, or null if one can't be found.
   */
  loadSignedRequest: function() {
    var cookie =
      document.cookie.match('\\bfbsr_' + FB._apiKey + '=([^;]*)\\b');
    if (!cookie) {
      return null;
    }

    return cookie[1];
  },

  /**
   * Set the signed request cookie to something nonempty
   * and without expiration time, or clear it if the cookie is
   * missing or empty.
   *
   * @access private
   * @param {String} signed_request_cookie the code/user_id cookie
   *        in signed request format.
   * @param {Integer} The time at which the cookie should expire.
   * @param {String} The domain for which this cookie should be set.
   */
  setSignedRequestCookie: function(signed_request_cookie, expiration_time,
       base_domain) {
    if (!signed_request_cookie) {
      throw new Error('Value passed to FB.Cookie.setSignedRequestCookie ' +
                      'was empty.');
    }

    if (!FB.Cookie.getEnabled()) {
      return;
    }

    if (base_domain) {
      // store this so that we can use it when deleting the cookie
      var meta  = FB.QS.encode({
        base_domain: base_domain
      });
      FB.Cookie.setRaw('fbm_', meta, expiration_time, base_domain);
    }
    FB.Cookie._domain = base_domain;
    FB.Cookie.setRaw('fbsr_', signed_request_cookie, expiration_time,
        base_domain);
  },

  /**
   * Clears the signed request cookie normally set by
   * setSignedRequestCookie above.
   */
  clearSignedRequestCookie: function() {
    if (!FB.Cookie.getEnabled()) {
      return;
    }

    FB.Cookie.setRaw('fbsr_', '', 0, FB.Cookie._domain);
  },

  /**
   * Helper function to set cookie value.
   *
   * @access private
   * @param prefix {String} short string namespacing the cookie
   * @param val    {String} the string value (should already be encoded)
   * @param ts     {Number} a unix timestamp denoting expiration
   * @param domain {String} optional domain for cookie
   */
  setRaw: function(prefix, val, ts, domain) {
    // Start by clearing potentially overlapping cookies
    if (domain) {
      // No domain set (will become example.com)
      document.cookie =
        prefix + FB._apiKey + '=; expires=Wed, 04 Feb 2004 08:00:00 GMT;';
      // This domain, (will become .example.com)
      document.cookie =
        prefix + FB._apiKey + '=; expires=Wed, 04 Feb 2004 08:00:00 GMT;' +
        'domain=' + location.hostname + ';';
    }

    var expires = new Date(ts).toGMTString();
    document.cookie =
      prefix + FB._apiKey + '=' + val +
      (val && ts === 0 ? '' : '; expires=' + expires) +
      '; path=/' +
      (domain ? '; domain=' + domain : '');
  }
});

/*
// - cookies
getCookie = function(name) {
	var i,key,value,cookies=document.cookie.split(";");
	for (i=0;i<cookies.length;i++){
		key=cookies[i].substr(0,cookies[i].indexOf("="));
		value=cookies[i].substr(cookies[i].indexOf("=")+1);
		key=key.replace(/^\s+|\s+$/g,"");
		if (key==name){
			return unescape(value);
		}
	}
}
	
setCookie = function(name,val,expiry){
	var date = new Date( ( new Date() ).getTime() + parseInt(expiry) );
	var value=escape(val) + ((expiry==null) ? "" : "; expires="+date.toUTCString());
	document.cookie=name + "=" + value;
}
	
checkCookie = function( name ){
	var cookie=getCookie( name );
	if (cookie!=null && cookie!=""){
		return true;
	} else {
		return false;
	}
}
*/
