var dbPromise = idb.open('orderStore', 1, function(db) {
    if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', {keyPath: 'bestellungid'});
    }
    if (!db.objectStoreNames.contains('sync-orders')) {
        db.createObjectStore('sync-orders', {keyPath: 'bestellungid'});
    }   
});

function writeData(st, data) {
    return dbPromise
    .then(function(db) {
        var tx = db.transaction(st, 'readwrite'); //or readonly.... create transaction
        var store = tx.objectStore(st); //get store
        store.put(data); //write to store
        
        return tx.complete; //close transaction and save
    });
}

function readAllData(st) {
    return dbPromise
        .then(function(db) {
            var tx = db.transaction(st, 'readonly');
            var store = tx.objectStore(st);
            return store.getAll();
        });
}

function clearAllData(st) {
    return dbPromise
        .then(function(db) {
            var tx = db.transaction(st, 'readwrite');
            var store = tx.objectStore(st);
            store.clear();
            return tx.complete;
        });
}

function deleteItemFromData(st, id) {
    return dbPromise
        .then(function(db) {
            var tx = db.transaction(st, 'readwrite');
            var store = tx.objectStore(st);
            store.delete(id);
            return tx.complete;
        })
        .then(function() {
            console.log('item deleted from indexeddb');
        });
}