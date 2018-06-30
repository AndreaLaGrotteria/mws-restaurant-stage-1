function openDB(){
    return idb.open('restaurant-reviews', 1, (upgradeDb) => {
        if(!upgradeDb.objectStoreNames.contains('restaurants')){
            upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
        }
    });
}

function createAndUpdateDB() {
    'use strict';
  
    //check for support
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }
  
    
    var items;

    DBHelper.fetchResIDB((error, restaurants) => {
        if (error) {
            console.log(error);
        } else {
            items = restaurants;
            openDB().then((db) => {
                var tx = db.transaction('restaurants', 'readwrite');
                var store = tx.objectStore('restaurants');
                
                items.forEach(item => {
                    store.put(item);
                });
                return tx.complete;
            }).then(() => {
                console.log('store updated');
            })
        }
    } );

    
};

function readDB(){
    'use strict';
  
    //check for support
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }

    return openDB().then((db) => {
        var tx = db.transaction('restaurants');
        var store = tx.objectStore('restaurants');
        return store.getAll();
    });
}