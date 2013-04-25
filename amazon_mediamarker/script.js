var $ = function (id){
    return document.getElementById(id);
};
var $N = function (name){
    return document.getElementsByName(name);
};

var Map = function (obj){
    this.obj = obj;
};
Map.prototype.join = function (separator){
    var list = [];
    for (var k in this.obj) {
        list.push(k + separator + this.obj[k]);
    }
    return list;
};

var Template = function (){
};
Template.comment = "";
Template.load = function (id, map){
    var tmpl = $(id + '_template').value;
    for (var key in map) {
        var value = map[key];
        if (key === "url") {
            tmpl = tmpl.replace('[[url]]', 'http://mediamarker.net/reg?mode=marklet&url=' + value + "&comment=" + encodeURIComponent(Template.comment));
        } else if (key !== "asin") {
            tmpl = tmpl.replace('[[' + key + ']]', value);
        }
    }
    return tmpl;
};

var JSONP = function (){
};
JSONP._count = 0;
JSONP.clear_cache = (function (){
    JSONP._cache = {};
})();
JSONP.prototype.load = function (){
    var uri = this.uri;
    var callback_func = this.callback;
    if (JSONP._cache[uri]) {
        callback_func(JSONP._cache[uri]);
        return;
    }

    var callback_name = 'callback' + (JSONP._count++);
    JSONP[callback_name] = function (res){
        JSONP._cache[uri] = res;
        callback_func(res);
    };
    var script = document.createElement('script');
    script.setAttribute('src', uri + 'JSONP.' + callback_name);
    script.setAttribute('type', 'text/javascript');
    script.setAttribute('charset', 'utf-8');
    document.getElementsByTagName('head')[0].appendChild(script);
};

var Amazon = function (){
    this.init_paramap = new Map({
        AWSAccessKeyId: '0DV3KD29JX8P4T5QX7G2',
        AssociateTag: 'book042-22'
    });
};
Amazon.prototype.item_search = function (category, keywords, page, callback){
    var paramap = new Map({
        ItemPage: page,
        ResponseGroup: 'Small,Images,OfferFull',
        SearchIndex: category,
        Keywords: encodeURIComponent(keywords.trim()),
        _render: 'json',
        _callback: ''
    });
    var params = [];
    params = params.concat(this.init_paramap.join('='));
    params = params.concat(paramap.join('='));

    var jsonp = new JSONP();
    jsonp.callback = callback;
    jsonp.uri = 'http://pipes.yahoo.com/nacookan/awsproxy_itemsearch?' + params.join('&');
    jsonp.load();
};
Amazon.prototype.item_lookup = function (asin, callback){
    var paramap = new Map({
        ItemPage: 1,
        ResponseGroup: 'Large',
        ItemId: encodeURIComponent(asin),
        _render: 'json',
        _callback: ''
    });
    var params = [];
    params = params.concat(this.init_paramap.join('='));
    params = params.concat(paramap.join('='));

    var jsonp = new JSONP();
    jsonp.callback = callback;
    jsonp.uri = 'http://pipes.yahoo.com/nacookan/awsproxy_itemlookup?' + params.join('&');
    jsonp.load();
}
/* ロード時 */
window.onload = function (){
    var search_form = new SearchForm();
    var URLHash = location.hash;
    var URLQuery = getParameter(location.search);
    if (URLQuery["comment"]) {
        Template.comment = URLQuery["comment"];
    } else if ("<@@>".length > 0) {
        Template.comment = "<@@>";
    }
    var searchName = URLQuery["search"];
    if(searchName) {
        search_form.keywords = searchName;
        search_form.category = "Books";
        search_form.go();
        setTimeout(function (){
            $('search_button').onclick();
        }, 1000);
        return;
    }
    if (URLHash) {
        var preSearchHash = location.hash.split("/");
        if (preSearchHash.length > 1) {
            search_form.keywords = preSearchHash[1];
            search_form.category = preSearchHash[0].substring(1);
            search_form.go();
            setTimeout(function (){
                $('search_button').onclick();
            }, 1000);
        }
    } else {
        search_form.keywords = '';
        search_form.category = 'Blended';
        search_form.go();
    }
};

