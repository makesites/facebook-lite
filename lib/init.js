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
 * JavaScript library providing Facebook Connect integration.
 *
 * @provides fb.init
 * @requires fb.prelude
 *           fb.auth
 *           fb.api
 *           fb.canvas
 *           fb.canvas.prefetcher
 *           fb.cookie
 *           fb.frictionless
 *           fb.ui
 *           fb.ua
 *           fb.xd
 */

/**
 * This is the top level for all the public APIs.
 *
 * @class FB
 * @static
 * @access public
 */
FB.provide('', {

  // set by CONNECT_FB_INIT_CONFIG
  initSitevars : {},

  /**
   * Initialize the library.
   *
   * Typical initialization enabling all optional features:
   *
   *      <div id="fb-root"></div>
   *      <script src="http://connect.facebook.net/en_US/all.js"></script>
   *      <script>
   *        FB.init({
   *          appId  : 'YOUR APP ID',
   *          status : true, // check login status
   *          cookie : true, // cookies allow server access to signed_request
   *          xfbml  : true  // parse XFBML
   *        });
   *      </script>
   *
   * The best place to put this code is right before the closing
   * `</body>` tag.
   *
   * ### Asynchronous Loading
   *
   * The library makes non-blocking loading of the script easy to use by
   * providing the `fbAsyncInit` hook. If this global function is defined, it
   * will be executed when the library is loaded:
   *
   *     <div id="fb-root"></div>
   *     <script>
   *       window.fbAsyncInit = function() {
   *         FB.init({
   *           appId  : 'YOUR APP ID',
   *           status : true, // check login status
   *           cookie : true, // cookies allow server access to signed_request
   *           xfbml  : true  // parse XFBML
   *         });
   *       };
   *
   *       (function() {
   *         var e = document.createElement('script');
   *         e.src = document.location.protocol +
   *                 '//connect.facebook.net/en_US/all.js';
   *         e.async = true;
   *         document.getElementById('fb-root').appendChild(e);
   *       }());
   *     </script>
   *
   * The best place to put the asynchronous version of the code is right after
   * the opening `<body>` tag. This allows Facebook initialization to happen in
   * parallel with the initialization on the rest of your page.
   *
   * ### Internationalization
   *
   * Facebook Connect features are available many locales. You can replace the
   * `en_US` locale specifed above with one of the [supported Facebook
   * Locales][locales]. For example, to load up the library and trigger dialogs,
   * popups and plugins to be in Hindi (`hi_IN`), you can load the library from
   * this URL:
   *
   *     http://connect.facebook.net/hi_IN/all.js
   *
   * [locales]: http://wiki.developers.facebook.com/index.php/Facebook_Locales
   *
   * ### SSL
   *
   * Facebook Connect is also available over SSL. You should only use this when
   * your own page is served over `https://`. The library will rely on the
   * current page protocol at runtime. The SSL URL is the same, only the
   * protocol is changed:
   *
   *     https://connect.facebook.net/en_US/all.js
   *
   * **Note**: Some [UI methods][FB.ui] like **stream.publish** and
   * **stream.share** can be used without registering an application or calling
   * this method. If you are using an appId, all methods **must** be called
   * after this method.
   *
   * [FB.ui]: /docs/reference/javascript/FB.ui
   *
   * @access public
   * @param options {Object}
   *
   * Property             | Type    | Description                            | Argument   | Default
   * -------------------- | ------- | ------------------------------------   | ---------- | -------
   * appId                | String  | Your application ID.                   | *Optional* | `null`
   * cookie               | Boolean | `true` to enable cookie support.       | *Optional* | `false`
   * logging              | Boolean | `false` to disable logging.            | *Optional* | `true`
   * status               | Boolean | `false` to disable status ping.        | *Optional* | `true`
   * xfbml                | Boolean | `true` to parse [[wiki:XFBML]] tags.   | *Optional* | `false`
   * useCachedDialogs     | Boolean | `false` to disable cached dialogs      | *Optional* | `true`
   * frictionlessRequests | Boolean | `true` to enable frictionless requests | *Optional* | `false`
   * authResponse         | Object  | Use specified access token record      | *Optional* | `null`
   * hideFlashCallback    | function | (Canvas Only) callback for each flash element when popups overlay the page | *Optional* | `null`
   */
  init: function(options) {
    // only need to list values here that do not already have a falsy default.
    // this is why cookie/authResponse are not listed here.
    options = FB.copy(options || {}, {
      logging: true,
      status: true
    });

    FB._userID = 0; // assume unknown or disconnected unless proved otherwise
    FB._apiKey = options.appId || options.apiKey;

    // CORDOVA PATCH
    // if nativeInterface is specified then fire off the native initialization as well.
    FB._nativeInterface = options.nativeInterface;
    if (FB._nativeInterface) {
      FB._nativeInterface.init(FB._apiKey, function(e) {alert('Cordova Facebook Connect plugin fail on init!');});
    }
    
    // disable logging if told to do so, but only if the url doesnt have the
    // token to turn it on. this allows for easier debugging of third party
    // sites even if logging has been turned off.
    if (!options.logging &&
        window.location.toString().indexOf('fb_debug=1') < 0) {
      FB._logging = false;
    }

    FB.XD.init(options.channelUrl);

    if (FB.UA.mobile() && FB.TemplateUI &&
        FB.TemplateData && FB.TemplateData._enabled &&
        options.useCachedDialogs !== false) {
      FB.TemplateUI.init();
      FB.Event.subscribe('auth.statusChange', FB.TemplateData.update);
    }

    if (options.reportTemplates) {
      FB.reportTemplates = true;
    }

    if (options.frictionlessRequests) {
      FB.Frictionless.init();
    }

    if (FB._apiKey) {
      // enable cookie support if told to do so
      FB.Cookie.setEnabled(options.cookie);

    if (options.authResponse) {
        FB.Auth.setAuthResponse(options.authResponse,
                                'connected');
      } else {
        // we don't have an access token yet, but we might have a user
        // ID based on a signed request in the cookie.
        var signedRequest = FB.Cookie.loadSignedRequest();
        var parsedSignedRequest = FB.Auth.parseSignedRequest(signedRequest);
        FB._userID =
          (parsedSignedRequest && parsedSignedRequest.user_id) || 0;
        FB.Cookie.loadMeta();
      }

      // load a fresh authRequest (or access token) if requested
      if (options.status) {
        FB.getLoginStatus();
      }
    }

    if (FB._inCanvas) {
      FB.Canvas._setHideFlashCallback(options.hideFlashCallback);
      FB.Canvas.init();
    }

    FB.Event.subscribe('xfbml.parse', function() {
      FB.XFBML.IframeWidget.batchWidgetPipeRequests();
    });

    // weak dependency on XFBML
    if (options.xfbml) {
      // do this in a setTimeout to delay it until the current call stack has
      // finished executing
      window.setTimeout(function() {
        if (FB.XFBML) {
          if (FB.initSitevars.parseXFBMLBeforeDomReady) {
            // poll to render new elements as fast as possible,
            // without waiting for things like external js to load
            FB.XFBML.parse();
            var myI = window.setInterval(
              function() {
                FB.XFBML.parse();
              },
              100);
            FB.Dom.ready(
              function() {
                window.clearInterval(myI);
                FB.XFBML.parse();
              });
          } else {
            // traditional xfbml parse after dom is loaded
            FB.Dom.ready(FB.XFBML.parse);
          }
        }
      }, 0);
    }
    if (FB.Canvas && FB.Canvas.Prefetcher) {
      FB.Canvas.Prefetcher._maybeSample();
    }
  }
});



/*
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
	
  
	// save options for later
	this.options = options;
	
}
*/