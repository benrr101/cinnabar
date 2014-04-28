/**
 * Created with JetBrains PhpStorm.
 * User: Ben
 * Date: 4/27/14
 * Time: 3:53 PM
 * To change this template use File | Settings | File Templates.
 */

// DATA MEMBERS ////////////////////////////////////////////////////////////
function PlaylistViewModel(type, parent) {
    var self = this;

    // PARENT VM BACK REFERENCE ////////////////////////////////////////////
    //@TODO: Replace with callbacks to handle these sorts of things
    self.parent = parent;   // A reference back to the parent VM for handling errors

    // NON-OBSERVABLE //////////////////////////////////////////////////////
    self.Id = null;         // The GUID of the playlist
    self.Type = type;       // The type of the playlist (auto|static)
    self.Href = null;       // The Href for GETting the playlist
    self.Loaded = false;    // Whether or not the playlist has been fetched from the server

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
 */
PlaylistViewModel.prototype.fetch = function(callback) {
    var self = this;

    // Build a request for the playlist
    var params = getBaseAjaxParams("GET", serverAddress + self.Href);

    // Add error handler
    params.error = function(jqXHR) {
        self.parent.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup playlist for unknown reason.");
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
 */
PlaylistViewModel.prototype.addTracks = function(selection) {
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
            this.parent.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to add tracks to playlist for unknown reason.");
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