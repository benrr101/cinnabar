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
    cache: false,
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    xhrFields: { withCredentials:true }
};

function ViewModel() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////
    self.generalError = ko.observable(false);   // Used for storing general error messages that will be visible in a modal

    self.loginLoggedIn = ko.observable(false);  // Used for determining if the login form should be displayed. On launch, we are not logged in.
    self.loginNotice   = ko.observable();       // Used for storing error messages that should be shown to the user.
    self.loginPassword = ko.observable();       // Used for storing the password the user is logging in with.
    self.loginUsername = ko.observable();       // Used for storing the username the user is logging in with.

    self.navAutoPlaylists = ko.observableArray();
    self.navStaticPlaylists = ko.observableArray();

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
}

// Activates knockout.js
ko.applyBindings(new ViewModel());