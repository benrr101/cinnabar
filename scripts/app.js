/**
 * Created with JetBrains PhpStorm.
 * User: Ben
 * Date: 1/17/14
 * Time: 10:42 PM
 * To change this template use File | Settings | File Templates.
 */

jQuery.support.cors = true;

var apiKey = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
var serverAddress = "https://localhost:8080/";

function LoginViewModel() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////

    self.libraryLoaded = ko.observable(false);

    self.username = ko.observable("");
    self.password = ko.observable("");
    self.loggedIn = ko.observable(false);
    self.notice = ko.observable("");

    self.allTracks = [];
    self.visibleTracks = ko.observableArray([]);
    self.staticPlaylists = ko.observableArray([]);
    self.autoPlaylists = ko.observableArray([]);

    self.playingHref = ko.observable("");
    self.playingCover = ko.observable("");

    // ACTIONS /////////////////////////////////////////////////////////////
    /**
     * Handles logging into Dolomite. Sends the username/password as JSON string
     * and handles the error/success conditions.
     */
    self.submitLogin = function() {
        $.ajax({
            cache: false,
            contentType: "application/json; charset=utf-8",
            data:  JSON.stringify({Username: self.username(), Password: self.password(), ApiKey: apiKey}),
            dataType: "json",

            type: "POST",
            url: "https://localhost:8080/users/login",
            xhrFields: { withCredentials: true },
            error: function(jqXHR) {
                if(jqXHR.status != 0) {
                    self.notice(jqXHR.responseJSON.Message);
                } else {
                    self.notice("Login failed for unknown reason.");
                }
            },
            success: function() {
                self.notice("");
                self.loggedIn(true);

                self.loadLibrary();
                self.loadAutoPlaylists();
                self.loadStaticPlaylists();

                self.libraryLoaded(true);
            }
        });
    };

    self.loadLibrary = function() {
        if(self.allTracks.length > 0){
            self.visibleTracks(self.allTracks);
            return;
        }

        $.ajax({
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            type:"GET",
            xhrFields: { withCredentials: true },
            url: serverAddress + "tracks/",
            error: function(jqXHR) {
                if(jqXHR.status == 0) {
                    alert("Failed!");
                } else {
                    alert("Failed with code: " + jqXHR.status);
                }
            },
            success: function(data) {
                // Process the tracks into guid-associative array
                for(var i = 0; i < data.length; ++i) {
                    self.allTracks[data[i].Id] = data[i];
                }

                // Set the visible tracks to the list of all tracks
                self.visibleTracks(self.allTracks);
            }
        });
    };

    self.loadAutoPlaylists = function() {
        $.ajax({
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            type:"GET",
            xhrFields: {withCredentials: true},
            url: serverAddress + "playlists/auto/",
            error: function(jqXHR) {
                if(jqXHR.status == 0) {
                    alert("Failed!");
                } else {
                    alert("Failed with code: " + jqXHR.status);
                }
            },
            success: function(data) {
                self.autoPlaylists(data);
            }
        });
    };

    self.loadStaticPlaylists = function() {
        $.ajax({
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            type:"GET",
            xhrFields: {withCredentials: true},
            url: serverAddress + "playlists/static/",
            error: function(jqXHR) {
                if(jqXHR.status == 0) {
                    alert("Failed!");
                } else {
                    alert("Failed with code: " + jqXHR.status);
                }
            },
            success: function(data) {
                self.staticPlaylists(data);
            }
        });
    }

    self.loadStaticPlaylist = function(item) {
        $.ajax({
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            type: "GET",
            xhrFields: { withCredentials: true },
            url: serverAddress + item.Href,
            error: function(jqXHR) {
                alert("Failed.")
            },
            success: function(data) {
                self.visibleTracks.removeAll();
                for(var i=0; i < data.Tracks.length; ++i) {
                    self.visibleTrack.push(sallTracks[data.Tracks[i]]);
                }
            }
        })
    }

    self.play = function(item) {
        $.ajax({
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            type:"GET",
            xhrFields: { withCredentials: true },
            url: serverAddress + "tracks/" + item.Id,
            error: function(jqXHR) {
                if(jqXHR.status == 0) {
                    alert("Failed.");
                } else {
                    alert("Failed with code:" + jqXHR.status);
                }
            },
            success: function(data) {
                self.playingHref(serverAddress + data.Qualities[data.Qualities.length - 2].Href);
                self.playingCover(serverAddress + data.ArtHref);
            }
        })
    }
}

// Activates knockout.js
ko.applyBindings(new LoginViewModel());