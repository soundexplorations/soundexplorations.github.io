// Requires jQuery 
// Adding:
// Strip down lowLag.js so it only supports audioContext (So no IE11 support (only Edge))
// Add "loop" monkey patch needed for looping audio (my primary usage)
// Add single audio channel - to avoid overlapping audio playback
// Original source: https://lowlag.alienbill.com/lowLag.js
var soundLoadCount = 0;
if (!window.console) console = {
	log: function() {}
  };
  
  var lowLag = new function() {
	this.someVariable = undefined;
	this.showNeedInit = function() {
	  lowLag.msg("lowLag: you must call lowLag.init() first!");
	}
	this.load = this.showNeedInit;
	this.play = this.showNeedInit;
	this.pause = this.showNeedInit;
	this.stop = this.showNeedInit;
	this.switch = this.showNeedInit;
	this.change = this.showNeedInit;
	
	this.audioContext = undefined;
	this.audioContextPendingRequest = {};
	this.audioBuffers = {};
	this.audioBufferSources = {};
	this.currentTag = undefined;
	this.currentPlayingTag = undefined;
  
	this.init = function() {
	  this.msg("init audioContext");
	  this.load = this.loadSoundAudioContext;
	  this.play = this.playSoundAudioContext;
	  this.pause = this.pauseSoundAudioContext;
	  this.stop = this.stopSoundAudioContext;
	  this.switch = this.switchSoundAudioContext;
	  this.change = this.changeSoundAudioContext;
  
	  if (!this.audioContext) {
		this.audioContext = new(window.AudioContext || window.webkitAudioContext)();
	  }
	}
  
	//we'll use the tag they hand us, or else the url as the tag if it's a single tag,
	//or the first url 
	this.getTagFromURL = function(url, tag) {
	  if (tag != undefined) return tag;
	  return lowLag.getSingleURL(url);
	}
	this.getSingleURL = function(urls) {
	  if (typeof(urls) == "string") return urls;
	  return urls[0];
	}
	//coerce to be an array
	this.getURLArray = function(urls) {
	  if (typeof(urls) == "string") return [urls];
	  return urls;
	}
  
	this.loadSoundAudioContext = function(urls, tag) {
	  var url = lowLag.getSingleURL(urls);
	  tag = lowLag.getTagFromURL(urls, tag);
	  lowLag.msg('webkit/chrome audio loading ' + url + ' as tag ' + tag);
	  var request = new XMLHttpRequest();
	  request.open('GET', url, true);
	  request.responseType = 'arraybuffer';

  
	  // Decode asynchronously
	  request.onload = function() {
		// if you want "successLoadAudioFile" to only be called one time, you could try just using Promises (the newer return value for decodeAudioData)
		// Ref: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
  
		//Older callback syntax:
		//baseAudioContext.decodeAudioData(ArrayBuffer, successCallback, errorCallback);
		//Newer promise-based syntax:
		//Promise<decodedData> baseAudioContext.decodeAudioData(ArrayBuffer);
  
  
		// ... however you might want to use a pollfil for browsers that support Promises, but does not yet support decodeAudioData returning a Promise.
		// Ref: https://github.com/mohayonao/promise-decode-audio-data
		// Ref: https://caniuse.com/#search=Promise
  
		// var retVal = lowLag.audioContext.decodeAudioData(request.response);
  
		// Note: "successLoadAudioFile" is called twice. Once for legacy syntax (success callback), and once for newer syntax (Promise)
		soundLoadCount++;
		var retVal = lowLag.audioContext.decodeAudioData(request.response, successLoadAudioFile, errorLoadAudioFile);
		//Newer versions of audioContext return a promise, which could throw a DOMException
		if (retVal && typeof retVal.then == 'function') {
		  retVal.then(successLoadAudioFile).catch(function(e) {
			errorLoadAudioFile(e);
			urls.shift(); //remove the first url from the array
			if (urls.length > 0) {
			  lowLag.loadSoundAudioContext(urls, tag); //try the next url
			}
		  });
		}
	  };
  
	  request.send();
  
	  function successLoadAudioFile(buffer) {
		lowLag.audioBuffers[tag] = buffer;
		if (lowLag.audioContextPendingRequest[tag]) { //a request might have come in, try playing it now
		  lowLag.playSoundAudioContext(tag);
		}
	  }
  
	  function errorLoadAudioFile(e) {
		lowLag.msg("Error loading webkit/chrome audio: " + e);
	  }
	}
  
	this.playSoundAudioContext = function(tag) {
	  var context = lowLag.audioContext;
  
	  // if some audio is currently active and hasn't been switched, or you are explicitly asking to play audio that is already active... then see if it needs to be unpaused
	  // ... if you've switch audio, or are explicitly asking to play new audio (that is not the currently active audio) then skip trying to unpause the audio
	  if ((lowLag.currentPlayingTag && lowLag.currentTag && lowLag.currentPlayingTag === lowLag.currentTag) || (tag && lowLag.currentPlayingTag && lowLag.currentPlayingTag === tag)) {
		// find currently paused audio (suspended) and unpause it (resume)
		if (context !== undefined) {
		  // ref: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend
		  if (context.state === 'suspended') {
			context.resume().then(function() {
			  lowLag.msg("playSoundAudioContext resume " + lowLag.currentPlayingTag);
			  return;
			}).catch(function(e) {
			  lowLag.msg("playSoundAudioContext resume error for " + lowLag.currentPlayingTag + ". Error: " + e);
			});
			return;
		  }
		}
	  }
	  
	  if (tag === undefined) {
		tag = lowLag.currentTag;
	  }
  

		lowLag.msg("playSoundAudioContext " + tag);
	  
  
	  var buffer = lowLag.audioBuffers[tag];
	  if (buffer === undefined) { //possibly not loaded; put in a request to play onload
		lowLag.audioContextPendingRequest[tag] = true;
		lowLag.msg("playSoundAudioContext pending request " + tag);
		return;
	  }
  
	  // need to create a new AudioBufferSourceNode every time... 
	  // you can't call start() on an AudioBufferSourceNode more than once. They're one-time-use only.
	  var source;
	  source = context.createBufferSource(); // creates a sound source
	  source.buffer = buffer; // tell the source which sound to play
	  source.connect(context.destination); // connect the source to the context's destination (the speakers)
	  source.loop = false;
	  lowLag.audioBufferSources[tag] = source;
  
	  // find current playing audio and stop it
	  var sourceOld = lowLag.currentPlayingTag ? lowLag.audioBufferSources[lowLag.currentPlayingTag] : undefined;
	  if (sourceOld !== undefined) {
		if (typeof(sourceOld.noteOff) == "function") {
		  sourceOld.noteOff(0);
		} else {
		  //sourceOld.stop();
		}
		lowLag.msg("playSoundAudioContext stopped " + lowLag.currentPlayingTag);
		lowLag.audioBufferSources[lowLag.currentPlayingTag] = undefined;
		lowLag.currentPlayingTag = undefined;
	  }
  
	  // play the new source audio
	  if (typeof(source.noteOn) == "function") {
		source.noteOn(0);
	  } else {
		source.start();
	  }
	  lowLag.currentTag = tag;
	  lowLag.currentPlayingTag = tag;
	  
	  if (context.state === 'running') {
		lowLag.msg("playSoundAudioContext started " + tag);
	  } else if (context.state === 'suspended') {
		/// if the audio context is in a suspended state then unpause (resume)
		context.resume().then(function() {
		  lowLag.msg("playSoundAudioContext started and then resumed " + tag);
		}).catch(function(e) {
		  lowLag.msg("playSoundAudioContext started and then had a resuming error for " + tag + ". Error: " + e);
		});
	  } else if (context.state === 'closed') {
		// ignore request to pause sound - it's already closed
		lowLag.msg("playSoundAudioContext failed to start, context closed for " + tag);
	  } else {
		lowLag.msg("playSoundAudioContext unknown AudioContext.state for " + tag + ". State: " + context.state);
	  }
	}
  
	this.pauseSoundAudioContext = function() {
	  // not passing in a "tag" parameter because we are playing all audio in one channel
	  var tag = lowLag.currentPlayingTag;
	  var context = lowLag.audioContext;
  
	  if (tag === undefined) {
		// ignore request to pause sound as nothing is currently playing
		lowLag.msg("pauseSoundAudioContext nothing to pause");
		return;
	  }
  
	  // find currently playing (running) audio and pause it (suspend)
	  if (context !== undefined) {
		// ref: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/suspend
		if (context.state === 'running') {
			lowLag.msg("pauseSoundAudioContext " + tag);
		  context.suspend().then(function() {
			lowLag.msg("pauseSoundAudioContext suspended " + tag);
		  }).catch(function(e) {
			lowLag.msg("pauseSoundAudioContext suspend error for " + tag + ". Error: " + e);
		  });
		} else if (context.state === 'suspended') {
		  // ignore request to pause sound - it's already suspended
		 // lowLag.msg("pauseSoundAudioContext already suspended " + tag);
		} else if (context.state === 'closed') {
		  // ignore request to pause sound - it's already closed
		  lowLag.msg("pauseSoundAudioContext already closed " + tag);
		} else {
		  lowLag.msg("pauseSoundAudioContext unknown AudioContext.state for " + tag + ". State: " + context.state);
		}
	  }
	}
  
	this.stopSoundAudioContext = function() {
	  // not passing in a "tag" parameter because we are playing all audio in one channel
	  var tag = lowLag.currentPlayingTag;
  
	  if (tag === undefined) {
		// ignore request to stop sound as nothing is currently playing
		lowLag.msg("stopSoundAudioContext nothing to stop");
		return;
	  } else {
		lowLag.msg("stopSoundAudioContext " + tag);
	  }
  
	  // find current playing audio and stop it
	  var source = lowLag.audioBufferSources[tag];
	  if (source !== undefined) {
		if (typeof(source.noteOff) == "function") {
		  source.noteOff(0);
		} else {
		  source.stop();
		}
		lowLag.msg("stopSoundAudioContext stopped " + tag);
		lowLag.audioBufferSources[tag] = undefined;
		lowLag.currentPlayingTag = undefined;
	  }
	}
  
	this.switchSoundAudioContext = function(autoplay) {
	  lowLag.msg("switchSoundAudioContext " + (autoplay ? 'and autoplay' : 'and do not autoplay'));
  
	  if (lowLag.currentTag && lowLag.currentTag == 'audio1') {
		lowLag.currentTag = 'audio2';
	  } else {
		lowLag.currentTag = 'audio1';
	  }
  
	  if (autoplay) {
		lowLag.playSoundAudioContext();
	  }
	}
  
	this.changeSoundAudioContext = function(tag, autoplay) {
	  lowLag.msg("changeSoundAudioContext to tag " + tag + " " + (autoplay ? 'and autoplay' : 'and do not autoplay'));
  
		  if(tag === undefined) {
		  lowLag.msg("changeSoundAudioContext tag is undefined");
		  return;
	  }
	  
	  lowLag.currentTag = tag;
  
	  if (autoplay) {
		lowLag.playSoundAudioContext();
	  }
	}
  
	this.msg = function(m) {
	  m = "-- lowLag " + m;
	  console.log(m);
	}
  }