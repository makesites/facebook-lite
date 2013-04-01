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
 * @provides fb.ui
 * @requires fb.prelude
 *           fb.canvas
 *           fb.content
 *           fb.dialog
 *           fb.qs
 *           fb.json
 *           fb.xd
 *           fb.arbiter
 *           fb.ua
 */

/**
 * UI Calls.
 *
 * @class FB
 * @static
 * @access private
 */
FB.provide('', {
  /**
   * Method for triggering UI interaction with Facebook as iframe dialogs or
   * popups, like publishing to the stream, sharing links.
   *
   * Example **stream.publish**:
   *
   *      FB.ui(
   *        {
   *          method: 'stream.publish',
   *          message: 'getting educated about Facebook Connect',
   *          attachment: {
   *            name: 'Connect',
   *            caption: 'The Facebook Connect JavaScript SDK',
   *            description: (
   *              'A small JavaScript library that allows you to harness ' +
   *              'the power of Facebook, bringing the user\'s identity, ' +
   *              'social graph and distribution power to your site.'
   *            ),
   *            href: 'http://github.com/facebook/connect-js'
   *          },
   *          action_links: [
   *            { text: 'Code', href: 'http://github.com/facebook/connect-js' }
   *          ],
   *          user_message_prompt: 'Share your thoughts about Connect'
   *        },
   *        function(response) {
   *          if (response && response.post_id) {
   *            alert('Post was published.');
   *          } else {
   *            alert('Post was not published.');
   *          }
   *        }
   *      );
   *
   * Example **stream.share**:
   *
   *      var share = {
   *        method: 'stream.share',
   *        u: 'http://fbrell.com/'
   *      };
   *
   *      FB.ui(share, function(response) { console.log(response); });
   *
   * @access public
   * @param params {Object} The required arguments vary based on the method
   * being used, but specifying the method itself is mandatory. If *display* is
   * not specified, then iframe dialogs will be used when possible, and popups
   * otherwise.
   *
   * Property | Type    | Description                        | Argument
   * -------- | ------- | ---------------------------------- | ------------
   * method   | String  | The UI dialog to invoke.           | **Required**
   * display  | String  | Specify `"popup"` to force popups. | **Optional**
   * @param cb {Function} Optional callback function to handle the result. Not
   * all methods may have a response.
   */
  ui: function(params, cb) {
    params = FB.copy({}, params);
    if (!params.method) {
      FB.log('"method" is a required parameter for FB.ui().');
      return null;
    }

    // process popup-only permissions
    if ((params.method == 'permissions.request' ||
         params.method == 'permissions.oauth') &&
        (params.display == 'iframe' || params.display == 'dialog')) {
      var perms;
      var requested_perms;
      perms = params.scope;
      requested_perms = perms.split(/\s|,/g);
      // OAuth2 spec says scope should be space delimited, but
      // we previously accepted comma delimited strings.  We'll accept both.
      for (var i = 0; i < requested_perms.length; i++) {
        var perm = FB.String.trim(requested_perms[i]);
        // force a popup if we are not in the whitelist or we're set as
        // false explicitly (and if the perm value is nonempty)
        if (perm && !FB.initSitevars.iframePermissions[perm]) {
          params.display = 'popup';
          // we call this recursively to reprocess the prepareCall logic
          // and make sure we'll pass the right parameters.
          break;
        }
      }
    }

    var call = FB.UIServer.prepareCall(params, cb);
    if (!call) { // aborted
      return null;
    }

    // each allowed "display" value maps to a function
    var displayName = call.params.display;
    if (displayName === 'dialog') { // TODO remove once all dialogs are on
                                   // uiserver
      displayName = 'iframe';
    } else if (displayName === 'none') {
      displayName = 'hidden';
    }

    var displayFn = FB.UIServer[displayName];
    if (!displayFn) {
      FB.log('"display" must be one of "popup", ' +
             '"dialog", "iframe", "touch", "async", "hidden", or "none"');
      return null;
    }

    displayFn(call);

    return call.dialog;
  }
});

/**
 * Internal UI functions.
 *
 * @class FB.UIServer
 * @static
 * @access private
 */
