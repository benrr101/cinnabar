/**
 * Playback ViewModel
 * @descrip Used to handle the currently playing playlist/queue and all things
 *          involved with playback
 * @author  Benjamin Russell (benrr101+dolomite@outlook.com)
 */

function PlaybackViewModel() {
    var self = this;

    // NON-OBSERVABLE //////////////////////////////////////////////////////
    self.volume = 1;            // The volume to play
    self.audioObject = null;    // The currently playing audio object

    self.nowPlayingList = [];       // The tracks to pull now playing tracks from
    self.nowPlayingListSorted = []; // The sorted list of tracks to pull now playing tracks from
    self.nowPlayingIndex;           // The index of the playing track in the now playing list

    // OBSERVABLE //////////////////////////////////////////////////////////
    self.playing = ko.observable(false);                // Whether or not there are tracks playing
    self.track = ko.observable();                        // The playing track (the blank obj is to keep null errors at bay)
    self.art = ko.observable(null);                     // The Href for the currently playing album art
    self.progress = ko.observable(0);                   // The played percentage of the track
    self.progressTime = ko.observable(0);               // The time played
    self.queue = ko.observableArray();                  // The queue of tracks to be played immediately after the current track
    self.shuffleEnabled = ko.observable(false);
    self.repeatEnabled = ko.observable(false);

    // ACTIONS /////////////////////////////////////////////////////////////
    // NON-AJAX ////////////////////////////////////////////////////////////
    self.previousTrack = function() {}
    self.togglePlayback = function() {}
    self.nextTrack = function() {}

    self.scrubberClick = function() {}

    self.toggleShuffle = function() {}
    self.toggleRepeat = function() {}

    self.beginPlayback = function(tracks, track) {
        // Build the now playing list from the tracks
        self.nowPlayingList = [];
        for(var i = 0; i < tracks.length; ++i) {
            self.nowPlayingList.push(tracks[i]);
            self.nowPlayingListSorted.push(tracks[i]);
        }

        // Do we need to shuffle the playlist?
        // @TODO: Remove references to vm.viewmodel
        if(self.shuffleEnabled() && vm.viewModel.settings.shuffleMode == 'order') {
            // Shuffle an re-add the original track to the top of the list
            self.nowPlayingList = self.nowPlayingList.shuffle();
            self.nowPlayingList = self.nowPlayingList.move(self.nowPlayingList.indexOf(track), 0)
            self.nowPlayingIndex = 0;
        } else {
            self.nowPlayingIndex = track !== null ? self.nowPlayingList.indexOf(track) : 0;
        }

        track = self.nowPlayingList[self.nowPlayingIndex];
        // @TODO: Remove reference to vm.viewmodel
        if(!track.Loaded) {
            track.fetch(self.playTrack, vm.viewModel.generalError);
        } else {
            self.playTrack(track);
        }
    }

    self.playTrack = function(track) {
        // Which audio quality should be played? Count down from the top to get the highest quality that doesn't exceed the preferences
        var trackQuality;
        // @TODO: Remove references to vm.viewmodel
        for(var q = vm.viewModel.settings().quality; q >= 0; --q) {
            if(typeof track.Qualities[q] !== "undefined") {
                trackQuality = track.Qualities[q];
                break;
            }
        }

        // Create an audio thing if needed
        if(self.audioObject !== null) {
            self.audioObject.src = serverAddress + trackQuality.Href;
        } else {
            self.audioObject = new Audio(serverAddress + trackQuality.Href);
            self.audioObject.volume = self.volume;
            self.audioObject.ontimeupdate = function(e) {
                // Update the numeric time
                var time = e.target.currentTime;
                self.progressTime(calculateTrackTime(time));

                // Update the scrubber percentage
                var percent = time / e.target.duration * 100;
                self.progress(percent);
                if(percent >= 90) { // If we're almost at the end, change the scrubber handle to prevent it from jumping to the next line
                    $("#playedHandle").addClass("end");
                }
            }
            self.audioObject.onended = function(e) {
                // Jump to the next track
                self.nextTrack();
            }
        }

        // Start that shit up!
        $("#playedHandle").removeClass("end");
        self.playing("playing");
        self.art(serverAddress + track.ArtHref);
        self.track(track);
        self.progressTime(calculateTrackTime(0));
        self.progress(0);
        self.audioObject.play();
    }
}