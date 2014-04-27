/**
 * Created with JetBrains PhpStorm.
 * User: Ben
 * Date: 4/27/14
 * Time: 3:53 PM
 * To change this template use File | Settings | File Templates.
 */

function PlaylistViewModel(type, parent) {
    var self = this;

    // DATA MEMBERS ////////////////////////////////////////////////////////
    // PARENT VM BACK REFERENCE ////////////////////////////////////////////
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

    // ACTIONS /////////////////////////////////////////////////////////////
    // NON-AJAX ////////////////////////////////////////////////////////////

    // AJAX ////////////////////////////////////////////////////////////////
    self.fetch = function(callback) {
        // Build a request for the playlist
        var params = getBaseAjaxParams("GET", serverAddress + self.Href);

        // Add error handler
        params.error = function(jqXHR) {
            self.parent.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup playlist for unknown reason.");
        };

        // Set up the success handler based on the type of the playlist
        if(type == "static") {
            params.success = function(jqXHR) {
                // Set the internal variables and mark as loaded
                self.Tracks = ko.observableArray(jqXHR.Tracks);
                self.Loaded = true;

                if(callback !== null) {
                    callback(self);
                }
            }
        } else {
            alert("Not implemented.");
        }

        // Make the call
        $.ajax(params);
    };

    self.addTracks = function(selection) {
        // Only run this if this is a static playlist
        if(self.type != "static") {
            console.log("Cannot add tracks to an auto playlist");
            return;
        }

        // Build an ajax request for EACH selected track
        // TODO: Do this with a single batch call when Dolomite supports it
        selection.forEach(function(item) {
            // Build a request to add the tracks
            var params = getBaseAjaxParams("POST", serverAddress + self.Href);
            params.error = params.error = function(jqXHR) {
                self.parent.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to add tracks to playlist for unknown reason.");
            };
            params.success = function() {
                // If the playlist has already been loaded, then force a reload of the playlist
                // We do a full reload since due to the async nature of the requests, the order
                // of the playlist COULD be wrong. When the batch is supported in dolomite, this
                // will not be a problem, and we can just tack the new track onto the end
                self.fetch(null);
            };
            params.data = item.Id;

            // Fire off the request
            $.ajax(params);
        });
    }
}