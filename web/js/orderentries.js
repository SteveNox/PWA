const apiUrl = "http://localhost:24881/bestellung"
const DB_CACHE_NAME = 'orders';

var logger = {
  log: (aMessage) => {
    isLogging = true;

    if (isLogging) {
      console.log(aMessage);
    }
  }
}

//media polyfill
function initializeMedia() {
  if(!('mediaDevices' in navigator)) {
    navigator.mediaDevices = {};
  }  

  if (!('getUserMedia' in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia not implemented!'));
      }

      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }

  navigator.mediaDevices.getUserMedia({video: true})
    .then(function(stream) {
      loglist.videoPlayer.srcObject = stream;
      loglist.videoPlayer.style.display = 'block';
    })
    .catch(function(err) {
      loglist.imagePicker.style.display = 'block';
    });
}

var loglist = {
  items : [],   // current loglist  list
  inputForm: null,
  addButton: null,
  messageButton: null,

  init : () => {
    loglist.inputForm = document.getElementById('orderForm');
    loglist.addButton = document.getElementById('list-add');
    
    loglist.messageButton = document.getElementById('message-request');

    loglist.besteller = document.getElementById('besteller');
    loglist.lieferant = document.getElementById('lieferant');
    loglist.lieferadresse = document.getElementById('lieferadresse');
    loglist.bestellungsinhalt = document.getElementById('bestellungsinhalt');
    
    loglist.videoPlayer = document.getElementById('player');
    loglist.canvas = document.getElementById('canvas');
    loglist.captureButton = document.getElementById('capture-media-btn');
    loglist.imagePicker = document.getElementById('pick-image');

    loglist.key = Date.now().toString(36) + Math.random().toString(36);
    loglist.inputForm.onsubmit = loglist.add;
    loglist.addButton.disabled = false;

    initializeMedia();


    if ('Notification' in window) {
    //if ('Notification' in window && 'serviceWorker' in navigator) { //for push
      loglist.messageButton.style.display='inline-block';
      loglist.messageButton.addEventListener('click', askForNotificationPermission);
    }


    var networkDataReceived = false;

    fetch(apiUrl)
      .then(response => response.json())
      .then(function(data) {
          networkDataReceived = true;
          loglist.items = [];
          console.log(data);
          for (var key in data) {
            loglist.items.push({key: key, besteller: data[key].besteller, lieferant: data[key].lieferant, lieferadresse: data[key].lieferadresse, bestellungsinhalt: data[key].bestellungsinhalt}); 
          }
          console.log("from web", loglist.items);
          loglist.draw();
      });    

    //network cache racing
    if('indexedDB' in window) {
      readAllData('orders')
        .then(function(data) {
          if(!networkDataReceived) {
            loglist.items = [];
            for (var key in data) {
              loglist.items.push({key: key, besteller: data[key].besteller, lieferant: data[key].lieferant, lieferadresse: data[key].lieferadresse, bestellungsinhalt: data[key].bestellungsinhalt}); 
             }
            console.log("from indexedDB", loglist.items);
            loglist.draw();
          }
        })
    }
  },

  add : (evt) => {
    evt.preventDefault();
    
    var newItem = {
      bestellungid: Date.now().toString(36) + Math.random().toString(36).substring(2),
      besteller: loglist.besteller.value,
      lieferant: loglist.lieferant.value,
      lieferadresse: loglist.lieferadresse.value,
      bestellungsinhalt: loglist.bestellungsinhalt.value
    }

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(function(sw) {
            writeData('sync-orders', newItem)
            .then(function() {
              sw.sync.register('sync-new-order');
            })
            .then(function() {
              //show toast or so on
              writeData('orders', newItem);
              loglist.items.push(newItem);
              loglist.draw();
            })
            .catch(function(err) {
              // console.log(err);
            })
        });
    } else {
      fetch(apiUrl, {
        method: "POST", 
        body: JSON.stringify(newItem), 
        headers: {"Content-type": "application/json; charset=UTF-8", 'Accept': 'application/json'}
      })
      .then(function() {
          loglist.items.push(newItem);
          loglist.draw();
      })
      .catch(function(err) {
        //prevent red line in console
      });
    }
  },

  delete : (id) => { if (confirm("Remove this item?")) {
    var item = loglist.items.find(i=>i.key==id);
    
    fetch(dbUrl + "/" + item.key + ".json", {
      method: "DELETE"
    });
    
    loglist.items.splice(loglist.items.findIndex(i=>i.key==id), 1);
    loglist.draw();
  }},

  draw : () => {
    log = document.getElementById("orderEntries");
    log.innerHTML = "";

    // NO ITEMS
    if (loglist.items.length == 0) {
      loglist.hlist.innerHTML = "<div class='item-row item-name'>No items found.</div>";
    }

    // DRAW ITEMS
    else {
      for (let i in loglist.items) {
        let card = document.createElement("div");
        card.className='card col-mb-3 m-2';
        card.style="width: 18rem;"
        let text = document.createElement("p");
        text.textContent=loglist.items[i].besteller;
        text.className="card-img-top";
        let body = document.createElement("div");
        body.className="card-body";
        let title = document.createElement("h5");
        title.className="card-title";
        title.textContent=loglist.items[i].lieferant
        let subTitle = document.createElement("h6");
        subTitle.className="card-subtitle";
        subTitle.textContent=loglist.items[i].bestellung
        
        let description = document.createElement("p");
        description.className="card-text";
        description.textContent = loglist.items[i].lieferadresse

        // DELETE BUTTON
        let del = document.createElement("input");
        del.className = "item-del";
        del.type = "button";
        del.value = "Delete";;
        del.onclick = () => { loglist.delete(loglist.items[i].key); };
        
        body.appendChild(title);
        body.appendChild(subTitle);
        body.appendChild(description)
        card.appendChild(text);
        card.appendChild(body);
        card.appendChild(del);
        log.appendChild(card);       
      }
    }
  }
};


