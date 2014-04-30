/**
 * Track ViewModel
 * @descrip This view model is used to represent a track.
 * @author  Benjamin Russell (benrr101+dolomite@outlook.com)
 */

function TrackViewModel() {
    var self = this;

    // NON-OBSERVABLE //////////////////////////////////////////////////////
    self.Id = null;                 // The GUID of the track
    self.ArtHref = null;            // The URL for this track's art
    self.Loaded = false;            // Whether or not the track has been fetched from the server
    self.Qualities = [];            // The list of qualities that are available for the track

    // OBSERVABLE //////////////////////////////////////////////////////////
    self.Metadata = ko.observableDictionary();  // The dictionary of metadata available for the track
}

// ACTIONS /////////////////////////////////////////////////////////////////
// AJAX ////////////////////////////////////////////////////////////////////
TrackViewModel.prototype.fetch = function(callback, errorCallback) {
    var self = this;

    // Check to see if the track is loaded, skip loading if it is
    if(self.Loaded) {
        if(callback !== null) {
            callback(self);
        }
        return;
    }

    // Set up a ajax request for the track
    var params = getBaseAjaxParams("GET", serverAddress + "tracks/" + self.Id);
    params.error = function(xhr) {
        errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to lookup track library for unknown reason.")
    }
    params.success = function(xhr) {
        // Store the information we don't already have
        self.Qualities = xhr.Qualities;
        self.ArtHref = serverAddress + '/' + xhr.ArtHref;
        self.Loaded = true;

        // Call the optional callback
        if(callback !== null) {
            callback(self);
        }
    }
    $.ajax(params);
}