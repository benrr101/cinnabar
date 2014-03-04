/**
 * Created with JetBrains PhpStorm.
 * User: Ben
 * Date: 2/28/14
 * Time: 11:58 PM
 * To change this template use File | Settings | File Templates.
 */

jQuery.support.cors = true;

var apiKey = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
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

// VIEW MODEL //////////////////////////////////////////////////////////////
function ViewModel() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////
    self.generalError = ko.observable(false);   // Used for storing general error messages that will be visible in a modal

    self.loginLoggedIn = ko.observable(false);  // Used for determining if the login form should be displayed. On launch, we are not logged in.
    self.loginNotice   = ko.observable();       // Used for storing error messages that should be shown to the user.
    self.loginPassword = ko.observable();       // Used for storing the password the user is logging in with.
    self.loginUsername = ko.observable();       // Used for storing the username the user is logging in with.

    self.trackLibrary = {};                     // Used for caching all tracks.
    self.autoPlaylists = {};                    // Used for caching all auto playlists
    self.staticPlaylists = {};                  // Used for caching all static playlists

    self.navAutoPlaylists = ko.observableArray();       // Used for storing the list of auto playlists
    self.navStaticPlaylists = ko.observableArray();     // Used for storing the list of static playlists
    self.trackVisibleTracks = ko.observableArray();     // Used for storing the list of VISIBLE tracks in the tracks pane
    self.visiblePane = ko.observable("tracks");         // Used to mark which tab is visible

    self.playing = ko.observable(false);                        // Whether or not there are tracks playing
    self.playingTrack = ko.observable({Metadata: {}});          // The playing track (the blank obj is to keep null errors at bay)
    self.playingArt = ko.observable();                          // The Href for the currently playing album art
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

            self.loadAutoPlaylists();
            self.loadStaticPlaylists();
            self.loadTrackLibrary(true);
        };
        $.ajax(params);
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
    }

    self.loadStaticPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "playlists/static/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup static playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the auto playlists
            self.navStaticPlaylists(jqXHR);
        }
        $.ajax(params);
    }

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
    }

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
    }

    // NON-AJAX ACTIONS ////////////////////////////////////////////////////
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


}

// Activates knockout.js
ko.applyBindings(new ViewModel());