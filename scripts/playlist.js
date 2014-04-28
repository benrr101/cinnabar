/**
 * Playlist ViewModel
 * @descrip This view model is used to represent a playlist. Values that need
 *          to be observable are set as such. Actions for manipulating the
 *          object are also provided.
 * @author  Benjamin Russell (benrr101+dolomite@outlook.com)
 */

// DATA MEMBERS ////////////////////////////////////////////////////////////
function PlaylistViewModel(type) {
    var self = this;

    // NON-OBSERVABLE //////////////////////////////////////////////////////
    self.Id = null;         // The GUID of the playlist
    self.Type = type;       // The type of the playlist (auto|static)
    self.Href = null;       // The Href for GETting the playlist
    self.Loaded = false;    // Whether or not the playlist has been fetched from the server
    self.Created = true;    // Whether or not the playlist exists on the server

    self.Rules = null;      // Rules that an auto playlist will match
    self.MatchAll = null;   // Whether or not the auto playlist matches all rules
    self.Limit = null;      // The limiter that was applied to the playlist

    // OBSERVABLE //////////////////////////////////////////////////////////
    self.Name = ko.observable(null);    // The name of the playlist
    self.Tracks = ko.observableArray(); // A list of GUIDs that correspond to tracks that belong to this playlist
}

// ACTIONS /////////////////////////////////////////////////////////////////
// AJAX ////////////////////////////////////////////////////////////////////
/**
 * Fetches the playlist from the server. Performs an optional callback when
 * completed.
 * @param callback (Function|null)  The optional callback to perform when the
 *                                  playlist has been successfully loaded
 * @param errorCallback (Function|null) Optional callback for when the ajax
 *                                      call fails.
 */
PlaylistViewModel.prototype.fetch = function(callback, errorCallback) {
    var self = this;

    // Build a request for the playlist
    var params = getBaseAjaxParams("GET", serverAddress + self.Href);

    // Add error handler
    params.error = function(jqXHR) {
        if(errorCallback !== null)
            errorCallback(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup playlist for unknown reason.");
    };

    // Set up the success handler based on the type of the playlist
    if(self.type == "static") {
        params.success = function(jqXHR) {
            // Set the internal variables and mark as loaded
            self.Tracks = ko.observableArray(jqXHR.Tracks);
            self.Loaded = true;

            if(callback !== null) {
                callback(self);
            }
        }
    } else {
        params.success = function(jqXHR) {
            // Set the internal variables and mark as loaded
            self.Tracks = ko.observable(jqXHR.Tracks);
            self.Loaded = true;

            if(callback !== null) {
                callback(self);
            }
        }
    }

    // Make the call
    $.ajax(params);
};

/**
 * Adds the provided list of track guids to this static playlist.
 * @throws  Error   Thrown if this method is called on an automatic playlist.
 * @param selection Array<guid> An array of track guids to add to the playlist.
 * @param errorCallback (Function|null) An optional callback for when the ajax
 *                                      request fails.
 */
PlaylistViewModel.prototype.addTracks = function(selection, errorCallback) {
    // Only run this if this is a static playlist
    if(this.type != "static") {
        throw new Error("Cannot add tracks to an auto playlist.");
        return;
    }

    // Build an ajax request for EACH selected track
    // TODO: Do this with a single batch call when Dolomite supports it
    selection.forEach(function(item) {
        // Build a request to add the tracks
        var params = getBaseAjaxParams("POST", serverAddress + this.Href);
        params.error = params.error = function(jqXHR) {
            if(errorCallback !== null)
                errorCallback(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to add tracks to playlist for unknown reason.");
        };
        params.success = function() {
            // If the playlist has already been loaded, then force a reload of the playlist
            // We do a full reload since due to the async nature of the requests, the order
            // of the playlist COULD be wrong. When the batch is supported in dolomite, this
            // will not be a problem, and we can just tack the new track onto the end
            this.fetch(null);
        };
        params.data = item.Id;

        // Fire off the request
        $.ajax(params);
    });
};

/**
 * Sends this playlist to the server as a new playlist
 * @param callback  Function    A callback for successful completion
 * @param errorCallback Function    A callback for failing completion
 */
PlaylistViewModel.prototype.createPlaylist = function(callback, errorCallback) {
    var self = this;

    // Build the request using the internal data
    var params = getBaseAjaxParams("POST", serverAddress + "playlists/" + self.Type + "/");
    params.error = function(jqXHR) {
        errorCallback(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to create playlist for unknown reason.");
    }
    params.success = function(response) {
        // Update the internal data with the response data
        self.Id = response.Guid;
        self.Href = "/playlists/" + self.Type + "/" + self.Id;
        callback(self);
    }

    // Add data based on the type of the playlist
    if(self.Type == "static") {
        params.data = JSON.stringify({Name: self.Name()});
    } else {
        throw new Error("Not implemented.");
    }

    // Call that mofo!
    $.ajax(params);
};

/**
 * Performs a comparison of two playlists based on their names
 * @param left  PlaylistViewModel   The first item in the comparison
 * @param right PlaylistViewModel   The second item in the comparison
 * @returns Number  A positive value if left > right,
 *                  A negative value if right > left,
 *                  Zero if left = right
 */
PlaylistViewModel.sortByName = function (left, right) {
    var l = left.Name().toLowerCase(), r = right.Name().toLowerCase();
    return l == r ? 0 : l < r ? -1 : 1;
}