/* 
 * Facebook Lite
 * Lightweight JavaScript SDK for the Facebook API 
 * 
 * Created by Makis Tracend (@tracend)
 * Published at Makesites.org - http://github.com/makesites/facebook-lite
 * 
 * @license MIT licensed
 * 
 * "original methods": ["Data", "Data.query", "Data.waitOn", "Dom", "Dom.addCssRules", "Event", "Event.subscribe", "Event.unsubscribe", "Insights", "Insights.impression", "Music", "Music.flashCallback", "Music.init", "Music.send", "Payment", "Payment.init", "Payment.setSize", "UA", "UA.nativeApp", "XD", "XD.onMessage", "XFBML", "XFBML.parse", "api", "getAccessToken", "getAuthResponse", "getLoginStatus", "getUserID", "init", "login", "logout", "ui"]
 */

// Don't include if the namespace is taken (by the official lib?)
//window.FB || (function(window) {

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
 * @provides fb.prelude
 */

/**
 * Prelude.
 *
 *     Namespaces are one honking great idea -- let's do more of those!
 *                                                            -- Tim Peters
 *
 * The Prelude is what keeps us from being messy. In order to co-exist with
 * arbitary environments, we need to control our footprint. The one and only
 * rule to follow here is that we need to limit the globals we introduce. The
 * only global we should every have is ``FB``. This is exactly what the prelude
 * enables us to do.
 *
 * The main method to take away from this file is `FB.copy()`_. As the name
 * suggests it copies things. Its powerful -- but to get started you only need
 * to know that this is what you use when you are augmenting the FB object. For
 * example, this is skeleton for how ``FB.Event`` is defined::
 *
 *   FB.provide('Event', {
 *     subscribe: function() { ... },
 *     unsubscribe: function() { ... },
 *     fire: function() { ... }
 *   });
 *
 * This is similar to saying::
 *
 *   FB.Event = {
 *     subscribe: function() { ... },
 *     unsubscribe: function() { ... },
 *     fire: function() { ... }
 *   };
 *
 * Except it does some housekeeping, prevents redefinition by default and other
 * goodness.
 *
 * .. _FB.copy(): #method_FB.copy
 *
 * @class FB
 * @static
 * @access private
 */
