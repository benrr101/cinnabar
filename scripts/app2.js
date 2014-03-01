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

var baseAjaxParams = {
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    xhrFields: { withCredentials:true }
};

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

    self.trackLibrary = {};                     // Used for storing all tracks.

    self.navAutoPlaylists = ko.observableArray();       // Used for storing the list of auto playlists
    self.navStaticPlaylists = ko.observableArray();     // Used for storing the list of static playlists
    self.trackVisibleTracks = ko.observableArray();     // Used for storing the list of VISIBLE tracks in the tracks pane

    // ACTIONS /////////////////////////////////////////////////////////////
    self.loginSubmitLogin = function() {
        var params = baseAjaxParams;
        params.data  = JSON.stringify({Username: self.loginUsername(), Password: self.loginPassword(), ApiKey: apiKey});
        params.type  = "POST";
        params.url   = serverAddress + "users/login";
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
        var params = baseAjaxParams;
        delete params.data;
        params.type  = "GET";
        params.url   = serverAddress + "playlists/auto/";
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup auto playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the auto playlists
            self.navAutoPlaylists(jqXHR);
        }
        $.ajax(params);
    }

    self.loadStaticPlaylists = function() {
        var params = baseAjaxParams;
        delete params.data;
        params.type  = "GET";
        params.url   = serverAddress + "playlists/static/";
        params.error = function(jqXHR) { // Show error message
            self.generalError(jqXHR.status != 0 ? jqXHR.responseJSON.Message : "Failed to lookup static playlists for unknown reason.");
        }
        params.success = function(jqXHR) { // Store the auto playlists
            self.navStaticPlaylists(jqXHR);
        }
        $.ajax(params);
    }

    self.loadTrackLibrary = function(setVisible) {
        var params = baseAjaxParams;
        delete params.data;
        params.type = "GET";
        params.url = serverAddress + "tracks/";
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
}

// Activates knockout.js
ko.applyBindings(new ViewModel());