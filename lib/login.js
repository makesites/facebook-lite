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
 * @provides fb.auth
 * @requires fb.prelude
 *           fb.qs
 *           fb.event
 *           fb.json
 *           fb.ui
 *           fb.ua
 */

/**
 * Authentication and Authorization.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Find out the current status from the server, and get an authResponse if
   * the user is connected.
   *
   * The user's status or the question of *who is the current user* is
   * the first thing you will typically start with. For the answer, we
   * ask facebook.com. Facebook will answer this question in one of
   * two ways:
   *
   * 1. Someone you don't know.
   * 2. Someone you know and have interacted with.
   *    Here's an authResponse for them.
   *
   *     FB.getLoginStatus(function(response) {
   *       if (response.authResponse) {
   *         FB.assert(response.status === 'connected');
   *         // logged in and connected user, someone you know
   *       } else if (response.status === 'not_authorized') {
   *         // the user is logged in but not connected to the application
   *       } else {
   *         FB.assert(response.status === 'unknown');
   *         // the user isn't even logged in to Facebook.
   *       }
   *     });
   *
   * **Events**
   *
   * #### auth.login
   * This event is fired when your application first notices the user (in other
   * words, gets an authResponse  when it didn't already have a valid one).
   * #### auth.logout
   * This event is fired when your application notices that there is no longer
   * a valid user (in other words, it had an authResponse but can no longer
   * validate the current user).
   * #### auth.authResponseChange
   * This event is fired for **any** auth related change as they all affect the
   * access token: login, logout, and access token refresh.  Access tokens are
   * are refreshed over time as long as the user is active with your
   * application.
   * #### auth.statusChange
   * Typically you will want to use the auth.authResponseChange event,
   * but in rare cases, you want to distinguish between these three states:
   *
   * - Connected
   * - Logged into Facebook but not connected with your application
   * - Not logged into Facebook at all.
   *
   * The [FB.Event.subscribe][subscribe] and
   * [FB.Event.unsubscribe][unsubscribe] functions are used to subscribe to
   * these events. For example:
   *
   *     FB.Event.subscribe('auth.login', function(response) {
   *       // do something with response
   *     });
   *
   * The response object returned to all these events is the same as the
   * response from [FB.getLoginStatus][getLoginStatus], [FB.login][login] or
   * [FB.logout][logout]. This response object contains:
   *
   * status
   * : The status of the User. One of `connected`, `notConnected` or `unknown`.
   *
   * authResponse
   * : The authorization response.  The field is presented if and only if the
   *   user is logged in and connected to your app.
   *
   * [subscribe]: /docs/reference/javascript/FB.Event.subscribe
   * [unsubscribe]: /docs/reference/javascript/FB.Event.unsubscribe
   * [getLoginStatus]: /docs/reference/javascript/FB.getLoginStatus
   * [login]: /docs/reference/javascript/FB.login
   * [logout]: /docs/reference/javascript/FB.logout
   *
   * @access public
   * @param cb {Function} The callback function.
   * @param force {Boolean} Force reloading the login status (default `false`).
   */
  getLoginStatus: function(cb, force) {
    if (!FB._apiKey) {
      FB.log('FB.getLoginStatus() called before calling FB.init().');
      return;
    }

    // we either invoke the callback right away if the status has already been
    // loaded, or queue it up for when the load is done.
    if (cb) {
      if (!force && FB.Auth._loadState == 'loaded') {
        cb({ status: FB._userStatus,
             authResponse: FB._authResponse});
        return;
      } else {
        FB.Event.subscribe('FB.loginStatus', cb);
      }
    }

    // if we're already loading, and this is not a force load, we're done
    if (!force && FB.Auth._loadState == 'loading') {
      return;
    }

    FB.Auth._loadState = 'loading';

    // invoke the queued callbacks
    var lsCb = function(response) {
      // done
      FB.Auth._loadState = 'loaded';

      // invoke callbacks
      FB.Event.fire('FB.loginStatus', response);
      FB.Event.clear('FB.loginStatus');
    };

    FB.Auth.fetchLoginStatus(lsCb);
  },

  /**
   * Returns the full packet of information about the user and
   * his or her access token, or null if there's no active access
   * token.  This packet is referred to as the authorization response.
   *
   * @access public
   * return {Object} a record containing the access token, then user id,
   *                 the amount of time before it expires, and the
   *                 signed request (or null if there's no active access token).
   */
  getAuthResponse: function() {
    return FB._authResponse;
  },

  /**
   * Returns the access token embedded within the authResponse
   * (or null if it's not available).
   *
   * @access public
   * @return {String} the access token, if available, or null if not.
   */
  getAccessToken: function() {
    return (FB._authResponse && FB._authResponse.accessToken) || null;
  },

  getAppAccessToken: function() {
	  
    var client_id = this.options.clientId || false;
	 var client_secret = this.options.clientSecret || false;
    // exit now if no app id is supplied
    if(!client_id || !client_secret) return;
	
	var url   = this.options.url.access_token + "?" + "client_id=" + client_id + "client_secret=" + client_secret + "&grant_type=client_credentials";
	
	// open the login url
	this.ajax( url, function( response ){
		// save accesstoken
		this.access_token = response.access_token
	});
	
  },

  /**
   * Returns the ID of the connected user, or 0 if
   * the user is logged out or otherwise couldn't be
   * discerned from cookie or access token information.
   *
   * @access public
   * @return {Integer} the ID of the logged in, connected user.
   */
  getUserID: function() {
    return FB._userID;
  },

  /**
   * Login/Authorize/Permissions.
   *
   * Once you have determined the user's status, you may need to
   * prompt the user to login. It is best to delay this action to
   * reduce user friction when they first arrive at your site. You can
   * then prompt and show them the "Connect with Facebook" button
   * bound to an event handler which does the following:
   *
   *     FB.login(function(response) {
   *       if (response.authResponse) {
   *         // user successfully logged in
   *       } else {
   *         // user cancelled login
   *       }
   *     });
   *
   * You should **only** call this on a user event as it opens a
   * popup. Most browsers block popups, _unless_ they were initiated
   * from a user event, such as a click on a button or a link.
   *
   *
   * Depending on your application's needs, you may need additional
   * permissions from the user. A large number of calls do not require
   * any additional permissions, so you should first make sure you
   * need a permission. This is a good idea because this step
   * potentially adds friction to the user's process. Another point to
   * remember is that this call can be made even _after_ the user has
   * first connected. So you may want to delay asking for permissions
   * until as late as possible:
   *
   *     FB.login(function(response) {
   *       if (response.authResponse) {
   *         // if you need to know which permissions were granted then
   *         // you can can make an fql-call
   *         FB.api({
   *                  method: 'fql.query',
   *                  query: 'select read_stream, publish_stream, ' +
   *                    'offline_access from permissions where uid=me()'
   *                },
   *                function (data) {
   *                  if (data[0].read_stream) {
   *                    // we have read_stream
   *                  }
   *                });
   *       } else {
   *         // user is not logged in
   *       }
   *     }, {scope:'read_stream, publish_stream, offline_access'});
   *
   * @access public
   * @param cb {Function} The callback function.
   * @param opts {Object} (_optional_) Options to modify login behavior.
   *
   * Name                     | Type    | Description
   * ------------------------ | ------- | -------------------------------------
   * enable_profile_selector  | Boolean | When true, prompt the user to grant
   *                          |         | permission for one or more Pages.
   * profile_selector_ids     | String  | Comma separated list of IDs to
   *                          |         | display in the profile selector.
   * scope                    | String  | Comma or space delimited list of
   *                          |         | [Extended permissions]
   *                          |         | (/docs/authentication/permissions).
   */
  login: function(cb, opts) {
    if (opts && opts.perms && !opts.scope) {
      opts.scope = opts.perms;
      delete opts.perms;
      FB.log('OAuth2 specification states that \'perms\' ' +
             'should now be called \'scope\'.  Please update.');
    }
    FB.ui(FB.copy({
        method: 'permissions.oauth',
        display: 'popup',
        domain: location.hostname
      }, opts || {}),
      cb);
  },

  /**
   * Logout the user in the background.
   *
   * Just like logging in is tied to facebook.com, so is logging out -- and
   * this call logs the user out of both Facebook and your site. This is a
   * simple call:
   *
   *     FB.logout(function(response) {
   *       // user is now logged out
   *     });
   *
   * NOTE: You can only log out a user that is connected to your site.
   *
   * @access public
   * @param cb {Function} The callback function.
   */
  logout: function(cb) {
    FB.ui({ method: 'auth.logout', display: 'hidden' }, cb);
  }
});

/*
Facebook.prototype.getLoginStatus = function( callback ){
	// access cookie
	return callback( this.auth );
};

Facebook.prototype.login = function(callback, options){
	
	var self = this;
	
    var client_id = this.options.clientId || false;
	var redirect_uri = options.redirect_uri || this.options.url.redirect_uri;
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
	var url   = this.options.url.oauth + "?"
                        + "client_id=" + client_id
                        + "&redirect_uri=" + encodeURIComponent(redirect_uri)
                        + "&display="+ display
						+ "&response_type=token";
                        //+ "&type=user_agent";
	
	// add scope
	if( scope ) url += "&scope=" + scope;
                        
	// open the login url
	this.ajax( url );
	
};
*/
