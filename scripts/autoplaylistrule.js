/**
 * Created with JetBrains PhpStorm.
 * User: Ben
 * Date: 4/28/14
 * Time: 9:00 PM
 * To change this template use File | Settings | File Templates.
 */
function AutoPlaylistRule() {
    var self = this;

    // DATA ////////////////////////////////////////////////////////////////

    self.metadataField = ko.observable();
    self.value = ko.observable();
    self.comparison = ko.observable();
    self.comparisonOptions = ko.observableArray();

    self.metadataField.subscribe(function() {
        self.comparisonOptions = ko.observableArray(metadataComparisons[self.metadataField().Type]);
        self.comparison(null);
    })
}