FB.provide('UIServer', {
  /**
   * UI Methods will be defined in this namespace.
   */
  Methods: {},
  // Child iframes or popup windows.
  _loadedNodes   : {},
  _defaultCb     : {},
  _resultToken   : '"xxRESULTTOKENxx"',
  _forceHTTPS    : false,

  /**
   * Serves as a generic transform for UI Server dialogs. Once all dialogs are
   * built on UI Server, this will just become the default behavior.
   *
   * Current transforms:
   * 1) display=dialog -> display=iframe. Most of the old Connect stuff uses
   *    dialog, but UI Server uses iframe.
   * 2) Renaming of channel_url parameter to channel.
   */
  genericTransform: function(call) {
    if (call.params.display == 'dialog' || call.params.display == 'iframe') {
      call.params.display = 'iframe';
      call.params.channel = FB.UIServer._xdChannelHandler(
        call.id,
        'parent.parent'
      );
    }

    return call;
  },

  /**
   * Prepares a generic UI call. Some regular API call also go through
   * here though via hidden iframes.
   *
   * @access private
   * @param params {Object} the user supplied parameters
   * @param cb {Function} the response callback
   * @returns {Object} the call data
   */
  prepareCall: function(params, cb) {
    var
      name   = params.method.toLowerCase(),
      method = FB.copy({}, FB.UIServer.Methods[name]),
      id     = FB.guid(),
      // TODO(naitik) don't want to force login status over HTTPS just yet. all
      // other UI Server interactions will be forced over HTTPS,
      // Methods can choose to not use https by setting noHttps=true
      forceHTTPS = (method.noHttps !== true) &&
                   (FB._https ||
                    (name !== 'auth.status' && name != 'login.status'));
      FB.UIServer._forceHTTPS = forceHTTPS;

    // default stuff
    FB.copy(params, {
      api_key      : FB._apiKey,
      app_id       : FB._apiKey,
      locale       : FB._locale,
      sdk          : 'joey',
      access_token : forceHTTPS && FB.getAccessToken() || undefined
    });

    // overwrite display based on final param set
    params.display = FB.UIServer.getDisplayMode(method, params);

    // set the default dialog URL if one doesn't exist
    if (!method.url) {
      method.url = 'dialog/' + name;
    }
    // the basic call data
    var call = {
      cb     : cb,
      id     : id,
      size   : method.size || FB.UIServer.getDefaultSize(),
      url    : FB.getDomain(forceHTTPS ? 'https_www' : 'www') + method.url,
      forceHTTPS: forceHTTPS,
      params : params,
      name   : name,
      dialog : new FB.Dialog(id)
    };

    // optional method transform
    var transform = method.transform
      ? method.transform
      : FB.UIServer.genericTransform;
    if (transform) {
      call = transform(call);

      // nothing returned from a transform means we abort
      if (!call) {
        return;
      }
    }

    // setting these after to ensure the value is based on the final
    // params.display value
    var getXdRelationFn = method.getXdRelation || FB.UIServer.getXdRelation;
    var relation = getXdRelationFn(call.params);
    if (!(call.id in FB.UIServer._defaultCb) &&
        !('next' in call.params) &&
        !('redirect_uri' in call.params)) {
      call.params.next = FB.UIServer._xdResult(
        call.cb,
        call.id,
        relation,
        true // isDefault
      );
    }
    if (relation === 'parent') {
      call.params.channel_url = FB.UIServer._xdChannelHandler(
        id,
        'parent.parent'
      );
    }

    // Encode the params as a query string or in the fragment
    call = FB.UIServer.prepareParams(call);

    return call;
  },

  prepareParams: function(call) {
    var method = call.params.method;
    // Page iframes still hit /fbml/ajax/uiserver.php
    // which uses the old method names.
    // On the other hand, the new endpoint might not expect
    // the method as a param.
   /*
    if (!FB.Canvas.isTabIframe()) {
      delete call.params.method;
    }
	*/
    if (FB.TemplateUI && FB.TemplateUI.supportsTemplate(method, call)) {
      // Temporary debug info.
      if (FB.reportTemplates) {
        console.log("Using template for " + method + ".");
      }
      FB.TemplateUI.useCachedUI(method, call);
    } else {
      // flatten parameters as needed
      call.params = FB.JSON.flatten(call.params);
      var encodedQS = FB.QS.encode(call.params);

      // To overcome the QS length limitation on some browsers
      // (the fb native app is an exception because it doesn't
      // doesn't support POST for dialogs).
      if (!FB.UA.nativeApp() &&
          FB.UIServer.urlTooLongForIE(call.url + '?' + encodedQS)) {
        call.post = true;
      } else if (encodedQS) {
        call.url += '?' + encodedQS;
      }
    }

    return call;
  },

  urlTooLongForIE: function(fullURL) {
    return fullURL.length > 2000;
  },

  /**
   * Determine the display mode for the call.
   *
   * @param method {Object} the method definition object
   * @param params {Object} the developer supplied parameters
   * @return {String} the display mode
   */
  getDisplayMode: function(method, params) {
    if (params.display === 'hidden' ||
        params.display === 'none') {
      return params.display;
    }

    if (FB.Canvas.isTabIframe() &&
        params.display !== 'popup') {
      return 'async';
    }

    // For mobile, we should use touch display mode
    if (FB.UA.mobile() || params.display === 'touch') {
      return 'touch';
    }

    // cannot use an iframe "dialog" if an access token is not available
    if (!FB.getAccessToken() &&
        params.display == 'dialog' &&
        !method.loggedOutIframe) {
      FB.log('"dialog" mode can only be used when the user is connected.');
      return 'popup';
    }

    if (method.connectDisplay && !FB._inCanvas) {
      return method.connectDisplay;
    }

    // TODO change "dialog" to "iframe" once moved to uiserver
    return params.display || (FB.getAccessToken() ? 'dialog' : 'popup');
  },

  /**
   * Determine the frame relation for given params
   *
   * @param params {Object} the call params
   * @return {String} the relation string
   */
  getXdRelation: function(params) {
    var display = params.display;
    if (display === 'popup' || display === 'touch') {
      return 'opener';
    }
    if (display === 'dialog' || display === 'iframe' ||
        display === 'hidden' || display === 'none') {
      return 'parent';
    }
    if (display === 'async') {
      return 'parent.frames[' + window.name + ']';
    }
  },

  /**
   * Open a popup window with the given url and dimensions and place it at the
   * center of the current window.
   *
   * @access private
   * @param call {Object} the call data
   */
  popup: function(call) {
    // we try to place it at the center of the current window
    var
      _screenX   = typeof window.screenX      != 'undefined'
        ? window.screenX
        : window.screenLeft,
      screenY    = typeof window.screenY      != 'undefined'
        ? window.screenY
        : window.screenTop,
      outerWidth = typeof window.outerWidth   != 'undefined'
        ? window.outerWidth
        : document.documentElement.clientWidth,
      outerHeight = typeof window.outerHeight != 'undefined'
        ? window.outerHeight
        : (document.documentElement.clientHeight - 22), // 22= IE toolbar height

      // Mobile popups should never specify width/height features since it
      // messes with the dimension styles of the page layout.
      width    = FB.UA.mobile() ? null : call.size.width,
      height   = FB.UA.mobile() ? null : call.size.height,
      screenX  = (_screenX < 0) ? window.screen.width + _screenX : _screenX,
      left     = parseInt(screenX + ((outerWidth - width) / 2), 10),
      top      = parseInt(screenY + ((outerHeight - height) / 2.5), 10),
      features = [];

    if (width !== null) {
      features.push('width=' + width);
    }
    if (height !== null) {
      features.push('height=' + height);
    }
    features.push('left=' + left);
    features.push('top=' + top);
    features.push('scrollbars=1');
    if (call.name == 'permissions.request' ||
        call.name == 'permissions.oauth') {
      features.push('location=1,toolbar=0');
    }
    features = features.join(',');

    // either a empty window and then a POST, or a direct GET to the full url
    if (call.post) {
      FB.UIServer.setLoadedNode(call,
        window.open('about:blank', call.id, features), 'popup');
      FB.Content.submitToTarget({
        url    : call.url,
        target : call.id,
        params : call.params
      });
    } else {
      FB.UIServer.setLoadedNode(call,
        window.open(call.url, call.id, features), 'popup');
    }

    // if there's a default close action, setup the monitor for it
    if (call.id in FB.UIServer._defaultCb) {
      FB.UIServer._popupMonitor();
    }
  },

  setLoadedNode: function(call, node, type) {
    if (call.params && call.params.display != 'popup') {
      // Note that we avoid setting fbCallID property on node when
      // display is popup because when the page is loaded via http,
      // you can't set a property on an https popup window in IE.
      node.fbCallID = call.id;
    }
    node = {
      node: node,
      type: type,
      fbCallID: call.id
    };
    FB.UIServer._loadedNodes[call.id] = node;
  },

  getLoadedNode: function(call) {
    var id = typeof call == 'object' ? call.id : call,
        node = FB.UIServer._loadedNodes[id];
    return node ? node.node : null;
  },

  /**
   * Builds and inserts a hidden iframe based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  hidden: function(call) {
    call.className = 'FB_UI_Hidden';
    //call.root = FB.Content.appendHidden('');
    FB.UIServer._insertIframe(call);
  },

  /**
   * Builds and inserts a iframe dialog based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  iframe: function(call) {
    call.className = 'FB_UI_Dialog';
    var onClose = function() {
      FB.UIServer._triggerDefault(call.id);
    };
    call.root = FB.Dialog.create({
      onClose: onClose,
      closeIcon: true,
      classes: (FB.UA.iPad() ? 'centered' : '')
    });
    if (!call.hideLoader) {
      FB.Dialog.showLoader(onClose, call.size.width);
    }
    FB.Dom.addCss(call.root, 'fb_dialog_iframe');
    FB.UIServer._insertIframe(call);
  },

  /**
   * Display an overlay dialog on a mobile device. This works both in the native
   *  mobile canvas frame as well as a regular mobile web browser.
   *
   * @access private
   * @param call {Object} the call data
   */
  touch: function(call) {
    if (call.params && call.params.in_iframe) {
      // Cached dialog was already created. Still show loader while it runs
      // JS to adapt its content to the FB.ui params.
      if (call.ui_created) {
        FB.Dialog.showLoader(function() {
          FB.UIServer._triggerDefault(call.id);
        }, 0);
      } else {
        FB.UIServer.iframe(call);
      }
    } else if (FB.UA.nativeApp() && !call.ui_created) {
      // When running inside native app, window.open is not supported.
      // We need to create an webview using custom JS bridge function
      call.frame = call.id;
      FB.Native.onready(function() {
        // TODO:
        // We normally use window.name to pass cb token, but
        // FB.Native.open doesn't accept a name parameter that it
        // can pass to webview, so we use pass name through
        // fragment for now. We should investigate to see if we can
        // pass a window.name
        FB.UIServer.setLoadedNode(call, FB.Native.open(
          call.url + '#cb=' + call.frameName));
      });
      FB.UIServer._popupMonitor();
    } else if (!call.ui_created) {
      // Use popup by default
      FB.UIServer.popup(call);
    }
  },

  /**
   * This is used when the application is running as a child iframe on
   * facebook.com. This flow involves sending a message to the parent frame and
   * asking it to render the UIServer dialog as part of the Facebook chrome.
   *
   * @access private
   * @param call {Object} the call data
   */
  async: function(call) {
    call.frame = window.name;
    delete call.url;
    delete call.size;
    FB.Arbiter.inform('showDialog', call);
  },

  getDefaultSize: function() {
    if (FB.UA.mobile()) {
      if (FB.UA.iPad()) {
        return {
          width: 500,
          height: 590
        };
      } else if (FB.UA.android()) {
        // Android browser needs special handling because
        // window.innerWidth/Height doesn't return correct values
        return {
          width: screen.availWidth,
          height: screen.availHeight
        };
      } else {
        var width = window.innerWidth;
        var height = window.innerHeight;
        var isLandscape = width / height > 1.2;
        // Make sure that the iframe width is not greater than screen width.
        // We also start by calculating full screen height. In that case,
        // window.innerHeight is not good enough because it doesn't take into
        // account the height of address bar, etc. So we tried to use
        // screen.width/height, but that alone is also not good enough because
        // screen value is physical pixel value, but we need virtual pixel
        // value because the virtual pixels value can be different from physical
        // values depending on viewport meta tags.
        // So in the end, we use the maximum value. It is OK
        // if the height is too high because our new mobile dialog flow the
        // content from top down.
        return {
          width: width,
          height: Math.max(height,
                         (isLandscape ? screen.width : screen.height))
        };
      }
    }
    return {width: 575, height: 240};
  },

  /**
   * Inserts an iframe based on the given call data.
   *
   * @access private
   * @param call {Object} the call data
   */
  _insertIframe: function(call) {
    // the dialog may be cancelled even before we have a valid iframe node
    // giving us a race condition. if this happens, the call.id will be removed
    // from the _frames nodes, and we won't add the node back in.
    FB.UIServer._loadedNodes[call.id] = false;
    var activate = function(node) {
      if (call.id in FB.UIServer._loadedNodes) {
        FB.UIServer.setLoadedNode(call, node, 'iframe');
      }
    };

    // either a empty iframe and then a POST, or a direct GET to the full url
	console.log("call", call);
	/*
    if (call.post) {
      FB.Content.insertIframe({
        url       : 'about:blank',
        root      : call.root,
        className : call.className,
        width     : call.size.width,
        height    : call.size.height,
        id        : call.id,
        onInsert  : activate,
        onload    : function(node) {
          FB.Content.submitToTarget({
            url    : call.url,
            target : node.name,
            params : call.params
          });
        }
      });
    } else {
      FB.Content.insertIframe({
        url       : call.url,
        root      : call.root,
        className : call.className,
        width     : call.size.width,
        height    : call.size.height,
        id        : call.id,
        name      : call.frameName,
        onInsert  : activate
      });
    }
	*/
  },

  /**
   * @param frame {String} the id of the iframe being resized
   * @param data {Object} data from the XD call it made
   *
   * @access private
   */
  _handleResizeMessage: function(frame, data) {
    var node = FB.UIServer.getLoadedNode(frame);
    if (!node) {
      return;
    }

    if (data.height) {
      node.style.height = data.height + 'px';
    }
    if (data.width) {
      node.style.width = data.width + 'px';
    }

    FB.Arbiter.inform(
      'resize.ack',
      data || {},
      'parent.frames[' + node.name + ']',
      true);

    if (!FB.Dialog.isActive(node)) {
      FB.Dialog.show(node);
    }
  },

  /**
   * Trigger the default action for the given call id.
   *
   * @param id {String} the call id
   */
  _triggerDefault: function(id) {
    FB.UIServer._xdRecv(
      { frame: id },
      FB.UIServer._defaultCb[id] || function() {}
    );
  },

  /**
   * Start and manage the window monitor interval. This allows us to invoke
   * the default callback for a window when the user closes the window
   * directly.
   *
   * @access private
   */
  _popupMonitor: function() {
    // check all open windows
    var found;
    for (var id in FB.UIServer._loadedNodes) {
      // ignore prototype properties, and ones without a default callback
      if (FB.UIServer._loadedNodes.hasOwnProperty(id) &&
          id in FB.UIServer._defaultCb) {
        var node = FB.UIServer._loadedNodes[id];
        if (node.type != 'popup') {
          continue;
        }
        win = node.node;

        try {
          // found a closed window
          if (win.closed) {
            FB.UIServer._triggerDefault(id);
          } else {
            found = true; // need to monitor this open window
          }
        } catch (y) {
          // probably a permission error
        }
      }
    }

    if (found && !FB.UIServer._popupInterval) {
      // start the monitor if needed and it's not already running
      FB.UIServer._popupInterval = window.setInterval(
        FB.UIServer._popupMonitor,
        100
      );
    } else if (!found && FB.UIServer._popupInterval) {
      // shutdown if we have nothing to monitor but it's running
      window.clearInterval(FB.UIServer._popupInterval);
      FB.UIServer._popupInterval = null;
    }
  },

  /**
   * Handles channel messages that do not kill the dialog or remove the handler.
   * Terminating logic should be handled within the "next" handler.
   *
   * @access private
   * @param frame {String} the frame id
   * @param relation {String} the frame relation
   * @return {String} the handler url
   */
  _xdChannelHandler: function(frame, relation) {
    var forceHTTPS = (FB.UIServer._forceHTTPS &&
      FB.UA.ie() !== 7);
	  /*
    return FB.XD.handler(function(data) {
      var node = FB.UIServer.getLoadedNode(frame);
      if (!node) { // dead handler
        return;
      }

      if (data.type == 'resize') {
        FB.UIServer._handleResizeMessage(frame, data);
      } else if (data.type == 'hide') {
        FB.Dialog.hide(node);
      } else if (data.type == 'rendered') {
        var root = FB.Dialog._findRoot(node);
        FB.Dialog.show(root);
      } else if (data.type == 'fireevent') {
        FB.Event.fire(data.event);
      }
    }, relation, true, null, forceHTTPS);
	*/
  },

  /**
   * A "next handler" is a specialized XD handler that will also close the
   * frame.  This can be a hidden iframe, iframe dialog or a popup window.
   * Once it is fired it is also deleted.
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   frame id for the callback will be used with
   * @param relation  {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @return         {String}   the xd url bound to the callback
   */
  _xdNextHandler: function(cb, frame, relation, isDefault) {
    if (isDefault) {
      FB.UIServer._defaultCb[frame] = cb;
    }
	/*
    return FB.XD.handler(function(data) {
      FB.UIServer._xdRecv(data, cb);
    }, relation) + '&frame=' + frame;
	*/
  },

  /**
   * Handles the parsed message, invokes the bound callback with the data and
   * removes the related window/frame. This is the asynchronous entry point for
   * when a message arrives.
   *
   * @access private
   * @param data {Object} the message parameters
   * @param cb {Function} the callback function
   */
  _xdRecv: function(data, cb) {
    var frame = FB.UIServer.getLoadedNode(data.frame);
    if (frame) {
      // iframe
      try {
        if (FB.Dom.containsCss(frame, 'FB_UI_Hidden')) {
          // wait before the actual removal because of race conditions with
          // async flash crap. seriously, dont ever ask me about it.
          window.setTimeout(function() {
            // remove the parentNode to match what FB.UIServer.hidden() does
            frame.parentNode.parentNode.removeChild(frame.parentNode);
          }, 3000);
        } else if (FB.Dom.containsCss(frame, 'FB_UI_Dialog')) {
          FB.Dialog.remove(frame);
          if (FB.TemplateUI && FB.UA.mobile()) {
            FB.TemplateUI.populateCache();
          }
        }
      } catch (x) {
        // do nothing, permission error
      }

      // popup window
      try {
        if (frame.close) {
          frame.close();
          FB.UIServer._popupCount--;
        }
      } catch (y) {
        // do nothing, permission error
      }

    }
    // cleanup and fire
    delete FB.UIServer._loadedNodes[data.frame];
    delete FB.UIServer._defaultCb[data.frame];
    cb(data);
  },

  /**
   * Some Facebook redirect URLs use a special ``xxRESULTTOKENxx`` to return
   * custom values. This is a convenience function to wrap a callback that
   * expects this value back.
   *
   * @access private
   * @param cb        {Function} the callback function
   * @param frame     {String}   the frame id for the callback is tied to
   * @param target    {String}   parent or opener to indicate window relation
   * @param isDefault {Boolean}  is this the default callback for the frame
   * @return          {String}   the xd url bound to the callback
   */
  _xdResult: function(cb, frame, target, isDefault) {
    return (
      FB.UIServer._xdNextHandler(function(params) {
        cb && cb(params.result &&
                 params.result != FB.UIServer._resultToken &&
                 FB.JSON.parse(params.result));
      }, frame, target, isDefault) +
      '&result=' + encodeURIComponent(FB.UIServer._resultToken)
    );
  }
});

/*	
Facebook.prototype.ui = function(options, callback){
	// ui dialogues
	Example: 
	FB.ui(
	  {
		method: 'feed',
		name: 'Facebook Dialogs',
		link: 'http://developers.facebook.com/docs/reference/dialogs/',
		picture: 'http://fbrell.com/f8.jpg',
		caption: 'Reference Documentation',
		description: 'Dialogs provide a simple, consistent interface for applications to interface with users.'
	  },
	  function(response) {
		if (response && response.post_id) {
		  alert('Post was published.');
		} else {
		  alert('Post was not published.');
		}
	  }
	); 
};
*/