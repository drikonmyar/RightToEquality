// Get elements
const form = document.getElementById("sentimentForm");
const submissionCount = document.getElementById("submissionCount");

// Load stored count from localStorage or start at 0
let count = localStorage.getItem("submissionCount") ? parseInt(localStorage.getItem("submissionCount")) : 0;
submissionCount.textContent = `Total Users Submitted: ${count}`;

// Form submit event listener
form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent actual form submission

    count++; // Increase count
    localStorage.setItem("submissionCount", count); // Save to localStorage
    submissionCount.textContent = `Total Users Submitted: ${count}`; // Update display

    // Reset form after submission
    form.reset();
});