if (!window.FB) {
  window.FB = {
    // use the init method to set these values correctly
    _apiKey       : null,
    _authResponse : null,
    _userStatus   : 'unknown', // or 'notConnected' or 'connected'

    // logging is enabled by default. this is the logging shown to the
    // developer and not at all noisy.
    _logging: true,
    _inCanvas: (
      (window.name.indexOf('iframe_canvas') > -1) ||
      (window.name.indexOf('app_runner') > -1)),

    // Determines if we should use HTTPS when attempting cross-domain
    // communication with facebook.com. This is assumed to be the case when
    // window.name contains "_fb_https". This value may also be set by the
    // response from FB.login() or FB.getLoginStatus()
    _https: (window.name.indexOf('_fb_https') > -1),

    //
    // DYNAMIC DATA
    //
    // the various domains needed for using Connect
    _domain: {
      api            : 'https://api.facebook.com/',
      api_read       : 'https://api-read.facebook.com/',
      cdn            : 'http://static.ak.fbcdn.net/',
      https_cdn      : 'https://s-static.ak.fbcdn.net/',
      graph          : 'https://graph.facebook.com/',
      staticfb       : 'http://static.ak.facebook.com/',
      https_staticfb : 'https://s-static.ak.facebook.com/',
      www            : 'http://www.facebook.com/',
      https_www      : 'https://www.facebook.com/',
      m              : 'http://m.facebook.com/',
      https_m        : 'https://m.facebook.com/'
    },
    _locale: null,
    _localeIsRtl: false,
      

    /**
     * Retrieve one of the various domains needed for Connect.
     *
     * @access private
     * @param domain   (String)  The domain to retrieve
     * @param noForcedHTTPS  (bool) Do not force https domain
     */
    getDomain: function(domain, noForcedHTTPS) {
      var forceHTTPS = !noForcedHTTPS &&
        (window.location.protocol == 'https:' || FB._https);
      switch (domain) {
        case 'api':
          return FB._domain.api;
        case 'api_read':
          return FB._domain.api_read;
        case 'cdn':
          return forceHTTPS ? FB._domain.https_cdn : FB._domain.cdn;
        case 'cdn_foreign':
          return FB._domain.cdn_foreign;
        case 'https_cdn':
          return FB._domain.https_cdn;
        case 'graph':
          return FB._domain.graph;
        case 'staticfb':
          return forceHTTPS ?  FB._domain.https_staticfb : FB._domain.staticfb;
        case 'https_staticfb':
          return FB._domain.https_staticfb;
        case 'www':
          return forceHTTPS ? FB._domain.https_www : FB._domain.www;
        case 'https_www':
          return FB._domain.https_www;
        case 'm':
          return forceHTTPS ? FB._domain.https_m : FB._domain.m;
        case 'https_m':
          return FB._domain.https_m;
      }
    },

    /**
     * Copies things from source into target.
     *
     * @access private
     * @param target    {Object}  the target object where things will be copied
     *                            into
     * @param source    {Object}  the source object where things will be copied
     *                            from
     * @param overwrite {Boolean} indicate if existing items should be
     *                            overwritten
     * @param transform  {function} [Optional], transformation function for
     *        each item
     */
    copy: function(target, source, overwrite, transform) {
      for (var key in source) {
        if (overwrite || typeof target[key] === 'undefined') {
          target[key] = transform ? transform(source[key]) :  source[key];
        }
      }
      return target;
    },

    /**
     * Create a namespaced object.
     *
     * @access private
     * @param name {String} full qualified name ('Util.foo', etc.)
     * @param value {Object} value to set. Default value is {}. [Optional]
     * @return {Object} The created object
     */
    create: function(name, value) {
      var node = window.FB, // We will use 'FB' as root namespace
      nameParts = name ? name.split('.') : [],
      c = nameParts.length;
      for (var i = 0; i < c; i++) {
        var part = nameParts[i];
        var nso = node[part];
        if (!nso) {
          nso = (value && i + 1 == c) ? value : {};
          node[part] = nso;
        }
        node = nso;
      }
      return node;
    },

    /**
     * Copy stuff from one object to the specified namespace that
     * is FB.<target>.
     * If the namespace target doesn't exist, it will be created automatically.
     *
     * @access private
     * @param target    {Object|String}  the target object to copy into
     * @param source    {Object}         the source object to copy from
     * @param overwrite {Boolean}        indicate if we should overwrite
     * @return {Object} the *same* target object back
     */
    provide: function(target, source, overwrite) {
      // a string means a dot separated object that gets appended to, or created
      return FB.copy(
        typeof target == 'string' ? FB.create(target) : target,
        source,
        overwrite
      );
    },

    /**
     * Generates a weak random ID.
     *
     * @access private
     * @return {String} a random ID
     */
    guid: function() {
      return 'f' + (Math.random() * (1<<30)).toString(16).replace('.', '');
    },

    /**
     * Logs a message for the developer if logging is on.
     *
     * @access private
     * @param args {Object} the thing to log
     */
    log: function(args) {
      if (FB._logging) {
        //TODO what is window.Debug, and should it instead be relying on the
        //     event fired below?
//#JSCOVERAGE_IF 0
        if (window.Debug && window.Debug.writeln) {
          window.Debug.writeln(args);
        } else if (window.console) {
          window.console.log(args);
        }
//#JSCOVERAGE_ENDIF
      }

      // fire an event if the event system is available
      if (FB.Event) {
        FB.Event.fire('fb.log', args);
      }
    },

    /**
     * Shortcut for document.getElementById
     * @method $
     * @param {string} DOM id
     * @return DOMElement
     * @access private
     */
    $: function(id) {
      return document.getElementById(id);
    }
  };
}
