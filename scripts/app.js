/**
 * ViewModel for the Cinnabar on Dolomite web application
 * Author:  Benjamin Russell (benrr101+dolomite@outlook.com)
 * Start Date: 2/28/14
 */

jQuery.support.cors = true;

var apiKey = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
var usernameStorageKey = "CoDUsername";
var settingsStorageKey = "CoDSettings";
var serverAddress = "https://dolomitetesting.cloudapp.net/";
//var serverAddress = "https://localhost/"
var defaultSettings = {
    quality: "2",
    shuffleMode: "order"
};
var metadataFields = [
    {TagName: "Title", DisplayName: "Title", Type: "string"},
    {TagName: "Artist", DisplayName: "Artist", Type: "string"},
    {TagName: "AlbumArtist", DisplayName: "Album Artist", Type: "string"},
    {TagName: "Composer", DisplayName: "Composer", Type: "string"},
    {TagName: "Album", DisplayName: "Album", Type: "string"},
    {TagName: "Genre", DisplayName: "Genre", Type: "string"},
    {TagName: "Year", DisplayName: "Year", Type: "numeric"},
    {TagName: "Track", DisplayName: "Track", Type: "string"},
    {TagName: "TrackCount", DisplayName: "Track Count", Type: "numeric"},
    {TagName: "Disc", DisplayName: "Disc", Type: "numeric"},
    {TagName: "Lyrics", DisplayName: "Lyrics", Type: "string"},
    {TagName: "BeatsPerMinute", DisplayName: "BPM", Type: "numeric"},
    {TagName: "Conductor", DisplayName: "Conductor", Type: "string"},
    {TagName: "Copyright", DisplayName: "Copyright", Type: "string"},
    {TagName: "Comment", DisplayName: "Copyright", Type: "string"},
    {TagName: "DiscCount", DisplayName: "Disc Count", Type: "numeric"},
    {TagName: "DateAdded", DisplayName: "Date Added", Type: "date"},
    {TagName: "PlayCount", DisplayName: "Play Count", Type: "numeric"},
    {TagName: "LastPlayed", DisplayName: "Last Played", Type: "date"},
    {TagName: "Duration", DisplayName: "Duration", Type: "numeric"},
    {TagName: "TrackListing", DisplayName: "Track Listing", Type: "string"},
    {TagName: "OriginalBitrate", DisplayName: "Original Bitrate", Type: "numeric"},
    {TagName: "OriginalFormat", DisplayName: "Original Format", Type: "string"}
];
var metadataComparisons = {
    string: [
        {Name:"contains", DisplayName:"Contains"},
        {Name:"sequals", DisplayName:"Equals"},
        {Name:"snotequel", DisplayName:"Not Equal To"},
        {Name:"startswith", DisplayName:"Starts With"},
        {Name:"endswith", DisplayName:"Ends With"},
        {Name:"notcontains", DisplayName:"Does Not Contain"}
    ],
    numeric: [
        {Name:"greaterthan", DisplayName:">"},
        {Name:"lessthan", DisplayName:"<"},
        {Name:"greaterthanequal", DisplayName:">="},
        {Name:"lessthanequal", DisplayName:"<="},
        {Name:"equal", DisplayName:"=="},
        {Name:"notequal", DisplayName:"!="}
    ],
    date: [
        {Name:"dequal", DisplayName:"Equals"},
        {Name:"dnotequal", DisplayName:"Not Equal To"},
        {Name:"isafter", DisplayName:"Is After"},
        {Name:"isbefore", DisplayName:"Is Before"},
        {Name:"inlastdays", DisplayName:"In Last n Days"},
        {Name:"notinlastdays", DisplayName:"Not In Last n Days"}
    ]
}


