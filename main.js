(function() {
  var flickrPlugin = {};

  flickrPlugin.utils = {
    runHook: function(hookName) {
      var args = Array.prototype.slice.apply(arguments, 1);
      var hooks = this.hooks[hookName] || [];
      hooks.forEach(function(hook) {
        hook[1].apply(hook[0], args);
      });
    },

    addHook: function(hookName, handler, object) {
      var hook = this.hooks[hookName] = this.hooks[hookName] || [];
      hook.push([object, handler]);
    },

    extendWithHooks: function(object) {
      object.hooks = {};
      object.addHook = this.addHook;
      object.runHook = this.runHook;
    }
  };

  // ---------------------------------------------------------------------------

  var FlickrPlugin = flickrPlugin.FlickrPlugin = function(
    domElement, apiKey
  ) {
    flickrPlugin.utils.extendWithHooks(this);
    this.currentPage = 0;
    this.totalPages = 0;
    this.itemsPerPage = 6;
    this.gridDomRooot = null;
    this.imageDomRooot = null;
    this.currentData = null;
    this.apiKey = apiKey;
  };

  FlickrPlugin.prototype.setCurrentPage = function(pageNumber) {

  };

  FlickrPlugin.prototype._setContent = function(data) {
    this.setCurrentPage();
  };

  FlickrPlugin.prototype._populate = function(data) {
    this.setCurrentPage();
    // (format "http://farm%s.staticflickr.com/%s/%s_%s_z.jpg" farm server id secret)
  };

  FlickrPlugin.prototype.searchFlickr = function(searchString) {
    var self = this;
    var url = [
      'http://api.flickr.com/services/rest/?format=json',
      'sort=random',
      'method=flickr.photos.search',
      'tags=' + encodeURIComponent(searchString),
      'tag_mode=all',
      'per_page=' + this.itemsPerPage,
      'api_key=' + this.apiKey,
    ].join('&');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);

    xhr.onload = function() {
      var json = JSON.parse(
        xhr.responseText
          .replace(/^[^\(]+\(/, '')
          .replace(/\)[^\)]*$/, '')
      );
      self._populate(json);
    };

    xhr.send();
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginPager = flickrPlugin.FlickrPluginPager = function(
    // FIXME?: Change to "pageable"
    domElement, flickrPlugin
  ) {
    flickrPlugin.addHook('totalPagesChanged', this.setTotalPages, this);
    flickrPlugin.addHook('currentPageChanged', this.setTotalPages, this);
  };

  FlickrPluginPager.prototype.setCurrentPage = function(pageNumber) {
    this.pageNumber = pageNumber;
  };

  FlickrPluginPager.prototype.setTotalPages = function(pageNumber) {

  };

  FlickrPluginPager.prototype.setTotalPages = function(pageNumber) {

  };

  window.flickrPlugin = flickrPlugin;
}());
