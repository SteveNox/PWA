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

var loglist = {
  items : [],   // current loglist  list
  inputForm: null,
  addButton: null,
  reportedAt: null, 
  licensePlate: null, 
  description: null, 
  picture: null,

  init : () => {
    loglist.inputForm = document.getElementById('orderForm');
    loglist.addButton = document.getElementById('list-add');
    
    loglist.besteller = document.getElementById('besteller');
    loglist.lieferant = document.getElementById('lieferant');
    loglist.lieferadresse = document.getElementById('lieferadresse');
    loglist.bestellungsinhalt = document.getElementById('bestellungsinhalt');
    loglist.key = Date.now().toString(36) + Math.random().toString(36);
    loglist.inputForm.onsubmit = loglist.add;
    loglist.addButton.disabled = false;


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
window.addEventListener("load", loglist.init);