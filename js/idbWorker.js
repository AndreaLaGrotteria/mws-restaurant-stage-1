function openDB(){
    return idb.open('restaurant-reviews', 2, (upgradeDb) => {
        switch(upgradeDb.oldVersion){
            case 0:
                if(!upgradeDb.objectStoreNames.contains('restaurants')){
                    upgradeDb.createObjectStore('restaurants', {keyPath: 'id'})
                }
            case 1:
                if(!upgradeDb.objectStoreNames.contains('offline-reviews')){
                    upgradeDb.createObjectStore('offline-reviews', {keyPath: 'tempId'});
                }
        }        
    });
}

/* =========================  WHOLE APP DB ====================================*/
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


/* =========================  OFFLINE REVIEWS DB ====================================*/
function addReviewDB(review){
    'use strict'

    //check for support
    if (!('indexedDB' in window)) {
        console.log('This browser doesn\'t support IndexedDB');
        return;
    }

    openDB().then((db) => {
        const tx = db.transaction('offline-reviews', 'readwrite');
        const store = tx.objectStore('offline-reviews');
        store.put(review);
        return tx.complete;
    }).then(() => {
        console.log('Review stored offline!')
    })
}

function getReviewsDB(){
    'use strict'

    //check for support
    if (!('indexedDB' in window)) {
        console.log('This browser doesn\'t support IndexedDB');
        return;
    }
    
    return openDB().then(db => {
        const tx = db.transaction('offline-reviews');
        const store = tx.objectStore('offline-reviews');
        return store.getAll();
    })

}


function checkUpdateReviewDb(){
    'use strict'

    //check for support
    if (!('indexedDB' in window)) {
        console.log('This browser doesn\'t support IndexedDB');
        return;
    }

    openDB().then((db) => {
        const tx = db.transaction('offline-reviews', 'readwrite');
        return tx.objectStore('offline-reviews');
    }).then(store => {
        store.getAll().then(reviews => {
            console.log(reviews);
            if(reviews.length > 0){
                console.log('submtting offline reviews')
                reviews.forEach(review => {
                    const init = {
                        method: 'POST', 
                        body: JSON.stringify(review), 
                        headers:{
                        'Content-Type': 'application/json'
                        }
                    }
                
                    fetch('http://localhost:1337/reviews/', init)
                    .then(response => response.json())
                    .catch(error => {
                    console.error('Error:', error);
                    })
                    .then(response => console.log('Success submitting offline reviews:', response));
                })
            }
        })
        
        store.openCursor().then(function deleteReviews(cursor){
            if(!cursor) return;
            cursor.delete();
            return cursor.continue().then(deleteReviews());
        })
    })
}
