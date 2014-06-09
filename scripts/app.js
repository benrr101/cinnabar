/**
 * ViewModel for the Cinnabar on Dolomite web application
 * Author:  Benjamin Russell (benrr101+dolomite@outlook.com)
 * Start Date: 2/28/14
 */

jQuery.support.cors = true;

var apiKey = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
var usernameStorageKey = "CoDUsername";
var settingsStorageKey = "CoDSettings";
var serverAddress = "https://dolomitetesting.cloudapp.net";
//var serverAddress = "https://localhost"
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
};


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

// KO BINDINGS /////////////////////////////////////////////////////////////
ko.bindingHandlers.dragTrack = {
    init: function(element, valueAccessor) {
        var index = valueAccessor().index;
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
                if(viewModel.selectedTracks.indexOf(index) < 0) {
                    viewModel.clearSelection();
                    viewModel.selectTrack(index, event);
                }

                return $("<div class='draggingTrack'>" + viewModel.selectedTracks().length + " Tracks Selected</div>");
            },
            stop: function() {
                viewModel.dragging = false;
            }
        });
    }
};

ko.bindingHandlers.dropTrack = {
    init: function(element, valueAccessor) {
        var playlist = valueAccessor().playlist;
        var viewModel = valueAccessor().vm;
        var $elem = $(element);

        $elem.droppable({
            tolerance: "pointer",
            drop: function() {
                // Convert the selected indices list to a list of tracks
                var selectedTracks = [];
                for(var i = 0; i < viewModel.selectedTracks().length; ++i) {
                    var trackIndex = viewModel.selectedTracks()[i];
                    selectedTracks.push(viewModel.trackVisibleTracks()[trackIndex]);
                }

                playlist.addTracks(selectedTracks, viewModel.generalError);
            }
        });
    }
};

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
};

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

    self.trackLibrary = {};                          // Used for caching all tracks.
    self.autoPlaylists = ko.observableArray();       // Used for storing the auto playlists
    self.staticPlaylists = ko.observableArray();     // Used for storing the static playlists

    self.staticPlaylistEdit = ko.observable(null);  // The static playlist that's on the editing table
    self.autoPlaylistEdit = ko.observable(null);    // The auto playlist that's on the editing table

    self.trackVisibleTracks = ko.observableArray();     // Used for storing the list of VISIBLE tracks in the tracks pane
    self.visiblePlaylist = null;                        // The visible playlist
    self.visiblePane = ko.observable("tracks");         // Used to mark which tab is visible

    self.visibleContextMenu = ko.observable(false);         // Which context menu is visible
    self.visibleContextMenuTop = ko.observable(0);          // The top position of the context menu
    self.visibleContextMenuXPos = ko.observable(false);     // The x position of the menu. This is calculated in the data-bind based on the float
    self.visibleContextMenuFloat = ko.observable("left");   // Whether the menu position should float to the left or right

    self.nowPlayingList = [];                           // Storage for the now playing playlist
    self.nowPlayingListSorted = [];                     // Storage for the now playing playlist, but sorted.
    self.nowPlayingIndex = 0;                           // Index into the nowPlayingList of the currently playing track

    self.infoTotalTracks = ko.observable(0);                    // How many tracks are visible
    self.infoTotalTime = ko.observable(0);                      // How long the visible tracks last

    self.selectedTracks = ko.observableArray([]);       // The list of tracks that are selected. Should be reset when active pane changes
    self.dragging = false;

    self.playback = ko.observable(new PlaybackViewModel());

    self.playingPane = ko.observable(null);                     // The pane that the current playing track is from

    // ACTIONS /////////////////////////////////////////////////////////////
    self.loginSubmitLogin = function() {
        var params = getBaseAjaxParams("POST", serverAddress + "/users/login");
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
        self.fetchTracks();

        // Session storage lookups
        if(localStorage.getItem(settingsStorageKey) != null) {
            self.settings(JSON.parse(localStorage.getItem(settingsStorageKey)));
        }
    };

    self.fetchAutoPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "/playlists/auto/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup auto playlists for unknown reason.");
        };
        params.success = function(jqXHR) { // Store the auto playlists
            self.autoPlaylists(jqXHR.map(function(item) {
                var pvm = new PlaylistViewModel("auto");
                pvm.Id = item.Id;
                pvm.Href = item.Href;
                pvm.Name(item.Name);
                return pvm;
            }));
        };
        $.ajax(params);
    };

    self.fetchStaticPlaylists = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "/playlists/static/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup static playlists for unknown reason.");
        };
        params.success = function(jqXHR) { // Store the static playlists
            // Generate view-models for the playlists and show them in the nav bar
            self.staticPlaylists(jqXHR.map(function(item) {
                var pvm = new PlaylistViewModel("static");
                pvm.Id = item.Id;
                pvm.Href = item.Href;
                pvm.Name(item.Name);
                return pvm;
            }));
        };
        $.ajax(params);
    };

    self.loadPlaylist = function(playlist) {
        if(playlist.Loaded) {
            self.showPlaylist(playlist);
        } else {
            playlist.fetch(self.showPlaylist, self.generalError);
        }
    };

    self.fetchTracks = function() {
        var params = getBaseAjaxParams("GET", serverAddress + "/tracks/");
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup track library for unknown reason.");
        };
        params.success = function(jqXHR) { // Store the tracks in the invisible library]
            self.trackVisibleTracks(jqXHR.map(function(item) {
                // Create new track view model
                var newTrack = new TrackViewModel();
                newTrack.Id = item.Id;
                newTrack.Metadata = ko.observableDictionary(item.Metadata);

                // Store in the track library
                self.trackLibrary[item.Id] = newTrack;

                return newTrack;
            }));
        };
        $.ajax(params);
    };

    self.loadUserGeneralInfo = function(username) {
        var params = getBaseAjaxParams("GET", serverAddress + "/users/" + username);
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
        };
        $.ajax(params);
    };

    // NON-AJAX ACTIONS ////////////////////////////////////////////////////
    self.enqueueTracks = function() {
        // Pass the tracks to be enqueued to the playback view model
        $.each(self.selectedTracks(), function() {
            self.playback().enqueueTrack(self.trackVisibleTracks()[this]);
        });
    };

    self.dequeueTracks = function() {
        // Remove all selected track from the visible queue, then pass the call to the playback vm
        $.each(self.selectedTracks(), function() {
            self.trackVisibleTracks.splice(this, 1);
            self.playback().dequeueTrack(this);
        });
    };

    self.addTracksToPlaylist = function(playlist) {
        // Convert the selected indices list to a list of tracks
        var selectedTracks = [];
        for(var i = 0; i < self.selectedTracks().length; ++i) {
            var trackIndex = self.selectedTracks()[i];
            selectedTracks.push(self.trackVisibleTracks()[trackIndex]);
        }

        playlist.addTracks(selectedTracks, self.generalError);
    };

    self.removeTracksFromPlaylist = function() {
        // Remove the tracks from the visible list
        $.each(self.selectedTracks(), function() {
            self.trackVisibleTracks.splice(this, 1);
        });

        // Pass the selection of indices to the playlist viewmodel
        self.visiblePlaylist.removeTracks(self.selectedTracks(), self.generalError);

        // Clear out the selection
        self.clearSelection();
    };

    self.showPlaylist = function(playlist) {
        // Set the visible pane
        self.visiblePane(playlist.Type + playlist.Id);
        self.visiblePlaylist = playlist;

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
        self.visiblePlaylist = null;

        // Clear out the current visible tracks and make the queue visible
        self.trackVisibleTracks(self.playback().queue());

        // Clear the selection
        self.clearSelection();
    };

    self.showAllTracks = function() {
        // Set the visible pane
        self.visiblePane("tracks");
        self.visiblePlaylist = null;

        var keys = [];
        for(var i in self.trackLibrary) {
            if(typeof self.trackLibrary[i].Id !== 'undefined') {
                keys.push(self.trackLibrary[i].Id);
            }
        }

        self.trackVisibleTracks($.map(keys, function(e) {
            return self.trackLibrary[e];
        }));

        self.clearSelection();
    };

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
    };

    self.saveSettings = function() {
        // Hide the settings box
        self.settingsVisible(false);

        localStorage.setItem(settingsStorageKey, JSON.stringify(self.settings()));
        // @TODO: Write these to the server
    };

    self.addStaticPlaylist = function() {
        var playlist = new PlaylistViewModel("static");
        playlist.Created = false;
        self.staticPlaylistEdit(playlist);
    };

    self.showAddAutoPlaylist = function() {
        // Create a blank playlist and set some defaults
        var newPlaylist = new PlaylistViewModel("auto");
        newPlaylist.Created = false;
        newPlaylist.MatchAll(true);
        newPlaylist.LimitCount(10);
        newPlaylist.LimitDesc(false);
        newPlaylist.Rules([new AutoPlaylistRule()]);

        // Show the form
        self.autoPlaylistEdit(newPlaylist);
        self.visiblePane("addAutoPlaylist");
    };

    self.cancelAutoPlaylist = function() {
        // Clear out the new autoplaylist
        self.autoPlaylistEdit(null);

        // Reset the view
        self.visiblePane("tracks");
    };

    self.selectTrack = function(index, event) {
        if(event.ctrlKey || event.metaKey) {
            // Add the track if it hasn't already been added
            if(self.selectedTracks.indexOf(index) < 0) {
                self.selectedTracks.push(index);
            }
        } else if(event.shiftKey && self.selectedTracks().length > 0) {
            // Find the range of indices from the first selected track to the clicked track
            var firstIndex = self.selectedTracks()[0];
            var lastIndex  = index;
            if(firstIndex > lastIndex) {
                // Swap them, they're backwards
                var temp = firstIndex;
                firstIndex = lastIndex;
                lastIndex = temp;
            }

            // Reset the list
            self.clearSelection();

            // Generate the range of selected indices
            for(var i = firstIndex; i <= lastIndex; i++) {
                self.selectedTracks.push(i);
            }
        } else {
            // Reset the selected list with clicked track
            self.clearSelection();
            self.selectedTracks.push(index);
        }
    };

    self.clearSelection = function() {
        self.selectedTracks.removeAll();
    };

    self.createPlaylistSuccess = function(playlist) {
        // Add the playlist to the proper list and sort it
        var playlistList = playlist.Type == "static" ? self.staticPlaylists : self.autoPlaylists;
        playlistList.push(playlist);
        playlistList.sort(PlaylistViewModel.sortByName);

        // Clear out the playlist for edit
        self.staticPlaylistEdit(null);
    };

    self.showTrackContextMenu = function(index, event) {
        // Select the right-clicked track, but only do so if the track that
        // was right-clicked was not in the selection
        if(self.selectedTracks.indexOf(index) < 0) {
            self.selectTrack(index, {});
        }

        // @magicNumbers The -5 is to make the cursor appear inside the context menu, not on the edge

        // Show the context menu
        self.visibleContextMenu("track");
        self.visibleContextMenuTop(event.pageY - 5);

        // Flip the positioning of the context menu if the cursor is too far to the right
        var innerWidth = window.innerWidth;
        if(event.pageX / innerWidth > .75) {
            self.visibleContextMenuFloat("right");
            self.visibleContextMenuXPos(innerWidth - event.pageX - 5);
        } else {
            self.visibleContextMenuFloat("left");
            self.visibleContextMenuXPos(event.pageX - 5);
        }
    };

    self.hideContextMenu = function() {
        self.visibleContextMenu(false);
    }

    self.volumeDragStart = function() {
        // Prevent the volume dropdown from sliding back up
        $(this).parent().parent().addClass("locaked");
    };

    self.volumeDragDrag = function(event, ui) {
        // Calculate the volume
        var height = parseInt($("#volumeSlider").css("height").replace("px", ""));
        var newVol = (height - ui.position.top) / height;

        // TODO: Store the volume in the settings

        // Change the volume in the playback viewmodel
        self.playback().setVolume(newVol);
    };

    self.volumeDragStop = function() {
        // Allow the volume dropdown to hide itself
        $(this).parent().parent().removeClass("locked");
    };

    // DOCUMENT READY HANDLES //////////////////////////////////////////////
    $(document).ready(function() {
        $("#volumeHandle").draggable({
            axis: "y",
            containment: "parent",
            start: self.volumeDragStart,
            drag: self.volumeDragDrag,
            stop: self.volumeDragStop
        });
    });
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
});

