// scripts.js
function displayReviews(name) {
    fetch(`/api/reviews?name=${encodeURIComponent(name)}`, {
        method: 'GET',
        credentials: 'same-origin' // Include session cookies if needed
    })
    .then(response => response.json())
    .then(reviews => {
        const reviewsContainer = document.getElementById('reviewsContainer');

        reviewsContainer.innerHTML = ''; // Clear previous reviews

        reviews.forEach(review => {
            const reviewElement = document.createElement('div');
            reviewElement.classList.add('review');
            reviewElement.innerHTML = `
                <p>Email: ${review.Email}</p>
                <p><strong>${review.name}</strong></p>
                <p>Review: ${review.review}</p>
                <p>Rating: ${review.rating}</p>
                <p>Quantity: ${review.quantity}</p>
                <p>Created At: ${review.created_at}</p>
                <hr>
            `;
            reviewsContainer.appendChild(reviewElement);
        });
    })
    .catch(error => console.error('Error fetching reviews:', error));
}

function redirectToReviews(name) {
    // Redirect to the /reviews page with the name parameter
    window.location.href = `/reviews?name=${encodeURIComponent(name)}`;
}
