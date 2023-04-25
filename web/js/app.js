if('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('/sw.js')
        .then(function() {
            console.log('SERVICE WORKER registered!');
        });
};

console.log('BEFORE TIMEOUT!')

var promise = new Promise(function(resolve, reject) {
    setTimeout(function() {
        resolve('TIMEOUT COMPLETE')
        //reject('Absichtlicher Fehler')
    }, 3000);
});

//Alternative zu .then:
//muss in async function aufgerufen werden
async function awaitingTest() {
    try {
        var result = await promise;
        console.log("Erfolg:", result);
    } catch (error) {
        console.log(error);   
    }
}

awaitingTest();

//Standardpromiseaufruf
// promise.then(function(text) {
//     console.log(text);
// }).catch(function(error) {
//     console.log(error);
// })

console.log('AFTER TIMEOUT!');

fetch('http://httpbin.org/ip')
    .then(function(response) {
        console.log(response);
        return response.json();
    })
    .then(function(result) {
        console.log(result);
    })
    .catch(function(error) {
        console.log("FEHLER->", error);
    });