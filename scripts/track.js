/**
 * Track ViewModel
 * @descrip This view model is used to represent a track.
 * @author  Benjamin Russell (benrr101+dolomite@outlook.com)
 */

function TrackViewModel() {
    var self = this;

    // NON-OBSERVABLE //////////////////////////////////////////////////////
    self.Id = null;                     // The GUID of the track
    self.Loaded = false;                // Whether or not the track has been fetched from the server
    self.LoadCheckIntervalId = null;    // The interval ID of the load checking method

    // OBSERVABLE //////////////////////////////////////////////////////////
    self.ArtHref = ko.observable(null);         // The URL for this track's art
                                                // NOTE: This must be observable for album art editing to work
    self.Metadata = ko.observableDictionary();  // The dictionary of metadata available for the track
    self.Qualities = ko.observableArray();      // The list of qualities that are available for the track
                                                // NOTE: This must be observable in order for download lists to work
    self.Ready = ko.observable(true);           // Whether or not the track is ready. They usually are.
    self.UploadProgress = ko.observable(false); // The percent progress of any active upload on this track
}

// ACTIONS /////////////////////////////////////////////////////////////////
// AJAX ////////////////////////////////////////////////////////////////////
TrackViewModel.prototype.checkReady = function() {
    var self = this;

    // Fetch the track and see if it's successful
    self.fetch(null, null);
};

TrackViewModel.prototype.delete = function(callback, errorCallback) {
    var self = this;

    // Set up the parameters to delete the track
    var params = getBaseAjaxParams("DELETE", serverAddress + "/tracks/" + self.Id);
    params.error = function(xhr) {
        errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to delete track for unknown reason.")
    };
    params.success = function(xhr) {
        // That's it, we're done here. To make sure no one tries anything silly, unload the track
        self.Loaded = false;

        if(callback !== null) {
            callback(self);
        }
    };
    $.ajax(params);
};

TrackViewModel.prototype.deleteArt = function(errorCallback) {
    var self = this;

    // Show the spinner
    $(".mdAlbumArtPreview").hide();
    $("#aaSpinner").show();

    // Setup the ajax parameters to delete the album art
    // to delete, we just send a blank request to the part update href
    var params = getBaseAjaxParams("POST", serverAddress + "/tracks/" + self.Id + "/art");
    params.success = function() {
        // Force a reload (the spinner will be hidden on when complete, and
        // the ArtHref update will redisplay the new art
        self.Loaded = false;
        self.fetch(function() { $("#aaSpinner").hide(); }, errorCallback);
    };
    params.error = function() {
        // Hide the spinner
        $("#aaSpinner").hide();
        errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to delete track album art for unknown reason.");
    };

    $.ajax(params);
};

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
    var params = getBaseAjaxParams("GET", serverAddress + "/tracks/" + self.Id);
    params.error = function(xhr) {
        if(errorCallback != null) {
            errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to lookup track for unknown reason.");
        }
    };
    params.success = function(xhr) {
        // Restore the metadata to force a reload of correct data
        self.Metadata.removeAll();
        self.Metadata.pushAll(xhr.Metadata);

        // Store the information we don't already have
        self.Qualities(xhr.Qualities);
        self.ArtHref(xhr.ArtHref != null ? serverAddress + '/' + xhr.ArtHref : null);
        self.Ready(true);
        self.Loaded = true;

        // Clear any interval that is being used on this track
        if(self.LoadCheckIntervalId != null) {
            clearInterval(self.LoadCheckIntervalId);
            self.LoadCheckIntervalId = null;
        }

        // Call the optional callback
        if(callback !== null) {
            callback(self);
        }
    };
    $.ajax(params);
};

TrackViewModel.prototype.resetMetadata = function(callback, errorCallback){
    var self = this;

    // Force a reload of the track
    self.Loaded = false;
    self.fetch(callback, errorCallback);
};

TrackViewModel.prototype.replace = function(formId, successCallback, alertCallback, errorCallback) {
    var self = this;

    // Get the form element to submit
    var formElement = $("#" + formId);

    // Setup the parameters to upload the replacement track
    formElement.ajaxSubmit({
        url: serverAddress + "/tracks/" + self.Id,
        type: "PUT",
        dataType: "json",
        xhrFields: { withCredentials: true},
        beforeSubmit: function() {
            // Set this track as not ready
            self.Ready(false);
            self.Loaded = false;
            self.UploadProgress(0);
        },
        uploadProgress: function(progress) {
            // Update the percentage completed
            self.UploadProgress(Math.floor(progress.loaded * 100 / progress.total));
        },
        success: function() {
            // Hide the spinner/percentage but keep the button disabled.
            alertCallback("Your upload was successful! This track will be unavailable until the track is processed on the server.");
            self.UploadProgress(false);
            if(successCallback != null) {
                successCallback();
            }

            // Set up the infinichecker to run every minute.
            self.LoadCheckIntervalId = setInterval(function() { self.checkReady(); }, 60000);
        },
        error: function(xhr) {
            self.Ready(true);
            self.UploadProgress(false);
            errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to update track album art for unknown reason.");
        }
    });
};

TrackViewModel.prototype.submitMetadata = function(callback, errorCallback) {
    var self = this;

    // Set up the parameters to submit the metadata
    var params = getBaseAjaxParams("POST", serverAddress + "/tracks/" + self.Id + "?clear");
    params.data = JSON.stringify(self.Metadata.toJSON());
    params.error = function(xhr) {
        errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to update track metadata for unknown reason.");
    };
    params.success = function(xhr) {
        // Force reload the track
        self.Loaded = false;
        self.fetch(callback, errorCallback);
    }

    $.ajax(params);
};

TrackViewModel.prototype.uploadArt = function(formId, errorCallback) {
    var self = this;

    // Get the form element to submit
    var formElement = $("#" + formId);

    // Set up the parameters to upload the album art
    formElement.ajaxSubmit({
        url: serverAddress + "/tracks/" + self.Id + "/art",
        type: "POST",
        dataType: "json",
        xhrFields: { withCredentials: true },
        beforeSubmit: function () {
            // Show the spinner
            $(".mdAlbumArtPreview").hide();
            $("#aaSpinner").show();
        },
        success: function () {
            // Force a reload (the spinner will be hidden on when complete, and
            // the ArtHref update will redisplay the new art
            self.Loaded = false;
            self.fetch(function() { $("#aaSpinner").hide(); }, errorCallback);
        },
        error: function (xhr) {
            // Hide the spinner
            $("#aaSpinner").hide();
            errorCallback(xhr.status != 0 ? xhr.responseJSON.Message : "Failed to update track album art for unknown reason.");
        }
    });
};