var SearchForm = function (){
};
SearchForm.prototype.go = function (){
    location.href = '#';
    var this_form = this;
    $('content').innerHTML = Template.load('search', {
        keywords: this.keywords
    });
    var options = $('category_list').options;
    for (var i = 0; i < options.length; i++) {
        if (options[i].value == this.category) {
            options[i].selected = 'selected';
        }
    }
    $('search_button').onclick = function (){
        var keywords = this_form.keywords = $('keywords').value;
        var category = this_form.category = $('category_list').value;
        var list_form = new ListForm();
        list_form.category = category;
        list_form.keywords = keywords;
        list_form.from = this_form;
        list_form.go();
    };
}

var ListForm = function (){
}
ListForm.prototype.go = function (){
    location.href = '#' + this.category + '/' + encodeURIComponent(this.keywords);
    var this_form = this;
    $('content').innerHTML = Template.load('list', {
        keywords: this_form.keywords
    });
    var search_links = $N('search_link');
    for (var i = 0; i < search_links.length; i++) {
        search_links[i].onclick = function (){
            this_form.from.go();
        };
    }
    this.load(1);
};
ListForm.prototype.load = function (page){
    var this_form = this;
    var amazon = new Amazon();
    amazon.item_search(this.category, this.keywords, page, function (res){
        var list = res.value.items[0];
        var items_html = [];
        if (!list.Items || !list.Items.Item) {
            var node = document.createElement('table');
            node.innerHTML = Template.load('list_noitem', {});
            var nodes = node.childNodes;
            for (var i = 0; i < nodes.length; i++) {
                $('list').appendChild(nodes[i]);
            }
            return;
        }
        for (var i = 0; i < list.Items.Item.length; i++) {
            var item = list.Items.Item[i];
            var image = (item.SmallImage ? item.SmallImage.URL : '');
            var width = (item.SmallImage ? item.SmallImage.Width.content : 0);
            var height = (item.SmallImage ? item.SmallImage.Height.content : 0);
            var price = "none";
            if (typeof item.OfferSummary !== "undefined") {
                price = (item.OfferSummary.LowestNewPrice ? item.OfferSummary.LowestNewPrice.FormattedPrice : '-');
            }
            items_html.push(Template.load('list_item', {
                image: image,
                width: (width < height ? width * (50 / height) : 50),
                height: (height < width ? height * (50 / width) : 50),
                name: item.ItemAttributes ? item.ItemAttributes.Title : "",
                price: price.replace(/[￥ ]/, ''),
                asin: item.ASIN,
                url: item.DetailPageURL
            }));
        }
        var node = document.createElement('table');
        node.innerHTML = items_html.join('\n');
        var nodes = node.childNodes;
        for (var i = 0; i < nodes.length; i++) {
            $('list').appendChild(nodes[i]);
        }
        var links = $N('list_items');
        for (var i = 0; i < links.length; i++) {
            links[i].onclick = function (){
                location.href = this.id.replace(/http/, "googlechrome");
                //                if (!this.detail_node){
                //                    var tmpl = Template.load('detail', {
                //                        url : this.id
                //                    });
                //                    var node = document.createElement('table');
                //                    node.innerHTML = (tmpl);
                //                    this.detail_node = (function(node){
                //                        if (node.tagName.toLowerCase() == 'tr'){
                //                            return node;
                //                        }else{
                //                            return arguments.callee(node.childNodes[0]);
                //                        }
                //                    })(node.childNodes[0]);
                //                    this.parentNode.insertBefore(this.detail_node, this.nextSibling);
                //                }else{
                //                    this.detail_node.style.display = 'none';
                //                    this.detail_node = null;
                //                }
            };
        }
        if (page < parseInt(list.Items.TotalPages)) {
            $('more').style.display = 'block';
            $('more').onclick = function (){
                this_form.load(page + 1);
            };
        } else {
            $('more').style.display = 'none';
        }
    });
};

function getParameter(str){
    var dec = decodeURIComponent;
    var par = new Array, itm;
    if (typeof(str) == 'undefined') return par;
    if (str.indexOf('?', 0) > -1) str = str.split('?')[1];
    str = str.split('&');
    for (var i = 0; str.length > i; i++) {
        itm = str[i].split("=");
        if (itm[0] != '') {
            par[itm[0]] = typeof(itm[1]) == 'undefined' ? true : dec(itm[1]);
        }
    }
    return par;
}
function setParameter(par){
    var enc = encodeURIComponent;
    var str = '', amp = '';
    if (!par) return '';
    for (var i in par) {
        str = str + amp + i + "=" + enc(par[i]);
        amp = '&'
    }
    return str;
}