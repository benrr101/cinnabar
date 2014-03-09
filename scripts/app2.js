/**
 * Created with JetBrains PhpStorm.
 * User: Ben
 * Date: 2/28/14
 * Time: 11:58 PM
 * To change this template use File | Settings | File Templates.
 */

jQuery.support.cors = true;

var apiKey = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
var sessionStorageKey = "CoDUser";
var serverAddress = "https://localhost:8080/";

function getBaseAjaxParams(method, url) {
    var newAjaxParams = {
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        xhrFields: { withCredentials:true },
        type: method,
        url: url
    };
    return newAjaxParams;
}

// UTILITY FUNCTIONS ///////////////////////////////////////////////////////
/**
 * Generates a text string representation of a track number. Formats look like:
 * {dN}.{tN}    if disc number and track number are provided
 * {tN}         if track number only is provided
 * ""           if disc number only or no track number is provided
 * @param trackNumber   int the track number of the track
 * @param discNumber    int the disc number of the track
 * @returns string  String representation of the disc number & track number
 */
function calculateTrackNumber(trackNumber, discNumber) {
    var result = "";
    if(trackNumber) {
        result = String(trackNumber);
        if(discNumber) {
            result = String(discNumber) + "." + result;
        }
    }
    return result;
}

/**
 * Generates a string of hh:mm:ss based on the length of a track in seconds
 * @param time  int The length of the track in seconds
 * @returns string  HH:MM:SS format of the track length
 */
function calculateTrackTime(time) {
    time = parseInt(time);

    // Use a divide and mod method to get hours, minutes, seconds for the track
    var hours = Math.floor(time/3600);
    time %= 3600;
    var minutes = Math.floor(time/60);
    var seconds = time % 60;

    // Format for text
    seconds = seconds < 10 ? "0" + seconds : String(seconds);
    minutes = hours > 0 ? (minutes < 10 ? "0" + minutes : String(minutes)) : minutes;

    // Put it together into a string
    return (hours > 0 ? String(hours) + ":" : "") + minutes + ":" + seconds;
}

/**
 * Shuffle algorithm
 * @source  http://stackoverflow.com/a/10142256
 * @returns Array   A shuffled array
 */
Array.prototype.shuffle = function() {
    var i = this.length, j, temp;
    if ( i == 0 ) return this;
    while ( --i ) {
        j = Math.floor( Math.random() * ( i + 1 ) );
        temp = this[i];
        this[i] = this[j];
        this[j] = temp;
    }
    return this;
}

/**
 * Array movement algorithm
 * @source  http://stackoverflow.com/a/5306832
 * @param old_index int The original index of the element to move
 * @param new_index int The new index of the element to move
 * @returns Array   The original array with the element moved
 */
Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this;
};

