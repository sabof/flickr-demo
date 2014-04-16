(function() {
  var flickrPlugin = {};

  var utils = flickrPlugin.utils = {
    runHook: function(hookName) {
      var args = Array.prototype.slice.call(arguments, 1);
      var hooks = this.hooks[hookName] || [];
      hooks.forEach(function(hook) {
        hook[0].apply(hook[1], args);
      });
    },

    addHook: function(hookName, handler, object) {
      var hook = this.hooks[hookName] = this.hooks[hookName] || [];
      hook.push([handler, object]);
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
    this.itemsPerPage = 8;
    this.images = [];
    this.lastSeachString = null;
    this.apiKey = apiKey;
    this.currentImage = null;
    this.currentPage = 0;
  };

  FlickrPluginModel.prototype.getCurrentImage = function(imageId) {
    return this.currentImage;
  };

  FlickrPluginModel.prototype.getImage = function(imageId) {
    var result,
        found = this.images.some(function(image) {
          if (image.getId() == imageId) {
            result = image;
            return image;
          }
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
    this.currentImage = image;
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

  FlickrPluginModel.prototype.getImages = function() {
    return this.images;
  };

  FlickrPluginModel.prototype._populate = function(data) {
    this.images = data.photos.photo.map(function(imageData) {
      return new flickrPlugin.FlickrImageModel(
        imageData
      );
    });
    this.setCurrentImage(this.images[0].getId);
    this.runHook('currentPageChanged', this.currentPage);
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
    this.model = model;
    model.addHook('totalPagesChanged', this._render, this);
    model.addHook('currentPageChanged', this._render, this);
    this.domRoot = domElement;
    this.radius = 5;
  };

  FlickrPluginPagerView.prototype._render = function() {
    console.log('_render ran');
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
    this.model = model;
    model.addHook('currentPageChanged', this._render, this);
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
          self.model.setCurrentImage(id);
          return false;
        };
      }(imageObject.getId()));

      imageContainer.appendChild(imageLink);

      var image = document.createElement('img');
      imageLink.appendChild(image);
      image.src = imageObject.getThumbnail();

      root.appendChild(imageContainer);
    });
  };

  // ---------------------------------------------------------------------------

  var FlickrImageView = function(
    domElement, model
  ) {
    this.model = model;
    model.addHook('currentImageChanged', this._render, this);
    this.domRoot = domElement;
    this.model = model;
  };

  FlickrImageView.prototype._render = function() {
    var root = this.domRoot;
    utils.removeAllChildren(root);

    var image = document.createElement('img');
    root.appendChild(image);
    image.src = this.model
      .getCurrentImage()
      .getImage();

  };

  // ---------------------------------------------------------------------------

  var FlickrSearchView = function(
    domElement, model
  ) {
    this.domRoot = domElement;
    this.model = model;
    domElement.onchange = function() {
      console.log('search ran');
      model.search(this.value);
    };
  };

  // ---------------------------------------------------------------------------

  window.initFlickrPlugin = function(apiKey, mainImageDom, pagerDom, gridDom, searchDom) {
    var model = this.model = new FlickrPluginModel(apiKey);
    this.pager = new FlickrPluginPagerView(pagerDom, model);
    this.grid = new FlickrPluginGridView(gridDom, model);
    this.image = new FlickrImageView(mainImageDom, model);
    this.search = new FlickrSearchView(searchDom, model);
  };

}());
