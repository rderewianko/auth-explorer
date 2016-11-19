import URI from 'urijs';

class Helpers {
  static randomGUID() {
    // See: http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16|0, v = c === 'x' ? r : ((r&0x3)|0x8);
      return v.toString(16);
    });
  }

  static parseParamsFromUrl(url) {
    let uri = URI(url);
    let params = {};
    if (uri.query()) {
      params = this.parseParams(uri.search());
    }
    if (uri.hash()) {
      params = this.parseParams(uri.hash());
    }
    return params;
  }

  static parseParams(raw_params) {
    // See: https://developers.google.com/accounts/docs/OAuth2UserAgent
    var params = {};
    var rx = /([^&=]+)=([^&]*)/g;
    var match;
    var query_string = raw_params.substring(1);
    while (match = rx.exec(query_string)) {
      params[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
    }
    return params;
  }
}

export default Helpers;