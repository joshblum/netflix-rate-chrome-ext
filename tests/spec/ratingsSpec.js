/// <reference path="../../typings/jasmine/jasmine.d.ts"/>

define(['ratings', 'cacheEntryBuilder'], function(ratings, cacheEntryBuilder){
  var now = new Date().getTime();
  var timeSpy;
  
  beforeEach(function() {
    timeSpy = spyOn(window, 'getTime').and.returnValue(now);
  });
  
  describe("isValidCacheEntry", function() {
       
    it("when cache entry has no version should be invalid", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withoutCacheVersion().build();
      
      var isValid = isValidCacheEntry(cacheEntry);
      
      expect(isValid).toBe(false);
    });
    
    it("when cache entry has version that is not matching should not be valid", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withObsoleteCacheVersion().build();
      
      var isValid = isValidCacheEntry(cacheEntry);
      
      expect(isValid).toBe(false);
    });
    
    it("when cache entry has version that is matching and not expired date should be valid", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).build();
      
      var isValid = isValidCacheEntry(cacheEntry);
      
      expect(isValid).toBe(true);
    });
    
    it("when cache entry has version that is matching and oldest valid date should be valid", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withOldestValidDate().build();
      
      var isValid = isValidCacheEntry(cacheEntry);
      
      expect(isValid).toBe(true);
    });
    
    it("when cache entry has version that is matching and future date should be valid", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withFutureDate().build();
      
      var isValid = isValidCacheEntry(cacheEntry);
      
      expect(isValid).toBe(true);
    });
    
    it("when cache entry has expired date should be invalid", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withExpiredDate().build();
      
      var isValid = isValidCacheEntry(cacheEntry);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe("checkCache", function() {
    
    var addToCache = function(cacheEntry) {
      localStorage[cacheEntry.title] = JSON.stringify(cacheEntry);
    };
    
    beforeEach(function() {
      localStorage.clear();
    });
    
    it("when title is not in cache should return null cache", function() {
      var title = "nice title";
      
      var cacheStatus = checkCache(title);
      
      expect(cacheStatus).toEqual({"inCache": false, "cachedVal": null, "hasTrailer": false});
    });
    
    it("when title is in cache should return cache", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).build();
      addToCache(cacheEntry);
      
      var cacheStatus = checkCache(cacheEntry.title);
      
      expect(cacheStatus.cachedVal).toEqual(cacheEntry);
    });
    
    it("when cache entry is invalid should return inCache as false", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withoutCacheVersion().build();
      addToCache(cacheEntry);
      
      var cacheStatus = checkCache(cacheEntry.title);
      
      expect(cacheStatus.inCache).toBe(false);
    });
    
    it("when cache entry is valid should return inCache as true", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).build();
      addToCache(cacheEntry);
      
      var cacheStatus = checkCache(cacheEntry.title);
      
      expect(cacheStatus.inCache).toBe(true);
    });
    
    it("when trailer is undefined should return hasTrailer as false", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).withoutTrailerId().build();
      addToCache(cacheEntry);
      
      var cacheStatus = checkCache(cacheEntry.title);
      
      expect(cacheStatus.hasTrailer).toBe(false);
    });
    
    it("when trailer has a value should return hasTrailer as true", function() {
      var cacheEntry = new cacheEntryBuilder.CacheEntryBuilder(now).build();
      addToCache(cacheEntry);
      
      var cacheStatus = checkCache(cacheEntry.title);
      
      expect(cacheStatus.hasTrailer).toBe(true);
    });
  });
  
  describe("addRatingCache", function() {
    var localStorageSpy;
    
    beforeEach(function() {
      localStorage.clear();
      localStorageSpy = spyOn(localStorage, 'setItem');
    });
       
    it("when called with title only should add entry to cache and return cache entry", function() {
      var media = {
        title: 'nice title'
      };
      
      var cacheEntry = addRatingCache(media.title);
      
      var expectedCacheEntry = {
        title: media.title,
        imdb: null,
        tomatoMeter: null,
        tomatoUserMeter: null,
        imdbID: null,
        metacriticScore: null,
        metacriticUrl: null,
        year: null,
        "type": null,
        date: now,
        cacheVersion: CACHE_VERSION
      };
      
      expect(cacheEntry).toEqual(expectedCacheEntry);
      expect(localStorage.setItem).toHaveBeenCalledWith(media.title, JSON.stringify(cacheEntry));
    });
    
    it("when called with all values should add entry to cache and return cache entry", function() {
     
      var media = {
        title: 'nice title',
        imdb: 'nice imdb',
        tomatoMeter: 'nice tomatoMeter',
        tomatoUserMeter: 'nice tomatoUserMeter',
        imdbID: 'nice imdbID',
        metacriticScore: 'nice metacriticScore',
        metacriticUrl: 'nice metacriticUrl',
        year: 'nice year',
        "type": 'nice type',
      };
      
      var cacheEntry = addRatingCache(media.title, media.imdb, media.tomatoMeter, media.tomatoUserMeter, media.imdbID, media.metacriticScore, media.metacriticUrl, media.year, media.type);
      
      var expectedCacheEntry = $.extend( {}, media,  { date: now, cacheVersion: CACHE_VERSION });
      
      expect(cacheEntry).toEqual(expectedCacheEntry);
      expect(localStorage.setItem).toHaveBeenCalledWith(media.title, JSON.stringify(cacheEntry));
    });
  });
  
});