function getBaseAjaxParams(method, url) {
    return {
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        xhrFields: { withCredentials: true },
        type: method,
        url: url
    };
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

function calculateTimeVerbal(time) {
    time = parseInt(time);

    // Use a divide and mod method to get days, hours, minutes, seconds for the track
    var days = Math.floor(time / 86400);
    time %= 86400;
    var hours = Math.floor(time / 3600);
    time %= 3600;
    var minutes = Math.floor(time / 60);
    var seconds = time % 60;

    // Format for text
    days = days > 0 ? days + " days " : "";
    hours = hours > 0 ? hours + " hours ": "";
    minutes = minutes > 0 ? minutes + " minutes " : "";

    return days + hours + minutes + seconds + " seconds";
}

var sortPlaylistsByName = function (left, right) {
    var l = left.Name.toLowerCase(), r = right.Name.toLowerCase();
    return l == r ? 0 : l < r ? -1 : 1;
};

// KO BINDINGS /////////////////////////////////////////////////////////////
ko.bindingHandlers.dragTrack = {
    init: function(element, valueAccessor) {
        var track = valueAccessor().track;
        var viewModel = valueAccessor().vm;
        var $elem = $(element);

        $elem.draggable({
            cursor: "move",
            cursorAt: { top: 20, left: 0},
            start: function() {
                viewModel.dragging = true;
            },
            helper: function(event) {
                // Clear out the selection if we're dragging a track that isn't already selected
                if(viewModel.selectedTracks.indexOf(track) < 0) {
                    viewModel.clearSelection();
                    viewModel.selectTrack(track, event);
                }

                return $("<div class='draggingTrack'>" + viewModel.selectedTracks.length + " Tracks Selected</div>");
            },
            stop: function() {
                viewModel.dragging = false;
            }
        });
    }
}

ko.bindingHandlers.dropTrack = {
    init: function(element, valueAccessor) {
        var playlist = valueAccessor().playlist;
        var viewModel = valueAccessor().vm;
        var $elem = $(element);

        $elem.droppable({
            tolerance: "pointer",
            drop: function() {
                playlist.addTracks(viewModel.selectedTracks);
            }
        });
    }
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

/**
 * String starts with algorithm. I'm too lazy to write this myself, so I found
 * someone who did it for me.
 * @source  http://stackoverflow.com/a/646643
 * @param   str string  The string that we're looking for at the beginning of this string
 * @returns bool    Whether this string starts with the parameter string
 */
if (typeof String.prototype.startsWith != 'function') {
    // see below for better implementation!
    String.prototype.startsWith = function (str){
        return this.indexOf(str) == 0;
    };
}

// VIEW MODEL //////////////////////////////////////////////////////////////
function ViewModel() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////
    self.generalError = ko.observable(false);   // Used for storing general error messages that will be visible in a modal

    self.loginLoggedIn = ko.observable(false);  // Used for determining if the login form should be displayed. On launch, we are not logged in.
    self.loginNotice   = ko.observable(null);   // Used for storing error messages that should be shown to the user.
    self.loginPassword = ko.observable(null);   // Used for storing the password the user is logging in with.
    self.loginUsername = ko.observable(null);   // Used for storing the username the user is logging in with.

    self.settingsVisible = ko.observable(false);    // Whether or not the settings modal is visible
    self.settings = ko.observable(defaultSettings); // The settings object for the session

    self.trackLibrary = {};                     // Used for caching all tracks.
    self.autoPlaylists = ko.observableArray();       // Used for storing the auto playlists
    self.staticPlaylists = ko.observableArray();     // Used for storing the static playlists

    self.trackVisibleTracks = ko.observableArray();     // Used for storing the list of VISIBLE tracks in the tracks pane
    self.visiblePane = ko.observable("tracks");         // Used to mark which tab is visible

    self.shuffleEnabled = ko.observable(false);         // Used to show if the shuffled mode is enabled or not
    self.repeatEnabled = ko.observable(false);          // Used to show if the repeat mode is enabled or not

    self.nowPlayingList = [];                           // Storage for the now playing playlist
    self.nowPlayingListSorted = [];                     // Storage for the now playing playlist, but sorted.
    self.nowPlayingIndex = 0;                           // Index into the nowPlayingList of the currently playing track

    self.infoTotalTracks = ko.observable(0);                    // How many tracks are visible
    self.infoTotalTime = ko.observable(0);                      // How long the visible tracks last

    self.selectedTracks = [];                                   // The list of tracks that are selected. Should be reset when active pane changes
    self.dragging = false;
    self.playing = ko.observable(false);                        // Whether or not there are tracks playing
    self.playingVolume = 1;                                     // The volume to play
    self.playingPane = ko.observable(null);                     // The pane that the current playing track is from
    self.playingTrack = ko.observable({Metadata: {}, Id: 0});   // The playing track (the blank obj is to keep null errors at bay)
    self.playingArt = ko.observable(null);                      // The Href for the currently playing album art
    self.playingAudioObject = null;                             // The currently playing audio object
    self.playingProgress = ko.observable(0);                    // The played percentage of the track
    self.playingProgressTime = ko.observable(0);                // The time played
    self.playingQueue = ko.observableArray();                   // The queue of tracks to be played immediately after the current track
    self.playingScrubberEnabled = true;                         // Whether the scrubber movement is enabled. It will be disabled when dragging is happening.

    self.playlistAddModalVisible = ko.observable(false);        // Whether or not the add playlist modal is visible (false|"auto"|"static")
    self.playlistAddName = ko.observable(null);                 // The name for the new playlist
    self.playlistAddRules = ko.observableArray([new AutoPlaylistRule()]); // A list of rules that will be part of the auto playlist
    self.playlistAddAnyAll = ko.observable("all");              // Whether all or any of the rules are to be met
    self.playlistAddApplyLimit = ko.observable(false);          // Whether or not the autoplaylist will have a limiter
    self.playlistAddLimitCount = ko.observable(10);             // The number of tracks to limit the autoplaylist to
    self.playlistAddLimitField = ko.observable(null);           // The field to sort the autoplaylist by
    self.playlistAddLimitDesc = ko.observable(false);           // Whether or not to sort the autoplaylist descending

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

            sessionStorage.setItem(usernameStorageKey, self.loginUsername());

            self.loadUserGeneralInfo(self.loginUsername());
        };
        $.ajax(params);
    };

    self.bootRequests = function() {
        // Ajax requests
        self.fetchAutoPlaylists();
        self.fetchStaticPlaylists();
        self.loadTrackLibrary(true);

        // Session storage lookups
        if(localStorage.getItem(settingsStorageKey) != null) {
            self.settings(JSON.parse(localStorage.getItem(settingsStorageKey)));
        }
    };

    self.fetchAutoPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "playlists/auto/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup auto playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the auto playlists
            self.autoPlaylists(jqXHR.map(function(item) {
                var pvm = new PlaylistViewModel("auto", self);
                pvm.Id = item.Id;
                pvm.Href = item.Href;
                pvm.Name(item.Name);
                return pvm;
            }));
        }
        $.ajax(params);
    };

    self.fetchStaticPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "playlists/static/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup static playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the static playlists
            // Generate view-models for the playlists and show them in the nav bar
            self.staticPlaylists(jqXHR.map(function(item) {
                var pvm = new PlaylistViewModel("static", self);
                pvm.Id = item.Id;
                pvm.Href = item.Href;
                pvm.Name(item.Name);
                return pvm;
            }));
        }
        $.ajax(params);
    };

    self.loadPlaylist = function(playlist) {
        if(playlist.Loaded) {
            self.showPlaylist(playlist);
        } else {
            playlist.fetch(self.showPlaylist);
        }
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
            self.infoTotalTime(calculateTimeVerbal(jqXHR.TotalTime));
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

    self.submitStaticPlaylist = function() {
        // Close the playlist modal
        self.playlistAddModalVisible(false);

        // Send an ajax request to add the static playlist
        var params = getBaseAjaxParams("POST", serverAddress + "playlists/static/");
        params.data = JSON.stringify({Name: self.playlistAddName()});
        params.error = function(jqXHR) {
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to create playlist for unknown reason.");
        }
        params.success = function(response) {
            // Add the playlist to the list of playlists
            var newPlaylist = {
                Href: "playlists/static/" + response.Guid,
                Name: self.playlistAddName(),
                Id: response.Guid
            };
            self.navStaticPlaylists.push(newPlaylist);

            // Sort it real quick
            self.navStaticPlaylists.sort(sortPlaylistsByName);

            // Clear out the modal stuff
            self.playlistAddName(null);
        };

        $.ajax(params);
    };

    self.submitAutoPlaylist = function() {
        // Build a request
        // TODO: Check that the request is valid
        var newPlaylist = {
            Name: self.playlistAddName(),
            Limit: !self.playlistAddApplyLimit() ?  // Limiter is optional
                null :
                {
                    Limit: self.playlistAddLimitCount(),
                    SortField: self.playlistAddLimitField().TagName,
                    SortDescending: self.playlistAddLimitField() != null ? self.playlistAddLimitDesc() : null   // Descending is optional param
                },
            MatchAll: self.playlistAddAnyAll() == 'all',
            Rules: $.map(self.playlistAddRules(), function(element) {
                return {Field: element.metadataField().TagName, Comparison: element.comparison().Name, Value: element.value() }
            })
        };

        // Send the request
        var params = getBaseAjaxParams("POST", serverAddress + "playlists/auto/");
        params.data = JSON.stringify(newPlaylist);
        params.error = function(jqXHR) {
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to create playlist for unknown reason.");
        }
        params.success = function(response) {
            // Add the playlist to the list of playlists
            var playlist = {
                Href: "playlists/auto/" + response.Guid,
                Name: self.playlistAddName(),
                Id: response.Guid
            };
            self.navAutoPlaylists.push(playlist);

            // Sort the list real quick
            self.navAutoPlaylists.sort(sortPlaylistsByName);

            // Clear out the form and select the playlist
            self.visiblePane("tracks");
            self.loadPlaylist("auto", playlist);
        };

        $.ajax(params);
    };

    // NON-AJAX ACTIONS ////////////////////////////////////////////////////
    self.manualPlay = function(fromQueue, track) {
        // Build the now playing list from the existing playlist
        self.nowPlayingList = [];
        for(var i = 0; i < self.trackVisibleTracks().length; ++i) {
            self.nowPlayingList.push(self.trackVisibleTracks()[i]);
            self.nowPlayingListSorted.push(self.trackVisibleTracks()[i]);
        }

        // Do we need to shuffle the playlist?
        fromQueue = typeof fromQueue !== 'undefined' ? fromQueue : false;
        if(fromQueue) {
            if(self.shuffleEnabled() && self.settings.shuffleMode == 'order') {
                // Shuffle the track list
                self.nowPlayingList = self.nowPlayingList.shuffle();
                self.nowPlayingIndex = -1;
            } else {
                // Set the current track index to -1 to start at beginning of list when track finishes
                self.nowPlayingIndex = -1;
            }
        } else {
            if(self.shuffleEnabled() && self.settings.shuffleMode == 'order') {
                // Shuffle an re-add the original track to the top of the list
                self.nowPlayingList = self.nowPlayingList.shuffle();
                self.nowPlayingList = self.nowPlayingList.move(self.nowPlayingList.indexOf(track), 0)
                self.nowPlayingIndex = 0;
            } else {
                self.nowPlayingIndex = self.nowPlayingList.indexOf(track);
            }
        }

        // Set the playing pane
        self.playingPane(self.visiblePane());

        // Fetch/play the first track
        self.fetchAndPlayTrack(track);
    }

    self.startPlayback = function() {
        // If there are track enqueued, play the one at the top
        if(self.playingQueue().length > 0) {
            self.manualPlay(true, self.playingQueue.shift());
            return;
        }

        // Play from the start of the list, or pick a random track if shuffle is enabled
        if(self.shuffleEnabled()) {
            // Grab a random track and manually play it
            var randomIndex = Math.floor(Math.random() * (self.trackVisibleTracks().length-1));
            self.manualPlay(false, self.trackVisibleTracks()[randomIndex]);
        } else {
            self.manualPlay(false, self.trackVisibleTracks()[0]);
        }
    }

    self.nextTrack = function() {
        // If there's a track in the queue that needs to be played, play it nao!
        if(self.playingQueue().length > 0) {
            self.fetchAndPlayTrack(self.playingQueue.shift());

            // Remove the track from the top of the queue if the queue is visible
            if(self.visiblePane() == 'queue') {
                self.trackVisibleTracks.shift();
            }
            return;
        }

        // If we're on random shuffle, just pick another track and keep going
        if(self.shuffleEnabled() && self.settings().shuffleMode == 'random') {
            self.nowPlayingIndex = Math.floor(Math.random() * (self.nowPlayingList.length-1));
        } else {
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
                    self.playingTrack({Metadata:{}});
                    return;
                }
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
        // Which audio quality should be played? Count down from the top to get the highest quality that doesn't exceed the preferences
        var trackQuality;
        for(var q = self.settings().quality; q >= 0; --q) {
            if(typeof track.Qualities[q] !== "undefined") {
                trackQuality = track.Qualities[q];
                break;
            }
        }

        // Create an audio thing if needed
        if(self.playingAudioObject !== null) {
            self.playingAudioObject.src = serverAddress + trackQuality.Href;
        } else {
            self.playingAudioObject = new Audio(serverAddress + trackQuality.Href);
            self.playingAudioObject.volume = self.playingVolume;
            self.playingAudioObject.ontimeupdate = function(e) {
                // Update the numeric time
                var time = e.target.currentTime;
                self.playingProgressTime(calculateTrackTime(time));

                // Update the scrubber percentage
                if(self.playingScrubberEnabled) {
                    var percent = time / e.target.duration * 100;
                    self.playingProgress(percent);
                    if(percent >= 90) { // If we're almost at the end, change the scrubber handle to prevent it from jumping to the next line
                        $("#playedHandle").addClass("end");
                    }
                }
            }
            self.playingAudioObject.onended = function(e) {
                // Jump to the next track
                self.nextTrack();
            }
        }

        // Start that shit up!
        $("#playedHandle").removeClass("end");
        self.playing("playing");
        self.playingArt(serverAddress + track.ArtHref);
        self.playingTrack(track);
        self.playingProgressTime(calculateTrackTime(0));
        self.playingProgress(0);
        self.playingAudioObject.play();
    }

    self.enqueueTrack = function(track) {
        self.playingQueue.push(track);
    };

    self.dequeueTrack = function(track) {
        self.trackVisibleTracks.remove(track);
        self.playingQueue.remove(track);
    };

    self.showPlaylist = function(playlist) {
        // Set the visible pane
        self.visiblePane(playlist.Type + playlist.Id);

        // Clean out the visible tracks and add the playlist's tracks
        self.trackVisibleTracks($.map(playlist.Tracks(), function(e) {
            return self.trackLibrary[e]
        }));

        // Clear out the selected tracks
        self.clearSelection();
    };

    self.showQueue = function() {
        // Set the visible pane
        self.visiblePane("queue");

        // Clear out the current visible tracks and make the queue visible
        self.trackVisibleTracks($.map(self.playingQueue(), function(e) {
            return self.trackLibrary[e.Id]
        }));
    };

    self.showAllTracks = function() {
        // Set the visible pane
        self.visiblePane("tracks");

        var keys = [];
        for(var i in self.trackLibrary) {
            if(typeof self.trackLibrary[i].Id !== 'undefined') {
                keys.push(self.trackLibrary[i].Id);
            }
        }

        self.trackVisibleTracks($.map(keys, function(e) {
            return self.trackLibrary[e];
        }));
    };

    self.togglePlayback = function() {
        if(self.playing() === false) {
            self.startPlayback();
        } else {
            if(self.playingAudioObject.paused) {
                self.playingAudioObject.play();
                self.playing("playing");
            } else {
                self.playingAudioObject.pause();
                self.playing("paused");
            }
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

    self.scrubberClick = function(vmodel, event) {
        // Get x offset of the click
        var x = event.pageX - $(event.target).offset().left;
        var $scrubber = $(event.target).attr('id') == 'scrubber' ? $(event.target) : $(event.target).parent();

        // Calculate and set the new time for the audio playback
        var trackDuration = vm.viewModel.playingAudioObject.duration;
        var length = parseInt($scrubber.css("width").replace("px", ""));
        var newTime = trackDuration * x / length;
        vm.viewModel.playingAudioObject.currentTime = newTime;
    }

    self.trackHover = function(action, model, event) {
        // If we're dragging, don't do ANYTHING!
        if(self.dragging) { return; }

        // Make the hover indicator visible or invisible. The while loop advances up the tree until hits the top of the
        // or the hovered row is found
        var $target = $(event.target);
        while($target.prop("tagName").toLowerCase() != "tr" || $target.length == 0) {
            $target = $target.parent();
        }

        // Only show the hover indicator if the playing indicator isn't playing
        var $playingIndicator = $target.find(".playIndicatorPlaying:visible");
        var $hoverIndicator = $target.find(".playIndicatorHover");
        if($playingIndicator.length == 0) {
            $hoverIndicator.css("display", action == 'start' ? "inline" : "");
        }
    };

    self.showSettings = function() {
        self.settingsVisible(true);
    }

    self.saveSettings = function() {
        // Hide the settings box
        self.settingsVisible(false);

        localStorage.setItem(settingsStorageKey, JSON.stringify(self.settings()));
        // @TODO: Write these to the server
    }

    self.showAddStaticPlaylist = function() {
        self.playlistAddModalVisible('static');
    };

    self.showAddAutoPlaylist = function() {
        self.visiblePane("addAutoPlaylist");
    }

    self.cancelAutoPlaylist = function() {
        // Clear out the values
        self.playlistAddName(null);
        self.playlistAddRules([new AutoPlaylistRule()]);
        self.playlistAddAnyAll("all");
        self.playlistAddApplyLimit(false);
        self.playlistAddLimitField(null);
        self.playlistAddLimitCount(10);
        self.playlistAddLimitDesc(false);

        // Reset the view
        self.visiblePane("tracks");
    }

    self.autoPlaylistAddRule = function() {
        // Create a blank rule and add it to the list
        self.playlistAddRules.push(new AutoPlaylistRule());
    }

    self.autoPlaylistRemoveRule = function(rule) {
        // Drop it like its hot
        self.playlistAddRules.remove(rule);
    }

    self.selectTrack = function(track, event) {
        if(event.ctrlKey || event.metaKey) {
            // Add the track if it hasn't already been added
            if(self.selectedTracks.indexOf(track) < 0) {
                self.selectedTracks.push(track);
                $("#row" + track.Id).addClass("selected");
            }
        } else if(event.shiftKey && self.selectedTracks.length > 0) {
            // Reset the selected list with the range of tracks from the first selected track to the clicked track
            var firstIndex = self.trackVisibleTracks.indexOf(self.selectedTracks[0]);
            var lastIndex  = self.trackVisibleTracks.indexOf(track);
            var selectedSubset;
            if(lastIndex > firstIndex) {
                selectedSubset = self.trackVisibleTracks.slice(firstIndex, lastIndex + 1);
            } else {
                selectedSubset = self.trackVisibleTracks.slice(lastIndex, firstIndex + 1);
            }
            self.clearSelection();
            ko.utils.arrayForEach(selectedSubset, function(item) {
                $("#row" + item.Id).addClass("selected");
                self.selectedTracks.push(item);
            });
        } else {
            // Reset the selected list with clicked track
            self.selectedTracks = [track];
            $("tr.selected").removeClass("selected");
            $("#row" + track.Id).addClass("selected");
        }
    };

    self.clearSelection = function() {
        $("tr.selected").removeClass("selected");
        self.selectedTracks = [];
    };
}

function AutoPlaylistRule() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////

    self.metadataField = ko.observable();
    self.value = ko.observable();
    self.comparison = ko.observable();
    self.comparisonOptions = ko.observableArray();

    // ACTIONS /////////////////////////////////////////////////////////////
    self.metadataField.subscribe(function() {
        self.comparisonOptions = ko.observableArray(metadataComparisons[self.metadataField().Type]);
        self.comparison(null);
    })
}

// Activates knockout.js
var vm = { viewModel: new ViewModel() };
ko.applyBindings(vm.viewModel);

// Run some initialization stuff on the app
$(document).ready(function() {
    // See if we have a username stored in the local storage.
    // NOTE: We cannot just check to see if the cookie exists using DOM manipulation. Why? Because the cookie
    // is secure, so it is inaccessible to javascript. We can get around that, though.
    if(sessionStorage.getItem(usernameStorageKey) != null) {
        // User might be logged in. We'll assume they are for now
        // Attempt to load the general user statistics to test the session key
        vm.viewModel.loginLoggedIn(true);
        vm.viewModel.loadUserGeneralInfo(sessionStorage.getItem(usernameStorageKey));
    } else {
        // We have no idea who logged in. We need to show the login form.
        vm.viewModel.loginLoggedIn(false);
    }

    // Make the scrubber draggable
    $("#playedHandle").draggable({
        axis: "x",
        containment: "parent",
        start: function() {
            // Disable the scrubber updating
            vm.viewModel.playingScrubberEnabled = false;
        },
        stop: function(event, ui) {
            // Calculate the offset into the track to set
            var trackDuration = vm.viewModel.playingAudioObject.duration;
            var length = parseInt($("#scrubber").css("width").replace("px",""));
            var newTime = trackDuration * (parseInt($("#played").css("width").replace("px","")) + ui.position.left) / length;

            // Set the current time on the audio object
            vm.viewModel.playingAudioObject.currentTime = newTime;

            // Start the scrubber up again
            vm.viewModel.playingScrubberEnabled = true;

            // Move the handle back to where it belongs
            $("#playedHandle").css("top", "").css("left", "");
        }
    });

    // Make the volume handle draggable
    $("#volumeHandle").draggable({
        axis: "y",
        containment: "parent",
        start: function(event, ui) {
            $(this).parent().parent().addClass("locked");
        },
        drag: function(event, ui) {
            // Calculate the volume
            var height = parseInt($("#volumeSlider").css("height").replace("px", ""));
            var newVol = (height - ui.position.top) / height;
            //newVol = newVol * 100 < 1 ? newVol = 0 : newVol;

            // If there's a playing audio thingy, change the volume
            if(vm.viewModel.playingAudioObject != null) {
                vm.viewModel.playingAudioObject.volume = newVol;
            }

            // Set the volume in the state anyhow if it's not playing
            vm.viewModel.playingVolume = newVol;
        },
        stop: function(){
            $(this).parent().parent().removeClass("locked");
        }
    });
});

