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

    // OBSERVABLE //////////////////////////////////////////////////////////
    self.Name = ko.observable(null);        // The name of the playlist
    self.Tracks = ko.observableArray();     // A list of GUIDs that correspond to tracks that belong to this playlist
    self.Rules = ko.observableArray();      // Rules that an auto playlist will match
    self.MatchAll = ko.observable(null);    // Whether or not the auto playlist matches all rules
    self.ApplyLimit = ko.observable(null);  // Whether or not the auto playlist has a limiter
    self.LimitCount = ko.observable(null);  // The number of tracks to limit the auto playlist to
    self.LimitField = ko.observable(null);  // The field to sort the auto playlist by
    self.LimitDesc = ko.observable(null);   // Whether or not to sort the autoplaylist descending
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
 * @param selection Array<TrackViewModel> An array of tracks to add to the playlist.
 * @param errorCallback (Function|null) An optional callback for when the ajax
 *                                      request fails.
 */
PlaylistViewModel.prototype.addTracks = function(selection, errorCallback) {
    var self = this;

    // Only run this if this is a static playlist
    if(self.Type != "static") {
        throw new Error("Cannot add tracks to an auto playlist.");
        return;
    }

    // Build an ajax request for EACH selected track
    // TODO: Do this with a single batch call when Dolomite supports it
    selection.forEach(function(item) {
        // Build a request to add the tracks
        var params = getBaseAjaxParams("POST", serverAddress + self.Href);
        params.error = function(jqXHR) {
            if(errorCallback !== null)
                errorCallback(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to add tracks to playlist for unknown reason.");
        };
        params.success = function() {
            // If the playlist has already been loaded, then force a reload of the playlist
            // We do a full reload since due to the async nature of the requests, the order
            // of the playlist COULD be wrong. When the batch is supported in dolomite, this
            // will not be a problem, and we can just tack the new track onto the end
            self.fetch(null, errorCallback);
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
        var playlist = {
            Name: self.Name(),
            Limit: !self.ApplyLimit() ?  // Limiter is optional
                null :
                {
                    Limit: self.LimitCount(),
                    SortField: self.LimitField() != null ? self.LimitField().TagName : null,     // Sort field is optional param
                    SortDescending: self.LimitField() != null ? self.LimitDesc() : null   // Descending is optional param
                },
            MatchAll: self.MatchAll(),
            Rules: $.map(self.Rules(), function(element) {
                return {Field: element.metadataField().TagName, Comparison: element.comparison().Name, Value: element.value() }
            })
        };
        params.data = JSON.stringify(playlist);
    }

    // Call that mofo!
    $.ajax(params);
};

/**
 * Removes a set of track indices from this playlist
 * @param selection Array<int>  The indices of tracks to remove from the playlist
 * @param errorCallback Function    A callback for failing completion
 */
PlaylistViewModel.prototype.removeTracks = function(selection, errorCallback) {
    var self = this;

    // Only run this if this is a static playlist
    if(self.Type != "static") {
        throw new Error("Cannot remove tracks from an auto playlist.");
        return;
    }

    // Build an ajax request for EACH selected track
    // TODO: Do this with a single batch call if Dolomite ever supports it
    selection.forEach(function(item) {
        // Build a request to add the tracks
        // NOTE: track order is 1 indexed, so we need to offset our index
        var params = getBaseAjaxParams("DELETE", serverAddress + self.Href + '/' + (item + 1));
        params.error = function(jqXHR) {
            if(errorCallback !== null)
                errorCallback(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to remove tracks from playlist for unknown reason.");
        };
        params.success = function() {
            // If the playlist has already been loaded, then force a reload of the playlist
            // We do a full reload since due to the async nature of the requests, the order
            // of the playlist COULD be wrong. When the batch is supported in dolomite, this
            // will not be a problem, and we can just tack the new track onto the end
            self.fetch(null, errorCallback);
        };

        // Fire off the request
        $.ajax(params);
    });
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

// NON-AJAX ////////////////////////////////////////////////////////////////
PlaylistViewModel.prototype.removeRule = function(rule) {
    var self = this;
    self.Rules.remove(rule);
}

PlaylistViewModel.prototype.addRule = function() {
    var self = this;
    self.Rules.push(new AutoPlaylistRule());
}