document.addEventListener('DOMContentLoaded', main);

function main() {
    const studySetData = [];
    $.getJSON('/data/all-citymd-medical-terms.json', (data) => {
        console.log("Successfully loaded JSON.");
        $.each( data, (obj) => {
            studySetData.push(obj);
        });
    }).done(function() {
        console.log("Succesffuly loaded JSON into");
        console.log(studySetData.length);
    }).fail(function() {
        console.log("Failed to load JSON.");
    }).always(function() {
        console.log('Operation complete.');
    });

    
}