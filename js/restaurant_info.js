let restaurant;
var map;


/**
 * Register Service Worker once the page has loaded.
 */
window.addEventListener('load', () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else{
      fillBreadcrumb();
      document.getElementById('static-map').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('static-map').style.display = 'none';
        document.getElementById('map').style.display = "block";  
      });
      mapHandling();
    }
  });
  registerSW();
  formSubmit();
  
  /*if(navigator.onLine){
    checkUpdateReviewDb();
  }*/
});



/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  /*fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {*/
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: self.restaurant.latlng,
        scrollwheel: false
      });
      //fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);      
    /*}
  });*/
  
}


/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant);
      
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.alt = restaurant.name;
  image.height = "600";
  image.width = "800";
  image.src = DBHelper.imageUrlForRestaurant(restaurant.photograph);
  image.srcset = `${DBHelper.imageUrlForRestaurant(restaurant.photograph)} 2x, ${DBHelper.rszImageUrlForRestaurant(restaurant.rszPhotograph)} 1x`;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (/*reviews = self.restaurant.reviews*/) => {
  const container = document.getElementById('reviews-view');
  const title = document.createElement('h3');
  //title.innerHTML = 'Reviews';
  //container.appendChild(title);

  fetch(`http://localhost:1337/reviews/?restaurant_id=${self.restaurant.id}`)
  .then(response => response.json())
  .catch(error => console.error('Error:', error))
  .then(addReviews);

  function addReviews(data){
    var reviews = data;

    console.log(reviews);

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });

    getReviewsDB().then(DBreviews => {
      console.log(DBreviews);
      if(DBreviews.length > 0){
        DBreviews.forEach(DBreview =>  {
          ul.appendChild(createReviewHTML(DBreview))
        })

        container.appendChild(ul);
      }      
    })

    window.addEventListener('online', checkUpdateReviewDb());
    
  }

  
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  /*const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);*/

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute("aria-label", restaurant.name);
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Form submission
 */

formSubmit = () => {
  document.getElementById('review').onsubmit = function onSubmit(form){
    form.preventDefault();
    const name = document.getElementById('form-name').value;
    const rating = document.getElementById('form-rating').value;
    const comment = document.getElementById('form-comment').value;
    const id = self.restaurant.id;

    if(!name || !rating || !comment){
      alert("To submit the review you have to fill all the fields.");
      return
    }

    if(rating < 1 || rating > 5){
      alert('Rating must be a number between 1 and 5.');
      return
    }

    const data = {restaurant_id: id, name: name, rating: rating, comments: comment}

    const init = {
      method: 'POST', 
      body: JSON.stringify(data), 
      headers:{
      'Content-Type': 'application/json'
      }
    }

    fetch('http://localhost:1337/reviews/', init)
    .then(response => response.json())
    .catch(error => {
      console.error('Error:', error);
      const randId = Math.floor((Math.random() * 1000) + 1);
      const rev = {restaurant_id: id, name: name, rating: rating, comments: comment, tempId: randId}
      addReviewDB(rev);

      document.getElementById('review').reset();

      var snackbar = document.getElementById("snackbar");

      // Add the "show" class to DIV
      snackbar.className = "show";

      snackbar.innerHTML = "You're offline! Your review will be stored and submitted as soon as you get back online."

      // After 3 seconds, remove the show class from DIV
      setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 6000);
    })
    .then(response => {
      if(response){
        console.log('Success:', response);

        document.getElementById('review').reset();
        
        var snackbar = document.getElementById("snackbar");

        // Add the "show" class to DIV
        snackbar.className = "show";

        snackbar.innerHTML = "Review submitted!"


        // After 3 seconds, remove the show class from DIV
        setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 4000);
      }
      
    });
  }
  
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

mapHandling = () => {
  console.log(self.restaurants);
  var script = document.createElement('script');
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB_52Dw7snZfKe0Yo1Ao2g2_jubYbPT3F4&libraries=places&callback=initMap';
  document.body.appendChild(script);

  document.getElementById('media-700').srcset = `https://maps.googleapis.com/maps/api/staticmap?center=${self.restaurant.latlng.lat}+${self.restaurant.latlng.lng}&zoom=17&scale=1&size=400x300&maptype=roadmap&key=AIzaSyBFTWeDdo3z6cIatfPcxwkeNN75VZxaKmY&format=png&visual_refresh=true&markers=size:mid%7Ccolor:0xff0000%7Clabel:%7C${self.restaurant.latlng.lat}+${self.restaurant.latlng.lng}` ;
  document.getElementById('media-701').srcset = `https://maps.googleapis.com/maps/api/staticmap?center=${self.restaurant.latlng.lat}+${self.restaurant.latlng.lng}&zoom=17&scale=1&size=600x200&maptype=roadmap&key=AIzaSyBFTWeDdo3z6cIatfPcxwkeNN75VZxaKmY&format=png&visual_refresh=true&markers=size:mid%7Ccolor:0xff0000%7Clabel:%7C${self.restaurant.latlng.lat}+${self.restaurant.latlng.lng}`
  document.getElementById('img-static').src = `https://maps.googleapis.com/maps/api/staticmap?center=${self.restaurant.latlng.lat}+${self.restaurant.latlng.lng}&zoom=17&scale=1&size=600x200&maptype=roadmap&key=AIzaSyBFTWeDdo3z6cIatfPcxwkeNN75VZxaKmY&format=png&visual_refresh=true&markers=size:mid%7Ccolor:0xff0000%7Clabel:%7C${self.restaurant.latlng.lat}+${self.restaurant.latlng.lng}`;

}