function askForNotificationPermission() {
  Notification.requestPermission(function(result) {
    console.log('User choice', result);
    if (result !== 'granted') {
      console.log('No permission granted');
    } else {
      //displayConfirmNotification();
      configurePushSubscription();
    }
  });
}

function displayConfirmNotification() {
  // variante 1
  // var options = {
  //   body: 'You have successfully subscribed to the Notification Service!'
  // };
  
  if ('serviceWorker' in navigator) {
    var options = {
      body: 'You have successfully subscribed to the Notification Service!',
      icon: '/images/icons/icon-96x96.png',
      image: '/images/icons/icon-512x512.png',
      dir: 'ltr',
      lang: 'en-US',
      vibrate: [100, 50, 200],
      badge: '/images/icons/icon-96x96.png',
      //no renotification
      tag: 'confirm-notification',
      renotify: true,
      actions: [
        { action: 'confirm', title: 'OK!', icon: '/images/icons/icon-96x96.png' },
        { action: 'cancel', title: 'CANCEL!', icon: '/images/icons/icon-96x96.png' }
      ]
    };
    navigator.serviceWorker.ready
      .then(function(sw) {
        sw.showNotification('Successfully subscribed from sw', options);
    });
  }
}
  function configurePushSubscription() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    var swreg;

    navigator.serviceWorker.ready
      .then(function(sw) {
          swreg = sw;
          sw.pushManager.getSubscription(); //will return existing subscriptions
      })
      .then(function(subscription) {
        //checks subscription for this browser on this device
        if (subscription === null) {
          //create new sub
          //from web-push generate-vapid-keys 
          var vapidPublicKey = 'BBCAhxasZgyyU0hb2Q3Aisd68AdHOviZkNR3HMy1r1nvkZCNJL9Xkb0ykr-TYIVUHy3WftdEZbGn-evuWD7bd9I'
          var convertedVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);

          swreg.pushManager.subscribe({
            userVisibleOnly: true, //push notifications are only visible to the user
            applicationServerKey: convertedVapidPublicKey
          });
        } else {
          //use existing
        }
      })
      .then(function(newSub) {
        //save to server
        //fetch with post on backend JSON.stringify(newSub)
      })
      .then(function(response) {
        if(response && response.ok)
          displayConfirmNotification();
      });
  // new Notification('Successfully subscribed', options);
  }

window.addEventListener("load", loglist.init);