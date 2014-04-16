(function() {
  var flickrPlugin = {};

  var utils = flickrPlugin.utils = {
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
    },

    removeAllChildren: function(domElement) {
      while (domElement.firstChild) {
        domElement.removeChild(domElement.firstChild);
      }
    }
  };

  // ---------------------------------------------------------------------------

  var FlickrImageModel = flickrPlugin.FlickrImageModel = function(
    data
  ) {
    this.data = data;
  };

  FlickrImageModel.prototype.getId = function() {
    return this.data.id;
  };

  FlickrImageModel.prototype.getImage = function(pageNumber) {
    var d = this.data;
    return "http://farm" + d.farm + ".staticflickr.com/" +
      d.server + "/" +
      d.id + "_" +
      d.secret + "_z.jpg";
  };

  FlickrImageModel.prototype.getThumbnail = function(pageNumber) {
    var d = this.data;
    // (format "http://farm%s.staticflickr.com/%s/%s_%s_z.jpg" farm server id secret)
    return "http://farm" + d.farm + ".staticflickr.com/" +
      d.server + "/" +
      d.id + "_" +
      d.secret + "_s.jpg";
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginModel = flickrPlugin.FlickrPluginModel = function(
    apiKey
  ) {
    flickrPlugin.utils.extendWithHooks(this);
    this.currentPage = 0;
    this.totalPages = 0;
    this.itemsPerPage = 6;
    this.images = [];
    this.lastSeachString = null;
    this.apiKey = apiKey;
    this.currentImage = null;
    this.currentPage = 0;
  };

  FlickrPluginModel.prototype.getImage = function(imageId) {
    var result,
        found = this.images.some(function(image) {
          return (result = image.getId() == imageId);
        });
    if (found) {
      return result;
    }
  };

  FlickrPluginModel.prototype.setCurrentImage = function(imageId) {
    var image = this.getImage(imageId);
    if ( ! image) {
      return;
    }
    this.runHook('currentImageChanged', image);
  };

  FlickrPluginModel.prototype.getCurrentPage = function() {
    return this.currentPage;
  };

  FlickrPluginModel.prototype.getTotalPages = function() {
    return this.totalPages;
  };

  FlickrPluginModel.prototype.gotoLastPage = function(pageNumber) {
    this.gotoPage(this.totalPages);
  };

  FlickrPluginModel.prototype.gotoFirstPage = function(pageNumber) {
    this.gotoPage(1);
  };

  FlickrPluginModel.prototype.gotoPage = function(pageNumber) {
    this.currentPage = pageNumber;
    if (this.lastSeachString) {
      this.search();
    }
    this.runHook('currentPageChanged', this.currentPage);
  };

  FlickrPluginModel.prototype.gotoPage = function(pageNumber) {
    this.currentPage = pageNumber;
    if (this.lastSeachString) {
      this.search();
    }
  };

  FlickrPluginModel.prototype._populate = function(data) {
    this.images = data.photo.map(function(imageData) {
      return new flickrPlugin.FlickrImageModel(
        imageData
      );
    });
  };

  FlickrPluginModel.prototype.search = function(searchString) {
    searchString = searchString || this.lastSeachString;
    if (searchString !== this.lastSeachString) {
      this.currentPage = 0;
    }

    // FIXME: Add currentPage
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
    this.lastSeachString = searchString;
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginPagerView = flickrPlugin.FlickrPluginPagerView = function(
    domElement, model
  ) {
    flickrPlugin.addHook('totalPagesChanged', this._render, this);
    flickrPlugin.addHook('currentPageChanged', this._render, this);
    this.domRoot = domElement;
    this.radius = 5;
  };

  FlickrPluginPagerView.prototype._render = function() {
    var root = this.domRoot;
    utils.removeAllChildren(root);
    var totalPages = this.model.getTotalPages();
    var currentPage = this.model.getCurrentPage();

    var firstPage = Math.max(1, currentPage - this.radius);
    var lastPage = Math.min(totalPages, currentPage + this.radius);

    var start = document.createElement('span');
    var end = document.createElement('span');

    start.appendChild(
       document.createTextNode('<<')
    );
    start.classList.add('start');
    root.appendChild(start);

    for (var i = firstPage; i <= lastPage; i++) {
      var number = document.createElement('span');
      number.appendChild(
        document.createTextNode(i)
      );
      number.setAttribute('data-number', i);
      root.appendChild(number);
    }

    end.appendChild(
       document.createTextNode('>>')
    );
    end.classList.add('end');
    root.appendChild(end);
  };

  // ---------------------------------------------------------------------------

  var FlickrPluginGridView = flickrPlugin.FlickrPluginGridView = function(
    domElement, model
  ) {
    flickrPlugin.addHook('currentPageChanged', this.setTotalPages, this);
    this.domRoot = domElement;
    this.model = model;
  };

  FlickrPluginGridView.prototype._render = function() {
    var images = this.model.getImages();
    var root = this.domRoot;
    utils.removeAllChildren(root);

    images.forEach(function(imageObject) {
      var imageContainer = document.createElement('div');
      var self = this;
      var imageLink = document.createElement('a');
      imageLink.href = '#';

      (function(id) {
        imageLink.onclick = function() {
          self.setCurrentImage(id);
        };
      }(imageObject.getId()));

      imageContainer.appendChild(imageLink);

      var image = document.createElement('img');
      imageLink.appendChild(image);
      image.src = imageObject.getImage();

      root.appendChild(imageContainer);
    });
  };

  window.initFlickrPlugin = function(mainImageDom, pagerDom, gridDom) {
    var model = new FlickrPluginModel('3ed0a4d16d372c4464a49ada6d6212b0');
    var pager = new FlickrPluginPagerView(pagerDom, model);
    var grid = new FlickrPluginGridView(gridDom, model);

  };

}());
