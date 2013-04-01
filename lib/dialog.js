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
 */

/**
 * Dialog creation and management.
 * To get an object, do
 *   var dialog = FB.ui(...);
 * To subscribe to an event, do
 *   FB.dialog.subscribe(
 *     '<event name>', function() { alert("<event name> happened"); });
 * This dialog may fire the following events
 * 'iframe_hide'  This event is fired if an iframe dialog is hidden but not
 *    closed.  Note that the dialog may subsequently reopen, for example if
 *    there was an error.
 * 'iframe_show'  This event is fired when an iframe dialog is first shown, or
 *    when an error dialog is shown.
 * @class FB.Dialog
 * @public
 */
FB.subclass(
  'Dialog',
  'Obj',
  /**
   * constructor
   * @param id
   */
  function(id) {
    this.id = id;
    if (!FB.Dialog._dialogs) {
      FB.Dialog._dialogs = {};
      FB.Dialog._addOrientationHandler();
    }
    FB.Dialog._dialogs[id] = this;
  },

  // Members
  {
  }
);

FB.provide('Dialog', {
  /**
   *
   */
  _dialogs: null,
  _lastYOffset: 0,

  /**
   * The loader element.
   *
   * @access private
   * @type DOMElement
   */
  _loaderEl: null,

  /**
   * A la Snowbox overlay underneath the dialog on iPad.
   *
   * @access private
   * @type DOMElement
   */
  _overlayEl: null,

  /**
   * The stack of active dialogs.
   *
   * @access private
   * @type Array
   */
  _stack: [],

  /**
   * The currently visible dialog.
   *
   * @access private
   * @type DOMElement
   */
  _active: null,

  /**
   * The state of the popstate listener. Prevents multiple listeners from
   * being created.
   *
   * @access private
   * @type bool
   */
  _popStateListenerOn: false,

  /**
   * Hides open dialog on popstate event
   *
   * @access private
   */
  _hideOnPopState: function(e) {
    FB.Dialog.hide(FB.Dialog._stack.pop());
  },

  /**
   * Get dialog by id
   * @access private
   * @param id {string} dialog id
   * @return {Dialog} a dialog object
   */
  get: function(id) {
    return FB.Dialog._dialogs[id];
  },


  /**
   * Find the root dialog node for a given element. This will walk up the DOM
   * tree and while a node exists it will check to see if has the fb_dialog
   * class and if it does returns it.
   *
   * @access private
   * @param node {DOMElement} a child node of the dialog
   * @return {DOMElement} the root dialog element if found
   */
  _findRoot: function(node) {
    while (node) {
      if (FB.Dom.containsCss(node, 'fb_dialog')) {
        return node;
      }
      node = node.parentNode;
    }
  },

  _createWWWLoader: function(width) {
    width = parseInt(width, 10);
    width = width ? width : 460;
    return FB.Dialog.create({
      content: (
      '<div class="dialog_title">' +
      '  <a id="fb_dialog_loader_close">' +
      '    <div class="fb_dialog_close_icon"></div>' +
      '  </a>' +
      '  <span>Facebook</span>' +
      '  <div style="clear:both;"></div>' +
      '</div>' +
      '<div class="dialog_content"></div>' +
      '<div class="dialog_footer"></div>'),
      width: width
    });
  },

  _createMobileLoader: function() {
    // This chrome is native when possible.
    // We're copying the HTML/CSS output of an XHP element here
    // pretty much verbatim to easily keep them in sync.
    // Copied from e.g. facebook.com/dialog/feed as rendered
    // for a mobile user agent.
    var chrome = FB.UA.nativeApp() ?
      '' :
      ('<table>' +
      '  <tbody>' +
      '    <tr>' +
      '      <td class="header_left">' +
      '        <label class="touchable_button">' +
      '          <input type="submit" value="' +
                   FB.Intl.tx._("Cancel") + '"' +
      '            id="fb_dialog_loader_close"/>' +
      '        </label>' +
      '      </td>' +
      '      <td class="header_center">' +
      '        <div>' + FB.Intl.tx._("Loading...") + '</div>' +
      '      </td>' +
      '      <td class="header_right">' +
      '      </td>' +
      '    </tr>' +
      '  </tbody>' +
      '</table>');

    return FB.Dialog.create({
      classes: 'loading' + (FB.UA.iPad() ? ' centered' : ''),
      content: (
        '<div class="dialog_header">' +
          chrome +
        '</div>')
    });
  },

  _restoreBodyPosition: function() {
    if (!FB.UA.iPad()) {
      var body = document.getElementsByTagName('body')[0];
      FB.Dom.removeCss(body, 'fb_hidden');
    }
  },

  _showIPadOverlay: function() {
    if (!FB.UA.iPad()) {
      return;
    }
    if (!FB.Dialog._overlayEl) {
      FB.Dialog._overlayEl = document.createElement('div');
      FB.Dialog._overlayEl.setAttribute('id', 'fb_dialog_ipad_overlay');
      FB.Content.append(FB.Dialog._overlayEl, null);
    }
    FB.Dialog._overlayEl.className = '';
  },

  _hideIPadOverlay: function() {
    if (FB.UA.iPad()) {
      FB.Dialog._overlayEl.className = 'hidden';
    }
  },

  /**
   * Show the "Loading..." dialog. This is a special dialog which does not
   * follow the standard stacking semantics. If a callback is provided, a
   * cancel action is provided using the "X" icon.
   *
   * @param cb {Function} optional callback for the "X" action
   */
  showLoader: function(cb, width) {
    FB.Dialog._showIPadOverlay();

    if (!FB.Dialog._loaderEl) {
      FB.Dialog._loaderEl = FB.Dialog._findRoot(
        FB.UA.mobile()
        ? FB.Dialog._createMobileLoader()
        : FB.Dialog._createWWWLoader(width));
    }

    // this needs to be done for each invocation of showLoader. since we don't
    // stack loaders and instead simply hold on to the last one, it is possible
    // that we are showing nothing when we can potentially be showing the
    // loading dialog for a previously activated but not yet loaded dialog.
    if (!cb) {
      cb = function() {};
    }
    var loaderClose = FB.$('fb_dialog_loader_close');
    FB.Dom.removeCss(loaderClose, 'fb_hidden');
    loaderClose.onclick = function() {
      FB.Dialog._hideLoader();
      FB.Dialog._restoreBodyPosition();
      FB.Dialog._hideIPadOverlay();
      cb();
    };
    var iPadOverlay = FB.$('fb_dialog_ipad_overlay');
    if (iPadOverlay) {
      iPadOverlay.ontouchstart = loaderClose.onclick;
    }

    FB.Dialog._makeActive(FB.Dialog._loaderEl);
  },

  /**
   * Hide the loading dialog if one is being shown.
   *
   * @access private
   */
  _hideLoader: function() {
    if (FB.Dialog._loaderEl && FB.Dialog._loaderEl == FB.Dialog._active) {
      FB.Dialog._loaderEl.style.top = '-10000px';
    }
  },

  /**
   * Center a dialog based on its current dimensions and place it in the
   * visible viewport area.
   *
   * @access private
   * @param el {DOMElement} the dialog node
   */
  _makeActive: function(el) {
    FB.Dialog._setDialogSizes();
    FB.Dialog._lowerActive();
    FB.Dialog._active = el;
    if (FB.Canvas) {
      FB.Canvas.getPageInfo(function(pageInfo) {
        FB.Dialog._centerActive(pageInfo);
      });
    }
    // use the cached version of the pageInfo if slow or failed arbiter
    // or not in canvas
    FB.Dialog._centerActive(FB.Canvas._pageInfo);
  },

  /**
   * Lower the current active dialog if there is one.
   *
   * @access private
   * @param node {DOMElement} the dialog node
   */
  _lowerActive: function() {
    if (!FB.Dialog._active) {
      return;
    }
    FB.Dialog._active.style.top = '-10000px';
    FB.Dialog._active = null;
  },

  /**
   * Remove the dialog from the stack.
   *
   * @access private
   * @param node {DOMElement} the dialog node
   */
  _removeStacked: function(dialog) {
    FB.Dialog._stack = FB.Array.filter(FB.Dialog._stack, function(node) {
      return node != dialog;
    });
  },

  /**
   * Centers the active dialog vertically.
   *
   * @access private
   */
  _centerActive: function(pageInfo) {
    var dialog = FB.Dialog._active;
    if (!dialog) {
      return;
    }

    var view = FB.Dom.getViewportInfo();
    var width = parseInt(dialog.offsetWidth, 10);
    var height = parseInt(dialog.offsetHeight, 10);
    var left = view.scrollLeft + (view.width - width) / 2;

    // Minimum and maximum values for the top of the dialog;
    // these ensure that the dialog is always within the iframe's
    // dimensions, with some padding.
    // @todo(nikolay): When we refactor this module to avoid
    // the excessive use of if (FB.UA.mobile()), get rid of
    // this undesirable padding. It only looks bad on Desktop Safari
    // (because of the scrollbars).
    var minTop = (view.height - height) / 2.5;
    if (left < minTop) {
      minTop = left;
    }
    var maxTop = view.height - height - minTop;

    // center vertically within the page
    var top = (view.height - height) / 2;
    if (pageInfo) {
      top = pageInfo.scrollTop - pageInfo.offsetTop +
        (pageInfo.clientHeight - height) / 2;
    }

    // clamp to min and max
    if (top < minTop) {
      top = minTop;
    } else if (top > maxTop) {
      top = maxTop;
    }

    // offset by the iframe's scroll
    top += view.scrollTop;

    // The body element is hidden at -10000px while we
    // display dialogs. Full-screen on iPhone.
    if (FB.UA.mobile()) {
      // On mobile device (such as iPhone and iPad) that uses soft keyboard,
      // when a text field has focus and the keyboard is shown, the OS will
      // scroll a page to position the text field at the center of the remaining
      // space. If page doesn't have enough height, then OS will effectively
      // pull the page up by force while the keyboard is up, but the page will
      // slide down as soon as the keyboard is hidden.
      // When that happens, it can cause problems. For example, we had a nasty
      // problem with typeahead control in app request dialog. When user types
      // something in the control, the keyboard is up. However, when the user
      // tap a selection, the keyboard disappears. If the page starts to scroll
      // down, then the "click" event may fire from a differnt DOM element and
      // cause wrong item (or no item) to be selected.
      //
      // After a lot of hacking around, the best solution we found is to insert
      // an extra vertical padding element to give the page some extra space
      // such that page won't be forced to scroll beyeond its limit when
      // the text field inside the dialog needs to be centered. The negative
      // side effect of this hack is that there will be some extra space
      // that the user could scroll to.
      var paddingHeight = 100;

      // Smaller and centered on iPad. This should only run when the
      // dialog is first rendered or the device rotated.
      if (FB.UA.iPad()) {
        paddingHeight += (view.height - height) / 2;
      } else {
        var body = document.getElementsByTagName('body')[0];
        FB.Dom.addCss(body, 'fb_hidden');
        left = 10000;
        top = 10000;
      }

      var paddingDivs = FB.Dom.getByClass('fb_dialog_padding', dialog);
      if (paddingDivs.length) {
        paddingDivs[0].style.height = paddingHeight + 'px';
      }
    }

    dialog.style.left = (left > 0 ? left : 0) + 'px';
    dialog.style.top = (top > 0 ? top : 0) + 'px';
  },

  _setDialogSizes: function() {
    if (!FB.UA.mobile() || FB.UA.iPad()) {
      return;
    }
    for (var id in FB.Dialog._dialogs) {
      if (document.getElementById(id)) {
        var iframe = document.getElementById(id);
        iframe.style.width = FB.UIServer.getDefaultSize().width + 'px';
        iframe.style.height = FB.UIServer.getDefaultSize().height + 'px';
      }
    }
  },

  /**
   * This adapt the position and orientation of the dialogs.
   */
  _handleOrientationChange: function(e) {
    // Normally on Android, screen.availWidth/availHeight/width/height reflect
    // values corresponding to the current orientation. In other words,
    // width/height changes depending on orientation. However,
    // on Android 2.3 browser, the values do not change at the time of the
    // "orientation" event, but change shortly after (50-150ms later).
    //
    // This behavior is annoying. I now have to work around it by doing a
    // timer pulling in the orientation event to detect the correct
    // screen.availWidth/height now.
    if (FB.UA.android() && screen.availWidth == FB.Dialog._availScreenWidth) {
      window.setTimeout(FB.Dialog._handleOrientationChange, 50);
      return;
    }

    FB.Dialog._availScreenWidth = screen.availWidth;

    if (FB.UA.iPad()) {
      FB.Dialog._centerActive();
    } else {
      for (var id in FB.Dialog._dialogs) {
        // Resize the width of any iframes still on the page
        if (document.getElementById(id)) {
          document.getElementById(id).style.width =
            FB.UIServer.getDefaultSize().width + 'px';
        }
      }
    }
  },

  /**
   * Add some logic to fire on orientation change.
   */
  _addOrientationHandler: function() {
    if (!FB.UA.mobile()) {
      return;
    }
    // onOrientationChange is fired on iOS and some Android devices,
    // while other Android devices fire resize. Still other Android devices
    // seem to fire neither.
    var event_name = "onorientationchange" in window ?
      'orientationchange' :
      'resize';

    FB.Dialog._availScreenWidth = screen.availWidth;
    FB.Event.listen(window, event_name, FB.Dialog._handleOrientationChange);
  },

  /**
   * Create a dialog. Returns the node of the dialog within which the caller
   * can inject markup. Optional HTML string or a DOMElement can be passed in
   * to be set as the content. Note, the dialog is hidden by default.
   *
   * @access protected
   * @param opts {Object} Options:
   * Property  | Type              | Description                       | Default
   * --------- | ----------------- | --------------------------------- | -------
   * content   | String|DOMElement | HTML String or DOMElement         |
   * onClose   | Boolean           | callback if closed                |
   * closeIcon | Boolean           | `true` to show close icon         | `false`
   * visible   | Boolean           | `true` to make visible            | `false`
   * width     | Int               | width of dialog                   | 'auto'
   * classes   | String            | added to the dialog's classes     | ''
   *
   * @return {DOMElement} the dialog content root
   */
  create: function(opts) {
    opts = opts || {};

    var
      dialog      = document.createElement('div'),
      contentRoot = document.createElement('div'),
      className   = 'fb_dialog';

    // optional close icon
    if (opts.closeIcon && opts.onClose) {
      var closeIcon = document.createElement('a');
      closeIcon.className = 'fb_dialog_close_icon';
      closeIcon.onclick = opts.onClose;
      dialog.appendChild(closeIcon);
    }

    className += ' ' + (opts.classes || '');

    // handle rounded corners j0nx
//#JSCOVERAGE_IF
    if (FB.UA.ie()) {
      className += ' fb_dialog_legacy';
      FB.Array.forEach(
        [
          'vert_left',
          'vert_right',
          'horiz_top',
          'horiz_bottom',
          'top_left',
          'top_right',
          'bottom_left',
          'bottom_right'
        ],
        function(name) {
          var span = document.createElement('span');
          span.className = 'fb_dialog_' + name;
          dialog.appendChild(span);
        }
      );
    } else {
      className += (FB.UA.mobile())
        ? ' fb_dialog_mobile'
        : ' fb_dialog_advanced';
    }

    if (opts.content) {
      FB.Content.append(opts.content, contentRoot);
    }
    dialog.className = className;
    var width = parseInt(opts.width, 10);
    if (!isNaN(width)) {
      dialog.style.width = width + 'px';
    }
    contentRoot.className = 'fb_dialog_content';

    dialog.appendChild(contentRoot);
    if (FB.UA.mobile()) {
      var padding = document.createElement('div');
      padding.className = 'fb_dialog_padding';
      dialog.appendChild(padding);
    }

    FB.Content.append(dialog);

    if (opts.visible) {
      FB.Dialog.show(dialog);
    }

    return contentRoot;
  },

  /**
   * Raises the given iframe dialog. Any active dialogs are automatically
   * lowered. An active loading indicator is suppressed. An already-lowered
   * dialog will be raised and it will be put at the top of the stack. A dialog
   * never shown before will be added to the top of the stack.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  show: function(dialog) {
    var root = FB.Dialog._findRoot(dialog);
    if (root) {
      FB.Dialog._removeStacked(root);
      FB.Dialog._hideLoader();
      FB.Dialog._makeActive(root);
      FB.Dialog._stack.push(root);
      if ('fbCallID' in dialog) {
        FB.Dialog.get(dialog.fbCallID).fire('iframe_show');
      }
      if (!FB.Event._popStateListenerOn) {
        FB.Event.listen(window, 'popstate', FB.Dialog._hideOnPopState);
        FB.Event._popStateListenerOn = true;
      }
    }
  },

  /**
   * Hide the given iframe dialog. The dialog will be lowered and moved out
   * of view, but won't be removed.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  hide: function(dialog) {
    var root = FB.Dialog._findRoot(dialog);
    if (root == FB.Dialog._active) {
      FB.Dialog._lowerActive();
      FB.Dialog._restoreBodyPosition();
      FB.Dialog._hideIPadOverlay();
      if ('fbCallID' in dialog) {
        FB.Dialog.get(dialog.fbCallID).fire('iframe_hide');
      }
      if (FB.Event._popStateListenerOn) {
        FB.Event.unlisten(window, 'popstate', FB.Dialog._hideOnPopState);
        FB.Event._popStateListenerOn = false;
      }
    }
  },

  /**
   * Remove the dialog, show any stacked dialogs.
   *
   * @access protected
   * @param dialog {DOMElement} a child element of the dialog
   */
  remove: function(dialog) {
    dialog = FB.Dialog._findRoot(dialog);
    if (dialog) {
      var is_active = FB.Dialog._active == dialog;
      FB.Dialog._removeStacked(dialog);
      if (is_active) {
        FB.Dialog._hideLoader();
        if (FB.Dialog._stack.length > 0) {
          FB.Dialog.show(FB.Dialog._stack.pop());
        } else {
          FB.Dialog._lowerActive();
          FB.Dialog._restoreBodyPosition();
          FB.Dialog._hideIPadOverlay();
        }
      } else if (FB.Dialog._active === null && FB.Dialog._stack.length > 0) {
        FB.Dialog.show(FB.Dialog._stack.pop());
      }

      // wait before the actual removal because of race conditions with async
      // flash crap. seriously, dont ever ask me about it.
      // if we remove this without deferring, then in IE only, we'll get an
      // uncatchable error with no line numbers, function names, or stack
      // traces. the 3 second delay isn't a problem because the <div> is
      // already hidden, it's just not removed from the DOM yet.
      window.setTimeout(function() {
        dialog.parentNode.removeChild(dialog);
      }, 3000);
    }
  },

  /**
   * Whether a given node is contained within the active dialog's root
   *
   * @access public
   * @param dialog {DOMElement} a child element of the dialog
   */
  isActive: function(node) {
    var root = FB.Dialog._findRoot(node);
    return root && root === FB.Dialog._active;
  }

});
