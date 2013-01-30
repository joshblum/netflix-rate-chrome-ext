// s (NEW!)	 string (optional)	 title of a movie to search for
// i	 string (optional)	 a valid IMDb movie id
// t	 string (optional)	 title of a movie to return
// y	 year (optional)	 year of the movie
// r	 JSON, XML	 response data type (JSON default)
// plot	 short, full	 short or extended plot (short default)
// callback	 name (optional)	 JSONP callback name
// tomatoes	 true (optional)	 adds rotten tomatoes data
var IMDB_API =  "http://www.omdbapi.com/?tomatoes=true&t=";
var HOVER_SEL = '.bobbable .popLink';
var POPUP_INS_SEL = ".midBob";
var POPUP_SEL = ".bobMovieRatings";
var CACHE = {};
var currentRating = {
	'imdb' : null,
	'tomato' : null,
}

function getIMDBAPI(title) {
	return IMDB_API + title
}

function getIMDBHtml(score) {
	var html = $('<div class="imdb imdb-icon star-box-giga-star">');
	if (score === null) {
		html.css('visibility', 'hidden');
	} else {
		html.append(score);
	}
	return html
}

function getTomatoHtml(score) {
	var html = $('<span class="tomato tomato-wrapper">' +
		    	'<span class="tomato-icon med"></span>' +
		        '<span class="tomato-score"></span>' +
        	'<span>');
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

function getTitle(e) {
	var url = $(e.target).context.href;
	var title = url.split('&t=')[1];
	title = decodeURIComponent(title).replace(/\+/g, ' ');
	return title
}

function addCache(title, imdb, tomato) {
	var rating = {
		'imdb' : imdb,
		'tomato' : tomato,
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
			addCache(title, null, null);
			return null
		}
		var IMDBscore = parseFloat(res.imdbRating);
		var tomatoScore = res.tomatoUserMeter === "N/A" ? null : parseInt(res.tomatoUserMeter);
		var rating = addCache(title, IMDBscore, tomatoScore);
		callback(rating);
	})
}

function showRating(rating) {
	var tomato = getTomatoHtml(rating.tomato);
	var imdb = getIMDBHtml(rating.imdb);
	var checkVisible = setInterval(function(){
		var $target = $(POPUP_INS_SEL);
		if($target.length){	
		    clearInterval(checkVisible);
		    	$('.tomato').remove();
			$('.imdb').remove();
			$('.ratingPredictor').remove();
			$target.append(imdb);
			$target.append(tomato);
		}
	}, 700);
}

function addStyle() {
	if (!$('#rating-overlay').length){
		var url = chrome.extension.getURL('../css/ratings.css');
		$("head").append("<link id='rating-overlay' href='" + url + "' type='text/css' rel='stylesheet' />");
	}
}

$(document).ready(function() {
	addStyle();

	$(document).on('mouseenter', HOVER_SEL, function(e){
		var title = getTitle(e)
		getRating(title, function(rating){
			showRating(rating);
		});
	});
});