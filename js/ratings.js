// s (NEW!)	 string (optional)	 title of a movie to search for
// i	 string (optional)	 a valid IMDb movie id
// t	 string (optional)	 title of a movie to return
// y	 year (optional)	 year of the movie
// r	 JSON, XML	 response data type (JSON default)
// plot	 short, full	 short or extended plot (short default)
// callback	 name (optional)	 JSONP callback name
// tomatoes	 true (optional)	 adds rotten tomatoes data
var IMDB_API =  "http://www.omdbapi.com/?tomatoes=true&t=";
var TOMATO_LINK = "http://www.rottentomatoes.com/search/?sitesearch=rt&search=";
var IMDB_LINK = "http://www.imdb.com/title/";
var HOVER_SEL = {
		'.bobbable .popLink' : getMainTitle, //main display movies
		'.mdpLink' : getSideTitle, //small side movies
	};

var CACHE = {};

function selectObj(selector, insertFunc, interval){
	return {
		'selector' : selector,
		'insertFunc' : insertFunc,
		'interval' : interval,
		}
}

/*
	Add the style sheet to the main netflix page.
*/
function addStyle() {
	if (!$('#rating-overlay').length){
		var url = chrome.extension.getURL('../css/ratings.css');
		$("head").append("<link id='rating-overlay' href='" + url + "' type='text/css' rel='stylesheet' />");
	}
}

function getIMDBAPI(title) {
	return IMDB_API + title
}

function getIMDBLink(title) {
	return IMDB_LINK + title
}

function getTomatoLink(title) {
	return TOMATO_LINK + title
}

/*
	parses form: http://movies.netflix.com/WiPlayer?movieid=70171942&trkid=7103274&t=Archer
*/
function getMainTitle(e) {
	var url = $(e.target).context.href;
	var title = url.split('&t=')[1];
	title = decodeURIComponent(title).replace(/\+/g, ' ');
	return title
}

function getMainTitle(e) {
	var $target = $(e.target);
	var url = $target.context.href;
	var title = url.split('&t=')[1];
	if ($target.parents('.recentlyWatched').length) { //recently watched
		title = title.slice(0, title.indexOf('%3A'))
	}
	title = decodeURIComponent(title).replace(/\+/g, ' ');
	return title
}

function getSideTitle(e) {
	var title = $(e.target).attr('alt');
	if (title === undefined) {
		var url = $(e.target).context.href;
		url = url.split('/')
		var title = url[url.indexOf('WiMovie') + 1]
		title = title.replace(/_/g, ' ')
	}
	return title
}

function eventHandler(e){
	var title = e.data(e) //title parse funtion
	if ($('.label').contents() != '') { //the popup isn't already up
		getRating(title, function(rating){
			var url = document.location.href;
			var args = POPUP_INS_SEL.WiHome;

			if (url.indexOf('Queue') != -1) {
				args = POPUP_INS_SEL.Queue;
			}
			showRating(rating, args);
		});
	}
}

function addCache(title, imdb, tomato, id) {
	var rating = {
		'imdb' : imdb,
		'tomato' : tomato,
		'imdbID' : id,
		'title' : title,
	}

	CACHE[title] = rating;
	return rating
}

function getRating(title, callback) {
	if (title in CACHE) {
		callback(CACHE[title]);
		return
	}
	$.get(getIMDBAPI(title), function(res){
		res = JSON.parse(res)
		if (res.Response === 'False'){
			addCache(title, null, null, null);
			return null
		}
		var imdbScore = parseFloat(res.imdbRating);
		var tomatoScore = res.tomatoMeter === "N/A" ? null : parseInt(res.tomatoMeter);
		var rating = addCache(title, imdbScore, tomatoScore, res.imdbID);
		callback(rating);
	})
}

function showRating(rating, args) {
	var tomato = getTomatoHtml(rating.tomato, rating.title);
	var imdb = getIMDBHtml(rating.imdb, rating.imdbID);
	var checkVisible = setInterval(function(){
		var $target = $(args.selector);
		if($target.length){
		    clearInterval(checkVisible);
		    $('.rating-link').remove();
			$('.ratingPredictor').remove();
			$('.label').contents().remove();
			$target[args.insertFunc](imdb);
			$target[args.insertFunc](tomato);
		}
	}, args.interval);
}

function getIMDBHtml(score, imdbID) {
	var html = $('<a class="rating-link" target="_blank" href="' + getIMDBLink(imdbID) + '"><div class="imdb imdb-icon star-box-giga-star" title="IMDB Rating"></div></a>');
	if (score === null) {
		html.css('visibility', 'hidden');
	} else {
		html.find('.imdb').append(score.toFixed(1));
	}

	return html
}

function getTomatoHtml(score, title) {
	var html = $('<a class="rating-link" target="_blank" href="' + getTomatoLink(title) + '"><span class="tomato tomato-wrapper" title="Rotten Tomato Rating"><span class="tomato-icon med"></span><span class="tomato-score"></span></span></a>');
	if (score === null) {
		html.css('visibility', 'hidden');
		return html
	}
	var klass;
	if (score < 59) {
		klass = 'rotten';
	} else {
		klass = 'fresh';
	}
	html.find('.tomato-icon').addClass(klass);
	html.find('.tomato-score').append(score + '%');
	return html
}

$(document).ready(function() {
	POPUP_INS_SEL = {
		'WiHome': selectObj('.midBob', 'append', 700), // main page selector
		'Queue' : selectObj('.info', 'before', 800), // queue page selector
	};

	addStyle();
	$.each(HOVER_SEL, function(selector, parser){
		$(document).on('mouseenter', selector, parser, eventHandler);
	});
});