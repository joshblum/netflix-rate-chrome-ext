// s (NEW!)	 string (optional)	 title of a movie to search for
// i	 string (optional)	 a valid IMDb movie id
// t	 string (optional)	 title of a movie to return
// y	 year (optional)	 year of the movie
// r	 JSON, XML	 response data type (JSON default)
// plot	 short, full	 short or extended plot (short default)
// callback	 name (optional)	 JSONP callback name
// tomatoes	 true (optional)	 adds rotten tomatoes data
var IMDB_API =  "http://www.omdbapi.com/?tomatoes=true";
var TOMATO_LINK = "http://www.rottentomatoes.com/search/?sitesearch=rt&search=";
var IMDB_LINK = "http://www.imdb.com/title/";
var HOVER_SEL = {
		'.bobbable .popLink' : getWIMainTitle, //wi main display movies
		'.mdpLink' : getSideOrDVDTitle,
	};

var CACHE = {};


/////////// HELPERS /////////////
/*
	Builds a select object where the selector is used to insert the ratings via the given insertFunc
*/
function selectObj(selector, insertFunc, interval, imdbClass, rtClass){
	imdbClass = imdbClass || '';
	rtClass = rtClass || '';
	return {
		'selector' : selector,
		'insertFunc' : insertFunc,
		'interval' : interval,
		'imdbClass' : imdbClass,
		'rtClass' : rtClass,
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


/*
	Get the arguments for showRating based on which popup is being overridden
*/
function getArgs() {
	var url = document.location.href;
	var key = 'dvd.netflix.com';
	if (url.indexOf(key) != -1) { // we are in dvds
		args = POPUP_INS_SEL[key];
		args.key = key;
		return args
	}

	key = 'movies.netflix.com';
	var dict = POPUP_INS_SEL[key];
	for (var key in dict) {
		if (url.indexOf(key) != -1) {
			args = dict[key];
			args.key = key;
			break
		}
	}

	if (args === undefined) {
		args = POPUP_INS_SEL['null']
	}

	return args
}

/*
	Add item to the cache
*/
function addCache(title, imdb, tomato, imdbID, year) {
	year = year || null;
	imdb = imdb || null;
	tomato = tomato || null;
	imdbID = imdbID || null;
	var rating = {
		'title' : title,
		'imdb' : imdb,
		'tomato' : tomato,
		'imdbID' : imdbID,
		'year' : year,
	}

	CACHE[title] = rating;
	return rating
}

/*
	Helper to generalize the parser for side titles and DVD titles
*/
function getWrappedTitle(e, key, regex) {
	var title = $(e.target).attr('alt');
	if (title === undefined) {
		var url = $(e.target).context.href;
		url = url.split('/')
		var title = url[url.indexOf(key) + 1]
		title = title.replace(regex, ' ')
	}
	return title
}

/*
	Clear old ratings and unused content. Differs for different popups
*/
function clearOld(args){
	if (args.key in POPUP_INS_SEL['movies.netflix.com']){
		$('.label').contents().remove();
	}
	$('.rating-link').remove();
	$('.ratingPredictor').remove();
}

///////////////// URL BUILDERS ////////////////
function getIMDBAPI(title, year) {
	var url = IMDB_API + '&t=' + title
	if (year !== null) {
		url += '&y=' + year
	}
	return url
}

function getIMDBLink(title) {
	return IMDB_LINK + title
}

function getTomatoLink(title) {
	return TOMATO_LINK + title
}


///////////////// TITLE PARSERS ////////////////
/*
	parses form: http://movies.netflix.com/WiPlayer?movieid=70171942&trkid=7103274&t=Archer
*/
function getWIMainTitle(e) {
	var $target = $(e.target);
	var url = $target.context.href;
	var title = url.split('&t=')[1];
	if ($target.parents('.recentlyWatched').length) { //recently watched
		title = title.slice(0, title.indexOf('%3A'))
	}
	title = decodeURIComponent(title).replace(/\+/g, ' ');
	return title
}

/*
	Instant Queue and dvd popups use the same selector but different parsers
*/
function getSideOrDVDTitle(e) {
	var url = document.location.href;
	var key = 'dvd.netflix.com';
	if (url.indexOf(key) != -1) { // we are in dvds now
		return getDVDTitle(e)
	} 
	return getSideTitle(e)
}

function getSideTitle(e) {
	var key = "WiMovie";
	var regex = /_/g;
	return getWrappedTitle(e, key,regex)
}

function getDVDTitle(e) {
	var key = "Movie";
	var regex = /-/g;
	return getWrappedTitle(e, key,regex)
}

function parseYear() {
	var $target = $('.year');
	var year = null;
	if ($target.length) {
		year = $target.text().split('-')[0]
	}
	return year
}

/////////// RATING HANDLERS ////////////
function eventHandler(e){
	var title = e.data(e) //title parse funtion
	if ($('.label').contents() != '') { //the popup isn't already up
		getRating(title, null, function(rating){ //null year
			showRating(rating, getArgs());
		});
	}
}

/*
	Search for the title, first in the CACHE and then through the API
*/
function getRating(title, year, callback) {
	if (title in CACHE && CACHE[title].year !== null) {
		callback(CACHE[title]);
		return
	}
	$.get(getIMDBAPI(title, year), function(res){
		res = JSON.parse(res)
		if (res.Response === 'False'){
			addCache(title);
			return null
		}
		var imdbScore = parseFloat(res.imdbRating);
		var tomatoScore = res.tomatoMeter === "N/A" ? null : parseInt(res.tomatoMeter);
		var rating = addCache(title, imdbScore, tomatoScore, res.imdbID, year);
		callback(rating);
	})
}

/*
	Given a rating and specific arguments, dispaly the rating on the page
*/
function showRating(rating, args) {
	var imdb = getIMDBHtml(rating.imdb, rating.imdbID, args.imdbClass);
	var tomato = getTomatoHtml(rating.tomato, rating.title, args.rtClass);
	if (!args.interval) { // unknown popup
		return
	}
	var checkVisible = setInterval(function(){
		var $target = $(args.selector);
		if($target.length){
			updateCache(rating.title); //run the query with the year to update
		    clearInterval(checkVisible);
		    clearOld(args);
			$target[args.insertFunc](imdb);
			$target[args.insertFunc](tomato);
		}
	}, args.interval);
}

function updateCache(title) {
	if (CACHE[title].year === null) {
		var year = parseYear();
		getRating(title, year, function(rating){ //null year
			showRating(rating, getArgs());
		});
	}
}


/////////// HTML BUILDERS ////////////
function getIMDBHtml(score, imdbID, klass) {
	var html = $('<a class="rating-link" target="_blank" href="' + getIMDBLink(imdbID) + '"><div class="imdb imdb-icon star-box-giga-star" title="IMDB Rating"></div></a>');
	if (score === null) {
		html.css('visibility', 'hidden');
	} else {
		html.find('.imdb').addClass(klass).append(score.toFixed(1));
	}
	return html
}

function getTomatoHtml(score, title, klass) {
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
	html.addClass(klass); //add custome class
	return html
}


///////// INIT /////////////
$(document).ready(function() {
	var dvdSelObj = selectObj('.bobMovieRatings', 'append', 800, 'dvd-popup');
	POPUP_INS_SEL = {
		'movies.netflix.com' : {
			'WiHome': selectObj('.midBob', 'append', 700), // main page selector
			'Queue' : selectObj('.info', 'before', 800), // queue page selector
		},
		'dvd.netflix.com' : dvdSelObj, // dvdqueue page selector
		'null' : selectObj('', '', 0),
	};

	addStyle();

	$.each(HOVER_SEL, function(selector, parser){
		$(document).on('mouseenter', selector, parser, eventHandler);
	});
});