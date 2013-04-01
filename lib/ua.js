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
 * @provides fb.ua
 * @layer basic
 */

/**
 *  User Agent and OS detection. Usage is straightforward:
 *
 *    if (FB.UA.ie()) {
 *      //  IE
 *    }
 *
 *  You can also do version checks:
 *
 *    if (FB.UA.ie() >= 7) {
 *      //  IE7 or better
 *    }
 *
 *  The browser functions will return NaN if the browser does not match, so
 *  you can also do version compares the other way:
 *
 *    if (FB.UA.ie() < 7) {
 *      //  IE6 or worse
 *    }
 *
 *  Note that the version is a float and may include a minor version number,
 *  so you should always use range operators to perform comparisons, not
 *  strict equality.
 *
 *  **Note:** You should **strongly** prefer capability detection to browser
 *  version detection where it's reasonable:
 *
 *    http://www.quirksmode.org/js/support.html
 *
 *  Further, we have a large number of mature wrapper functions and classes
 *  which abstract away many browser irregularities. Check the documentation,
 *  grep for things, or ask on javascript@lists.facebook.com before writing yet
 *  another copy of "event || window.event".
 *
 *  @task browser   Determining the User Agent
 *  @task os        Determining the User's Operating System
 *  @task internal  Internal methods
 *
 *  @author marcel, epriestley
 */
FB.provide('UA', {

  /**
   *  Check if the UA is Internet Explorer.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  ie: function() {
    return FB.UA._populate() || this._ie;
  },


  /**
   *  Check if the UA is Firefox.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  firefox: function() {
    return FB.UA._populate() || this._firefox;
  },


  /**
   *  Check if the UA is Opera.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  opera: function() {
    return FB.UA._populate() || this._opera;
  },


  /**
   *  Check if the UA is Safari.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author marcel
   */
  safari: function() {
    return FB.UA._populate() || this._safari;
  },

  /**
   *  Check if the UA is a Chrome browser.
   *
   *  @task browser
   *  @access public
   *
   *  @return float|NaN Version number (if match) or NaN.
   *  @author cjiang
   */
  chrome : function() {
    return FB.UA._populate() || this._chrome;
  },


  /**
   *  Check if the user is running Windows.
   *
   *  @task os
   *  @return bool `true' if the user's OS is Windows.
   *  @author marcel
   */
  windows: function() {
    return FB.UA._populate() || this._windows;
  },


  /**
   *  Check if the user is running Mac OS X.
   *
   *  @task os
   *  @return bool `true' if the user's OS is Mac OS X.
   *  @author marcel
   */
  osx: function() {
    return FB.UA._populate() || this._osx;
  },

  /**
   * Check if the user is running Linux.
   *
   * @task os
   * @return bool `true' if the user's OS is some flavor of Linux.
   * @author putnam
   */
  linux: function() {
    return FB.UA._populate() || this._linux;
  },

  /**
   * Check if the user is running on an iOS platform.
   *
   * @task os
   * @return bool `true' if the user is running some flavor of the
   *    ios OS.
   * @author beng
   */
  ios: function() {
    FB.UA._populate();
    return FB.UA.mobile() && this._ios;
  },

  /**
   * Check if the browser is running inside a smart mobile phone.
   * @return bool
   * @access public
   */
  mobile: function() {
    FB.UA._populate();
    return !FB._inCanvas && this._mobile;
  },

  /**
   * Checking if we are inside a webview of the FB App for mobile
   * @return bool
   * @access public
   */
  nativeApp: function() {
    // Now native FB app generates UA like this:
    //
    // Mozilla/5.0 (iPhone Simulator; U; CPU iPhone OS 4_2 like Mac OS X; en_IE)
    // AppleWebKit (KHTML, like Gecko) Mobile
    // [FBAN/FBForIPhone;FBAV/3.5a;FBBV/3500;FBDV/i386;FBMD/
    // iPhone Simulator;FBSN/iPhone OS;FBSV/4.2;FBSS/1;FBCR/;
    // FBID/phone;FBLC/en_IE]
    //
    // We will detect by searching for FBAN/\w+;
    //
    return FB.UA.mobile() && navigator.userAgent.match(/FBAN\/\w+;/i);
  },

  /**
   * Check for the Android browser.
   * @return bool
   * @access public
   */
  android: function() {
    FB.UA._populate();
    return FB.UA.mobile() && this._android;
  },

  /**
   * Check for the iPad
   * @return bool
   * @access public
   */
  iPad: function() {
    FB.UA._populate();
    return FB.UA.mobile() && this._iPad;
  },

  _populated : false,

  /**
   *  Populate the UA and OS information.
   *
   *  @access public
   *  @task internal
   *
   *  @return void
   *
   *  @author marcel
   */
  _populate : function() {
    if (FB.UA._populated) {
      return;
    }

    FB.UA._populated = true;

    // To work around buggy JS libraries that can't handle multi-digit
    // version numbers, Opera 10's user agent string claims it's Opera
    // 9, then later includes a Version/X.Y field:
    //
    // Opera/9.80 (foo) Presto/2.2.15 Version/10.10
    // Note: if agent regex is updated, update it in xd_proxy.phpt also!
    var agent = /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))/.exec(navigator.userAgent);
    var os    = /(Mac OS X)|(Windows)|(Linux)/.exec(navigator.userAgent);
    var ios = /\b(iPhone|iP[ao]d)/.exec(navigator.userAgent);
    FB.UA._iPad = /\b(iPad)/.exec(navigator.userAgent);
    FB.UA._android = navigator.userAgent.match(/Android/i);
    FB.UA._mobile = ios || FB.UA._android ||
      navigator.userAgent.match(/Mobile/i);

    if (agent) {
      FB.UA._ie      = agent[1] ? parseFloat(agent[1]) : NaN;
      // marcel: IE8 running in IE7 mode.
      if (FB.UA._ie >= 8 && !window.HTMLCollection) {
        FB.UA._ie = 7;
      }
      FB.UA._firefox = agent[2] ? parseFloat(agent[2]) : NaN;
      FB.UA._opera   = agent[3] ? parseFloat(agent[3]) : NaN;
      FB.UA._safari  = agent[4] ? parseFloat(agent[4]) : NaN;
      if (FB.UA._safari) {
        // We do not add the regexp to the above test, because it will always
        // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
        // the userAgent string.
        agent = /(?:Chrome\/(\d+\.\d+))/.exec(navigator.userAgent);
        FB.UA._chrome = agent && agent[1] ? parseFloat(agent[1]) : NaN;
      } else {
        FB.UA._chrome = NaN;
      }
    } else {
      FB.UA._ie      =
      FB.UA._firefox =
      FB.UA._opera   =
      FB.UA._chrome  =
      FB.UA._safari  = NaN;
    }

    if (os) {
      FB.UA._osx     = !!os[1];
      FB.UA._windows = !!os[2];
      FB.UA._linux   = !!os[3];
    } else {
      FB.UA._osx     =
      FB.UA._windows =
      FB.UA._linux   = false;
    }

    FB.UA._ios    = ios;
  }
});
