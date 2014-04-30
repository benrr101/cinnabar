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