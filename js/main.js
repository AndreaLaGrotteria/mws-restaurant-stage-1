let restaurants,
  neighborhoods,
  cuisines;
var map;
var markers = [];


/**
 * Register Service Worker once the page has loaded.
 */
window.addEventListener('load', () => {
  registerSW();
  createAndUpdateDB(); 
  
  window.addEventListener('online', checkUpdateReviewDb());
  document.getElementById('static-map').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('static-map').style.display = 'none';
    document.getElementById('map').style.display = "block";  
    addMarkersToMap();
  });
  mapHandling();
});


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
  updateRestaurants();
});

window.onload = () => {
  lazy();
}



/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  /*updateRestaurants();*/
  
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
      lazy();
      favHandling();
    }
  })

  
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const imgCont = document.createElement('div');
  li.append(imgCont);


  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  image.alt = `Image of ${restaurant.name}`;
  image.height = "600";
  image.width = "800";
  image.id = restaurant.photograph;
  image.setAttribute("data-src", DBHelper.imageUrlForRestaurant(restaurant.photograph));
  image.setAttribute("data-srcset", `${DBHelper.imageUrlForRestaurant(restaurant.photograph)} 2x, ${DBHelper.rszImageUrlForRestaurant(restaurant.rszPhotograph)} 1x`);
  imgCont.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.setAttribute("style", "width: 100%");
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.className = 'mdl-button mdl-js-button mdl-button--raised mdl-button--colored btn';
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', `${restaurant.name}: view details`);
  more.setAttribute('role','button');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  const fav = document.createElement('a');
  const favImg = document.createElement('img');
  fav.className = 'star btn';
  fav.setAttribute('style', 'background-color: #FFC107; margin-left: 1em;')
  favImg.alt = "Favourite restaurant star";
  favImg.height = "30";
  favImg.length = "30";
  if(restaurant.is_favorite == "true"){
    favImg.setAttribute("src", "img/star_checked.svg");
    fav.setAttribute('arial-label', `${restaurant.name} is your favourite restaurant`);
    favImg.classList.add('checked');
  } else{
    favImg.setAttribute("src", "img/star_unchecked.svg");
    fav.setAttribute('arial-label', `Make ${restaurant.name} your favourite restaurant`);
    favImg.classList.add('unchecked');
  }
  fav.id = `star_${restaurant.id}`
  favImg.id = `fav_${restaurant.id}`;
  favImg.classList.add('fav');
  fav.append(favImg);
  fav.setAttribute('role', 'button');
  li.append(fav);


  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

/** 
  *Service worker
  **/
registerSW = () => {
  if(!navigator.serviceWorker) return;

  navigator.serviceWorker.register('/sw.js').then((registration) =>{
    console.log('Registration worked! Scope: ', registration.scope);
  }).catch(() =>{
    console.log('Registration failed.');
  })
}


//lazy-loading images
var io = new IntersectionObserver(
  (entries, observer) => {
    /*var ratio = entries[0].intersectionRatio;
    console.log(entries);
    if(ratio > 0){
      var id = entries[0].target.id;
      var el = document.getElementById(id);
      el.src = DBHelper.imageUrlForRestaurant(id);
      el.srcset = `${DBHelper.imageUrlForRestaurant(id)} 2x, ${DBHelper.rszImageUrlForRestaurant(id)} 1x`;

    }*/
    entries.forEach((entry) => {
      if (entry.isIntersecting){
        let lazyImage = entry.target;
        lazyImage.src = lazyImage.dataset.src;
        lazyImage.srcset = lazyImage.dataset.srcset;
        lazyImage.classList.remove("lazy");
        io.unobserve(lazyImage);
      }
    })
  },
  {
    
  }
);

// Start observing an element
lazy = () => {
  var elements = document.querySelectorAll('img.restaurant-img');
  for(var i=0; i < elements.length; i++){
    io.observe(elements[i]);
  }
}


//Handling favourites
favHandling = () => {
  console.log('calling fav handling');
  const favElements = document.querySelectorAll(".star");
  console.log(favElements)
  favElements.forEach(element => {
    element.addEventListener('click', () => {
      console.log(`click on ${element.id}`)
      star_id = element.id.split('_')[1]; 
      const checked = document.querySelectorAll('.checked');
      if(checked.length > 0){
        if(document.getElementById(`fav_${star_id}`).classList.contains('checked')){
          document.getElementById(`fav_${star_id}`).setAttribute('src', 'img/star_unchecked.svg');
          const init = {
            method: 'PUT'
          }
          fetch(`http://localhost:1337/restaurants/${star_id}/?is_favorite=false`, init)
          .then(response => response.json())
          .catch(error => console.log('Error: ', error))
          .then(response => {
            console.log('Response: ', response);
            document.getElementById(`fav_${star_id}`).classList.remove('checked');
            document.getElementById(`fav_${star_id}`).classList.add('unchecked');
            createAndUpdateDB();
          });
        } else{
          return
        }
        
      } else{
        document.getElementById(`fav_${star_id}`).setAttribute('src', 'img/star_checked.svg');
        const init = {
          method: 'PUT'
        }
        fetch(`http://localhost:1337/restaurants/${star_id}/?is_favorite=true`, init)
        .then(response => response.json())
        .catch(error => console.log('Error: ', error))
        .then(response => {
          console.log('Response: ', response);
          document.getElementById(`fav_${star_id}`).classList.remove('unchecked');
          document.getElementById(`fav_${star_id}`).classList.add('checked');
          createAndUpdateDB();
        });
      }
    });
      
  })
}



mapHandling = () => {
  var script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB_52Dw7snZfKe0Yo1Ao2g2_jubYbPT3F4&libraries=places&callback=initMap';
  document.body.appendChild(script);
}