// VIEW MODEL //////////////////////////////////////////////////////////////
function ViewModel() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////
    self.generalError = ko.observable(false);   // Used for storing general error messages that will be visible in a modal

    self.loginLoggedIn = ko.observable(false);  // Used for determining if the login form should be displayed. On launch, we are not logged in.
    self.loginNotice   = ko.observable(null);   // Used for storing error messages that should be shown to the user.
    self.loginPassword = ko.observable(null);   // Used for storing the password the user is logging in with.
    self.loginUsername = ko.observable(null);   // Used for storing the username the user is logging in with.

    self.trackLibrary = {};                     // Used for caching all tracks.
    self.autoPlaylists = {};                    // Used for caching all auto playlists
    self.staticPlaylists = {};                  // Used for caching all static playlists

    self.navAutoPlaylists = ko.observableArray();       // Used for storing the list of auto playlists
    self.navStaticPlaylists = ko.observableArray();     // Used for storing the list of static playlists
    self.trackVisibleTracks = ko.observableArray();     // Used for storing the list of VISIBLE tracks in the tracks pane
    self.visiblePane = ko.observable("tracks");         // Used to mark which tab is visible

    self.shuffleEnabled = ko.observable(false);         // Used to show if the shuffled mode is enabled or not
    self.repeatEnabled = ko.observable(false);          // Used to show if the repeat mode is enabled or not

    self.nowPlayingList = [];                           // Storage for the now playing playlist
    self.nowPlayingListSorted = [];                     // Storage for the now playing playlist, but sorted.
    self.nowPlayingIndex = 0;                           // Index into the nowPlayingList of the currently playing track

    self.infoTotalTracks = ko.observable(0);                    // How many tracks are visible
    self.infoTotalTime = ko.observable(0);                      // How long the visible tracks last

    self.playing = ko.observable(false);                        // Whether or not there are tracks playing
    self.playingTrack = ko.observable({Metadata: {}});          // The playing track (the blank obj is to keep null errors at bay)
    self.playingArt = ko.observable(null);                      // The Href for the currently playing album art
    self.playingAudioObject = null;                             // The currently playing audio object
    self.playingProgress = ko.observable(0)                     // The played percentage of the track
    self.playingProgressTime = ko.observable(0)                 // The time played

    // ACTIONS /////////////////////////////////////////////////////////////
    self.loginSubmitLogin = function() {
        var params = getBaseAjaxParams("POST", serverAddress + "users/login");
        params.data  = JSON.stringify({Username: self.loginUsername(), Password: self.loginPassword(), ApiKey: apiKey});
        params.error = function(jqXHR) { // Show an error message
            self.loginNotice(jqXHR.status != 0 && jqXHR.responseJSON ? jqXHR.responseJSON.Message : "Login failed for unknown reason.");
        };
        params.success = function() { // Clear out any error messages, set the user as logged in, and start the library loading process
            self.loginNotice();
            self.loginLoggedIn(true);
            self.loginPassword(false);

            sessionStorage.setItem(sessionStorageKey, self.loginUsername());

            self.loadUserGeneralInfo(self.loginUsername());
        };
        $.ajax(params);
    };

    self.bootRequests = function() {
        self.loadAutoPlaylists();
        self.loadStaticPlaylists();
        self.loadTrackLibrary(true);
    };

    self.loadAutoPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "playlists/auto/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup auto playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the auto playlists
            self.navAutoPlaylists(jqXHR);
        }
        $.ajax(params);
    };

    self.loadStaticPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "playlists/static/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup static playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the auto playlists
            self.navStaticPlaylists(jqXHR);
        }
        $.ajax(params);
    };

    self.loadPlaylist = function(type, playlist) {
        // Set up the parameters in case we need to look it up
        var params = getBaseAjaxParams("GET", serverAddress + playlist.Href);
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup playlist for unknown reason.");
        };

        if(type == "static") {
            // Check for the playlist in the cache
            if(typeof self.staticPlaylists[playlist.Id] !== "undefined") {
                self.showPlaylist("static", self.staticPlaylists[playlist.Id]);
                return;
            } else {
                params.success = function(jqXHR) { // Cache the playlist
                    self.staticPlaylists[jqXHR.Id] = jqXHR;
                    self.showPlaylist("static", jqXHR);
                };
            }
        } else {
            // Check for the playlist in the cache
            if(typeof self.autoPlaylists[playlist.Id] !== "undefined") {
                self.showPlaylist("auto", self.autoPlaylists[playlist.Id]);
                return;
            } else {
                params.success = function(jqXHR) { // Cache the playlist
                    self.autoPlaylists[jqXHR.Id] = jqXHR;
                    self.showPlaylist("auto", jqXHR);
                };
            }
        }
        $.ajax(params);
    };

    self.loadTrackLibrary = function(setVisible) {
        var params = getBaseAjaxParams("GET", serverAddress + "tracks/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup track library for unknown reason.");
        };
        params.success = function(jqXHR) { // Store the tracks in the invisible library
            for(var i = 0; i < jqXHR.length; ++i) {
                self.trackLibrary[jqXHR[i].Id] = jqXHR[i];
                if(setVisible) { self.trackVisibleTracks.push(jqXHR[i]); }
            }
        };
        $.ajax(params);
    };

    self.loadUserGeneralInfo = function(username) {
        var params = getBaseAjaxParams("GET", serverAddress + "users/" + username);
        params.error = function(jqXHR) {
            if(jqXHR.status == 401) {       // Not authorized; not logged in.
                self.loginNotice("Your session expired. Please confirm your credentials.");
                self.loginLoggedIn(false);
            } else if(jqXHR.status == 0) {  // Unknown error. Can't continue.
                self.generalError("An unknown error occurred.");
            } else {
                self.generalError(jqXHR.responseJSON.Message);
            }
        };
        params.success = function(jqXHR) {
            self.infoTotalTracks(jqXHR.Count);
            self.infoTotalTime(calculateTrackTime(jqXHR.TotalTime));
            self.bootRequests();
        }
        $.ajax(params);
    };

    self.fetchAndPlayTrack = function(track) {
        // Fetch the track if we don't have it
        if(self.trackLibrary[track.Id].Qualities === null) {
            var params = getBaseAjaxParams("GET", serverAddress + "tracks/" + track.Id);
            params.error = function(jqXHR) {
                self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup track library for unknown reason.");
            }
            params.success = function(jqXHR) {
                // Store the track in the library cache
                self.trackLibrary[jqXHR.Id] = jqXHR;
                self.playTrack(self.trackLibrary[jqXHR.Id]);
            }
            $.ajax(params);
        } else {
            self.playTrack(self.trackLibrary[track.Id]);
        }
    };

    // NON-AJAX ACTIONS ////////////////////////////////////////////////////
    self.manualPlay = function(track) {
        // Build the now playing list from the existing playlist
        self.nowPlayingList = [];
        for(var i = 0; i < self.trackVisibleTracks().length; ++i) {
            self.nowPlayingList.push(self.trackVisibleTracks()[i]);
            self.nowPlayingListSorted.push(self.trackVisibleTracks()[i]);
        }

        // Do we need to shuffle the playlist?
        if(self.shuffleEnabled()) {
            // Shuffle an re-add the original track to the top of the list
            self.nowPlayingList = self.nowPlayingList.shuffle();
            self.nowPlayingList = self.nowPlayingList.move(self.nowPlayingList.indexOf(track), 0)
            self.nowPlayingIndex = 0;
        } else {
            self.nowPlayingIndex = self.nowPlayingList.indexOf(track);
        }

        // Fetch/play the first track
        self.fetchAndPlayTrack(track);
    }

    self.nextTrack = function() {
        // @TODO: Do queue checking
        // Are we at the end of the now playing
        self.nowPlayingIndex++;
        if(self.nowPlayingIndex >= self.nowPlayingList.length) {
            // At the end of the list, do we repeat?
            if(self.repeatEnabled()) {
                // Loop back to the beginning
                self.nowPlayingIndex = 0;
            } else {
                // Nope. We're done.
                self.playingAudioObject.pause();
                self.playing(false);
                return;
            }
        }

        // Load the next track
        self.fetchAndPlayTrack(self.nowPlayingList[self.nowPlayingIndex]);
    }

    self.previousTrack = function() {
        // Are we past 2% of the track?
        if(self.playingAudioObject.currentTime / self.playingAudioObject.duration * 100 >= 2 ) {
            // Reset the current time to 0
            self.playingAudioObject.currentTime = 0;
        } else {
            // Are we at the beginning of the now playing list
            self.nowPlayingIndex--;
            if(self.nowPlayingIndex < 0) {
                // At the beginning of the now playing list. Do we loop around?
                if(self.repeatEnabled()) {
                    // Loop back to the end of the list
                    self.nowPlayingIndex = self.nowPlayingList.length - 1;
                } else {
                    // Nope we're done.
                    self.playingAudioObject.pause();
                    self.playing(false);
                    return;
                }
            }

            // Load the previous track
            self.fetchAndPlayTrack(self.nowPlayingList[self.nowPlayingIndex]);
        }
    }

    self.playTrack = function(track) {
        //@TODO: Determine what quality to play
        // Create an audio thing if needed
        if(self.playingAudioObject !== null) {
            self.playingAudioObject.src = serverAddress + track.Qualities[0].Href;
        } else {
            self.playingAudioObject = new Audio(serverAddress + track.Qualities[0].Href);
            self.playingAudioObject.ontimeupdate = function(e) {
                var time = e.target.currentTime;
                self.playingProgress(time / e.target.duration * 100);
                self.playingProgressTime(calculateTrackTime(time));
            }
        }

        // Start that shit up!
        self.playing("playing");
        self.playingArt(serverAddress + track.ArtHref);
        self.playingTrack(track);
        self.playingProgressTime(calculateTrackTime(0));
        self.playingProgress(0);
        self.playingAudioObject.play();
    }

    self.showPlaylist = function(type, playlist) {
        // Set the visible pane
        self.visiblePane(type + playlist.Id);

        // Clean out the visible tracks
        self.trackVisibleTracks([]);

        // Iterate over the tracks in the playlist and add them to the visible tracks
        for(var i = 0; i < playlist.Tracks.length; ++i) {
            self.trackVisibleTracks.push(self.trackLibrary[playlist.Tracks[i]]);
        }
    }

    self.showAllTracks = function() {
        // Set the visible pane
        self.visiblePane("tracks");

        self.trackVisibleTracks([]);

        for(var i in self.trackLibrary) {
            self.trackVisibleTracks.push(self.trackLibrary[i]);
        }
    }

    self.togglePlayback = function() {
        // @TODO: If the audio object doesn't exist, grab the beginning of the playlist
        if(self.playingAudioObject.paused) {
            self.playingAudioObject.play();
            self.playing("playing");
        } else {
            self.playingAudioObject.pause();
            self.playing("paused");
        }
    }

    self.toggleShuffle = function() {
        if(self.shuffleEnabled()) {
            // Turn off shuffling
            self.shuffleEnabled(false);

            // Copy the sorted list back into the now playing list
            self.nowPlayingList = [];
            for(var i = 0; i < self.nowPlayingListSorted.length; ++i) {
                self.nowPlayingList.push(self.nowPlayingListSorted[i]);
            }
            self.nowPlayingIndex = self.nowPlayingList.indexOf(self.playingTrack());
        } else {
            // Turn on shuffling
            self.shuffleEnabled(true);
            self.nowPlayingList = self.nowPlayingList.shuffle();
            self.nowPlayingList = self.nowPlayingList.move(self.nowPlayingList.indexOf(self.playingTrack()), 0);
            self.nowPlayingIndex = 0;
        }
    }

    self.toggleRepeat = function() {
        self.repeatEnabled(!self.repeatEnabled());
    }
}

// Activates knockout.js
var vm = { viewModel: new ViewModel() };
ko.applyBindings(vm.viewModel);

// Run some initialization stuff on the app
$(document).ready(function() {
    // See if we have a username stored in the local storage.
    // NOTE: We cannot just check to see if the cookie exists using DOM manipulation. Why? Because the cookie
    // is secure, so it is inaccessible to javascript. We can get around that, though.
    if(sessionStorage.getItem(sessionStorageKey) != null) {
        // User might be logged in. We'll assume they are for now
        // Attempt to load the general user statistics to test the session key
        vm.viewModel.loginLoggedIn(true);
        vm.viewModel.loadUserGeneralInfo(sessionStorage.getItem(sessionStorageKey));
    } else {
        // We have no idea who logged in. We need to show the login form.
        vm.viewModel.loginLoggedIn(false);
    }
});

